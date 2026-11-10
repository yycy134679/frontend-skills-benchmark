"""隔离核验的失败样本和历史格式兼容测试，全部使用临时目录。"""

import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


VERIFY = Path(__file__).with_name("verify_run.py")


def listing(content, session="main-session"):
    return {"type": "attachment", "sessionId": session,
            "attachment": {"type": "skill_listing", "content": content}}


def invocation(skill, call_id="call-1", error=None):
    call = {"type": "assistant", "sessionId": "main-session", "message": {"content": [
        {"type": "tool_use", "id": call_id, "name": "Skill", "input": {"skill": skill}}
    ]}}
    result = {"type": "user", "sessionId": "main-session", "message": {"content": [
        {"type": "tool_result", "tool_use_id": call_id, "content": f"Launching skill: {skill}"}
    ]}}
    if error is not None:
        result["message"]["content"][0]["is_error"] = error
    return [call, result]


class VerifyRunTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="核验 [v1] 空格 ")
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.cfg = self.base / "cfg [v1]"
        self.log = self.cfg / "projects" / "project" / "main-session.jsonl"
        self.log.parent.mkdir(parents=True)
        self.records = [listing("- plugin-authoring: 内置\n- frontend-design:frontend-design: 被测")]
        self.records += invocation("frontend-design:frontend-design")
        self.data = {"subtype": "success", "is_error": False, "session_id": "main-session",
                     "modelUsage": {"test-model": {}}, "num_turns": 1}
        self.page = self.base / "index.html"
        self.page.write_text("<html>成品</html>", encoding="utf-8")
        (self.base / "elapsed_ms").write_text("6000\n", encoding="utf-8")
        self.meta = self.base / "run.meta"

    def verify(self, *extra, skill="frontend-design", write_meta=True):
        self.log.write_text("".join(
            (record if isinstance(record, str) else json.dumps(record, ensure_ascii=False)) + "\n"
            for record in self.records), encoding="utf-8")
        result = self.base / "result.json"
        result.write_text("模型警告\n" + json.dumps(self.data) + "\n", encoding="utf-8")
        args = [sys.executable, str(VERIFY), "--cfg", str(self.cfg), "--skill", skill,
                "--model", "test-model", "--result", str(result)]
        if write_meta:
            args += ["--meta", str(self.meta), "--effort", "max"]
        return subprocess.run(args + list(extra), text=True, capture_output=True)

    def assert_passes(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("隔离核验通过", result.stdout)

    def assert_rejected(self, result, message):
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(message, result.stderr)
        self.assertNotIn("隔离核验通过", result.stdout)
        self.assertFalse(self.meta.exists())

    def test_rejects_extra_model(self):
        self.data["modelUsage"]["fallback-model"] = {}
        self.assert_rejected(self.verify(), "实际模型与指定模型不一致")

    def test_allows_only_explicit_extra_models(self):
        self.data["modelUsage"].update({"helper-a": {}, "helper-b": {}})
        self.assert_passes(self.verify("--allow-extra-model", "helper-a", "--allow-extra-model", "helper-b"))

    def test_allowance_does_not_require_helper_or_replace_primary(self):
        self.assert_passes(self.verify("--allow-extra-model", "helper-a", write_meta=False))
        self.data["modelUsage"] = {"helper-a": {}}
        self.assert_rejected(self.verify("--allow-extra-model", "helper-a"), "实际模型与指定模型不一致")

    def test_rejects_early_unexpected_listing(self):
        self.records.insert(0, listing("- personal-skill: 泄漏"))
        self.assert_rejected(self.verify(), "personal-skill")

    def test_rejects_unrecognized_listing(self):
        for content in ("新格式 personal-skill", "- personal-skill", None):
            with self.subTest(content=content):
                self.records[0] = listing(content)
                self.assert_rejected(self.verify(), "技能清单格式无法识别")

    def test_rejects_missing_listing_and_missing_target_in_listing(self):
        self.records = invocation("frontend-design")
        self.assert_rejected(self.verify(), "没有技能清单")
        self.records.insert(0, listing("- plugin-authoring: 内置"))
        self.assert_rejected(self.verify(), "技能清单缺少被测技能")

    def test_rejects_unexpected_skill_call(self):
        self.records += invocation("personal-skill", "call-2")
        self.assert_rejected(self.verify(), "调用了不该调用的技能")

    def test_rejects_wrong_plugin_namespace_in_listing(self):
        self.records[0] = listing("- other-plugin:frontend-design: 同名技能")
        self.assert_rejected(self.verify(), "不该出现的技能")

    def test_rejects_wrong_plugin_namespace_in_call(self):
        self.records = self.records[:1] + invocation("other-plugin:frontend-design")
        self.assert_rejected(self.verify(), "调用了不该调用的技能")

    def test_control_rejects_any_skill_call(self):
        for skill in ("frontend-design", "plugin-authoring"):
            with self.subTest(skill=skill):
                self.records = [listing("- plugin-authoring: 内置")] + invocation(skill)
                self.assert_rejected(self.verify(skill="none"), "对照组调用了技能")

    def test_plugin_authoring_allowed_alongside_target(self):
        self.records += invocation("plugin-authoring", "call-2")
        self.assert_passes(self.verify())

    def test_plugin_authoring_cannot_replace_target(self):
        self.records = self.records[:1] + invocation("plugin-authoring")
        self.assert_rejected(self.verify(), "没有被成功调用")

    def test_rejects_failed_target_even_if_another_call_succeeds(self):
        self.records += invocation("frontend-design", "call-2", error=True)
        self.assert_rejected(self.verify(), "技能调用失败")

    def test_rejects_unconfirmed_target_call(self):
        cases = ["缺少返回", "普通文本返回", "缺少调用ID"]
        original = copy.deepcopy(self.records)
        for case in cases:
            with self.subTest(case=case):
                self.records = copy.deepcopy(original)
                if case == "缺少返回":
                    self.records.pop()
                elif case == "普通文本返回":
                    self.records[-1]["message"]["content"][0]["content"] = "Unknown skill"
                else:
                    self.records[1]["message"]["content"][0].pop("id")
                self.assert_rejected(self.verify(), "技能")

    def test_accepts_bare_name_and_duplicate_successful_call(self):
        self.records = self.records[:1] + invocation("frontend-design")
        self.records.append(copy.deepcopy(self.records[1]))
        self.assert_passes(self.verify())
        self.assertIn("技能调用：frontend-design\n", self.verify(write_meta=False).stdout)

    def test_rejects_missing_or_empty_index(self):
        self.page.unlink()
        self.assert_rejected(self.verify(), "没有生成页面文件")
        self.page.write_text("", encoding="utf-8")
        self.assert_rejected(self.verify(), "页面文件为空")

    def test_requires_additional_files(self):
        self.assert_rejected(self.verify("--require-file", "文章 详情.html"), "没有生成页面文件")
        detail = self.base / "文章 详情.html"
        detail.write_text("", encoding="utf-8")
        self.assert_rejected(self.verify("--require-file", detail.name), "页面文件为空")
        detail.write_text("<html>详情</html>", encoding="utf-8")
        self.assert_passes(self.verify("--require-file", detail.name))

    def test_rejects_required_file_outside_output(self):
        self.assert_rejected(self.verify("--require-file", "../index.html"), "必须位于结果目录内")

    def test_rejects_error_or_incomplete_results(self):
        original = self.data.copy()
        for change in ({"is_error": True}, {"subtype": "error_max_turns"}, {"subtype": None},
                       {"is_error": None}):
            with self.subTest(change=change):
                self.data = {**original, **change}
                self.assert_rejected(self.verify(), "结果没有成功完成")

    def test_rejects_corrupt_jsonl_with_file_and_line(self):
        self.records.append('{"message": 损坏的证据}')
        result = self.verify()
        self.assert_rejected(result, "不是合法 JSON")
        self.assertIn(f"{self.log}:4", result.stderr)

    def test_rejects_non_object_log_record(self):
        self.records.append("[]")
        self.assert_rejected(self.verify(), "会话记录不是对象")

    def test_unrelated_session_cannot_supply_skill_call(self):
        other = self.log.with_name("other-session.jsonl")
        unrelated = copy.deepcopy(self.records)
        for record in unrelated:
            record["sessionId"] = "other-session"
        other.write_text("".join(json.dumps(r) + "\n" for r in unrelated), encoding="utf-8")
        self.records = self.records[:1]
        self.assert_rejected(self.verify(), "没有被成功调用")

    def test_rejects_missing_or_mismatched_session(self):
        self.data["session_id"] = "other-session"
        self.assert_rejected(self.verify(), "找不到唯一的主会话")
        self.data["session_id"] = None
        self.assert_rejected(self.verify(), "有效的 session_id")
        self.data["session_id"] = "main-session"
        self.records[0]["sessionId"] = "other-session"
        self.assert_rejected(self.verify(), "sessionId 不匹配")

    def subagent(self, records):
        path = self.log.with_suffix("") / "subagents" / "agent-child.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        for record in records:
            record.update(agentId="child", isSidechain=True)
        path.write_text("".join(json.dumps(r) + "\n" for r in records), encoding="utf-8")

    def test_checks_associated_subagent_listing_and_calls(self):
        self.subagent([listing("- personal-skill: 子代理泄漏")])
        self.assert_rejected(self.verify(), "不该出现的技能")
        self.subagent(invocation("personal-skill", "child-call"))
        self.assert_rejected(self.verify(), "调用了不该调用的技能")

    def test_accepts_successful_target_call_in_associated_subagent(self):
        self.subagent(self.records[1:])
        self.records = self.records[:1]
        self.assert_passes(self.verify())

    def test_other_agent_return_cannot_confirm_call(self):
        self.records.pop()
        self.subagent([invocation("frontend-design")[1]])
        self.assert_rejected(self.verify(), "缺少返回")

    def test_subagent_without_agent_id_cannot_confirm_main_call(self):
        self.records.pop()
        self.subagent([invocation("frontend-design")[1]])
        child = self.log.with_suffix("") / "subagents/agent-child.jsonl"
        record = json.loads(child.read_text())
        record.pop("agentId")
        child.write_text(json.dumps(record) + "\n", encoding="utf-8")
        self.assert_rejected(self.verify(), "缺少返回")

    def test_literal_cfg_path_with_brackets_spaces_and_chinese(self):
        self.assert_passes(self.verify())

    def test_meta_uses_verified_metrics_and_keeps_format(self):
        self.assert_passes(self.verify())
        lines = self.meta.read_text().splitlines()
        fields = dict(line.split("=", 1) for line in lines)
        self.assertEqual(list(fields), ["model", "skill", "effort", "turns", "duration_min", "date", "config_dir"])
        self.assertEqual(fields["duration_min"], "0.1")
        self.assertEqual(fields["turns"], "1")
        self.assertEqual(fields["effort"], "max")
        self.assertEqual(fields["config_dir"], str(self.cfg))
        self.assertRegex(fields["date"], r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$")
        self.assertTrue(self.meta.read_bytes().endswith(b"\n"))

    def test_legacy_without_elapsed_stays_read_only(self):
        (self.base / "elapsed_ms").unlink()
        self.data["duration_ms"] = 120000
        self.assert_passes(result := self.verify(write_meta=False))
        self.assertIn("耗时：未知", result.stdout)
        self.assertFalse(self.meta.exists())
        self.assert_rejected(self.verify(), "需要实际耗时文件")

    def test_counts_main_turns_not_subagent_or_other_session(self):
        self.data.update(result_index=1, num_turns=1)
        self.records += [{"type": "user", "sessionId": "main-session"}] * 2
        self.subagent([{"type": "user", "sessionId": "main-session"}] * 4)
        self.assert_passes(result := self.verify())
        self.assertIn("轮次：3，耗时：0.1 min", result.stdout)


if __name__ == "__main__":
    unittest.main()
