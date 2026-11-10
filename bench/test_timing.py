"""用假 Claude 检查计时、隔离参数、输出目录和核验参数透传。"""

import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent


class TimingIntegrationTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="运行 [v1] 空格 ")
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        fake_bin = self.base / "bin"
        fake_bin.mkdir()
        fake = fake_bin / "claude"
        # 把期望 HOME 写进假进程，避免给被隔离进程增加测试环境变量。
        fake.write_text("#!" + sys.executable + "\nEXPECTED_HOME = " + repr(os.environ["HOME"]) + "\n" + r'''
import json, os, pathlib, sys, time
args = sys.argv[1:]
assert os.environ["HOME"] == EXPECTED_HOME
assert os.environ["CLAUDE_CODE_DISABLE_CLAUDE_MDS"] == "1"
assert os.environ["CLAUDE_CODE_DISABLE_BUNDLED_SKILLS"] == "1"
assert "BENCH_TEST_LEAK" not in os.environ
assert "ANTHROPIC_MODEL" not in os.environ
assert "--strict-mcp-config" in args
assert json.loads(args[args.index("--mcp-config") + 1]) == {"mcpServers": {}}
assert args[args.index("--permission-mode") + 1] == "bypassPermissions"
assert args[args.index("--output-format") + 1] == "json"
assert args[args.index("--model") + 1] == "test-model"
prompt = args[args.index("-p") + 1]
assert args[args.index("--effort") + 1] == ("max" if "深度max" in prompt else "high")
base = pathlib.Path.cwd()
cfg = pathlib.Path(os.environ["CLAUDE_CONFIG_DIR"])
assert cfg.is_absolute() and cfg.parent == base and cfg.name.startswith("cfg-")
assert not (cfg / "projects").exists()
records = [{"type": "attachment", "sessionId": "session-1", "attachment": {
    "type": "skill_listing", "content": "- plugin-authoring: 内置"}}]
if "技能组" in prompt:
    plugin = pathlib.Path(args[args.index("--plugin-dir") + 1])
    assert plugin == base / "plugin"
    manifest = json.loads((plugin / ".claude-plugin/plugin.json").read_text())
    assert manifest["name"] == "frontend-design"
    assert [p.name for p in (plugin / "skills").iterdir()] == ["frontend-design"]
    assert "name: frontend-design" in (plugin / "skills/frontend-design/SKILL.md").read_text()
    records[0]["attachment"]["content"] += "\n- frontend-design:frontend-design: 被测"
    records += [
        {"type": "assistant", "sessionId": "session-1", "message": {"content": [
            {"type": "tool_use", "id": "skill-1", "name": "Skill",
             "input": {"skill": "frontend-design:frontend-design"}}]}},
        {"type": "user", "sessionId": "session-1", "message": {"content": [
            {"type": "tool_result", "tool_use_id": "skill-1",
             "content": "Launching skill: frontend-design:frontend-design"}]}}
    ]
else:
    assert "--plugin-dir" not in args and not (base / "plugin").exists()
records += [{"type": "user", "sessionId": "session-1", "isSidechain": False} for _ in range(3)]
path = cfg / "projects/fake/session-1.jsonl"
path.parent.mkdir(parents=True)
path.write_text("".join(json.dumps(record) + "\n" for record in records), encoding="utf-8")
# 无关会话不能进入轮次汇总或提供技能证据。
path.with_name("other-session.jsonl").write_text(json.dumps({
    "type": "user", "sessionId": "other-session"}) + "\n")
if "不生成页面" not in prompt:
    (base / "index.html").write_text("<html>测试</html>", encoding="utf-8")
if "多页" in prompt:
    (base / "文章 详情.html").write_text("<html>详情</html>", encoding="utf-8")
models = {"test-model": {}}
if "辅助模型" in prompt:
    models.update({"helper-a": {}, "helper-b": {}})
time.sleep(3.2 if "计时" in prompt else 0.1)
print(json.dumps({"subtype": "success", "is_error": False, "duration_ms": 1,
    "num_turns": 1, "session_id": "session-1", "result_index": 1, "modelUsage": models}))
''', encoding="utf-8")
        fake.chmod(0o755)
        self.prompt = self.base / "提示词 文件.md"
        self.prompt.write_text("对照组", encoding="utf-8")
        self.output = self.base / "输出 [v1]"
        self.env = os.environ.copy()
        self.env.update(PATH=str(fake_bin) + os.pathsep + self.env["PATH"],
                        ANTHROPIC_BASE_URL="http://example.invalid", ANTHROPIC_AUTH_TOKEN="test",
                        BENCH_TEST_LEAK="不应透传", ANTHROPIC_MODEL="不应透传")
        self.skill_dir = self.base / "技能 目录"
        self.skill_dir.mkdir()
        (self.skill_dir / "SKILL.md").write_text("---\nname: frontend-design\n---\n测试技能", encoding="utf-8")

    def command(self, *extra, output=None):
        return ["/bin/bash", str(ROOT / "bench/run.sh"), "--prompt", str(self.prompt),
                "--model", "test-model", "--out", str(output if output is not None else self.output),
                *extra]

    def run_bench(self, *extra, output=None):
        return subprocess.run(self.command(*extra, output=output), env=self.env, text=True, capture_output=True)

    def assert_passes(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_run_measures_process_instead_of_model_report(self):
        self.prompt.write_text("对照组 计时", encoding="utf-8")
        result = self.run_bench()
        self.assert_passes(result)
        elapsed = int((self.output / "elapsed_ms").read_text())
        self.assertGreaterEqual(elapsed, 3000)
        self.assertLess(elapsed, 10000)
        self.assertEqual(json.loads((self.output / "result.json").read_text())["duration_ms"], 1)
        self.assertIn("轮次：3，耗时：0.1 min", result.stdout)
        meta = (self.output / "run.meta").read_text()
        self.assertIn("turns=3", meta)
        self.assertIn("duration_min=0.1", meta)

    def test_skill_group_isolated_environment_and_single_plugin(self):
        self.prompt.write_text("技能组", encoding="utf-8")
        result = self.run_bench("--skill", "frontend-design", "--skill-dir", str(self.skill_dir))
        self.assert_passes(result)
        self.assertIn("技能调用：frontend-design:frontend-design", result.stdout)
        self.assertIn("skill=frontend-design", (self.output / "run.meta").read_text())

    def test_rejects_existing_empty_or_nonempty_output(self):
        self.output.mkdir()
        for nonempty in (False, True):
            with self.subTest(nonempty=nonempty):
                if nonempty:
                    (self.output / "index.html").write_text("旧页面", encoding="utf-8")
                    (self.output / "run.meta").write_text("旧指标", encoding="utf-8")
                before = {p.name: p.read_bytes() for p in self.output.iterdir()}
                result = self.run_bench()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("必须是新目录", result.stderr)
                self.assertEqual(before, {p.name: p.read_bytes() for p in self.output.iterdir()})

    def test_concurrent_runs_cannot_share_output(self):
        args = self.command()
        processes = [subprocess.Popen(args, env=self.env, text=True, stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE) for _ in range(2)]
        results = [p.communicate(timeout=15) for p in processes]
        self.assertEqual(sorted(p.returncode for p in processes), [0, 1], results)
        self.assertEqual(len(list(self.output.glob("cfg-*"))), 1)
        self.assertTrue((self.output / "run.meta").is_file())

    def test_parallel_runs_use_distinct_configs(self):
        outputs = [self.base / f"并发组 {i}" for i in range(3)]
        processes = [subprocess.Popen(self.command(output=output), env=self.env, text=True,
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE) for output in outputs]
        results = [p.communicate(timeout=15) for p in processes]
        self.assertEqual([p.returncode for p in processes], [0, 0, 0], results)
        configs = [dict(l.split("=", 1) for l in (out / "run.meta").read_text().splitlines())["config_dir"]
                   for out in outputs]
        self.assertEqual(len(set(configs)), 3)

    def test_rejects_repo_dotdot_and_symlink_paths_before_writing(self):
        alias = self.base / "仓库链接"
        alias.symlink_to(ROOT, target_is_directory=True)
        child = "must-not-create-" + self.base.name
        paths = [ROOT, ROOT.parent / ".." / ROOT.parent.name / ROOT.name,
                 alias / child, ROOT / child]
        for output in paths:
            with self.subTest(output=str(output)):
                result = self.run_bench(output=output)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("必须位于仓库之外", result.stderr)
                self.assertFalse((ROOT / child).exists())

    def test_accepts_external_symlink_and_dotdot_path(self):
        physical = self.base / "真实父目录"
        physical.mkdir()
        alias = self.base / "父目录链接"
        alias.symlink_to(physical, target_is_directory=True)
        result = self.run_bench(output=alias / "未创建的父目录" / ".." / "新运行")
        self.assert_passes(result)
        self.assertFalse((physical / "未创建的父目录").exists())
        fields = dict(l.split("=", 1) for l in (physical / "新运行/run.meta").read_text().splitlines())
        self.assertEqual(Path(fields["config_dir"]).parent, (physical / "新运行").resolve())

    def test_passes_repeated_extra_models_and_required_files(self):
        self.prompt.write_text("对照组 辅助模型 多页", encoding="utf-8")
        result = self.run_bench("--allow-extra-model", "helper-a", "--allow-extra-model", "helper-b",
                                "--require-file", "文章 详情.html", "--require-file", "index.html")
        self.assert_passes(result)

    def test_custom_effort_is_forwarded_to_process_and_meta(self):
        self.prompt.write_text("对照组 深度max", encoding="utf-8")
        self.assert_passes(self.run_bench("--effort", "max"))
        self.assertIn("effort=max\n", (self.output / "run.meta").read_text())

    def test_tmp_alias_is_resolved_in_meta(self):
        with tempfile.TemporaryDirectory(dir="/tmp") as tmp:
            output = Path(tmp) / "新运行"
            self.assert_passes(self.run_bench(output=output))
            fields = dict(l.split("=", 1) for l in (output / "run.meta").read_text().splitlines())
            self.assertEqual(Path(fields["config_dir"]).parent, output.resolve())

    def test_missing_index_or_extra_page_cannot_write_meta(self):
        self.prompt.write_text("对照组 不生成页面", encoding="utf-8")
        result = self.run_bench()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("没有生成页面文件", result.stderr)
        self.assertFalse((self.output / "run.meta").exists())
        self.prompt.write_text("对照组", encoding="utf-8")
        second = self.base / "另一次运行"
        result = self.run_bench("--require-file", "article.html", output=second)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("article.html", result.stderr)
        self.assertFalse((second / "run.meta").exists())

    def test_unapproved_extra_model_fails_end_to_end(self):
        self.prompt.write_text("对照组 辅助模型", encoding="utf-8")
        result = self.run_bench()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("实际模型与指定模型不一致", result.stderr)
        self.assertFalse((self.output / "run.meta").exists())

    def test_missing_option_value_is_reported(self):
        result = self.run_bench("--allow-extra-model")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("缺少值", result.stderr)
        self.assertFalse(self.output.exists())

    def test_timed_process_failure_retains_exit_code(self):
        elapsed = self.base / "失败耗时"
        result = subprocess.run([sys.executable, str(ROOT / "bench/timed_run.py"), str(elapsed),
                                 sys.executable, "-c", "raise SystemExit(7)"])
        self.assertEqual(result.returncode, 7)
        self.assertGreaterEqual(int(elapsed.read_text()), 0)

    def test_legacy_result_does_not_present_reported_time_as_elapsed(self):
        cfg = self.base / "旧配置"
        log = cfg / "projects/fake/legacy-session.jsonl"
        log.parent.mkdir(parents=True)
        log.write_text(json.dumps({"type": "attachment", "sessionId": "legacy-session",
            "attachment": {"type": "skill_listing", "content": "- plugin-authoring: test"}}) + "\n")
        result_path = self.base / "result.json"
        result_path.write_text(json.dumps({"subtype": "success", "is_error": False,
            "session_id": "legacy-session", "duration_ms": 120000, "num_turns": 1,
            "modelUsage": {"test-model": {}}}))
        (self.base / "index.html").write_text("<html>旧样本</html>", encoding="utf-8")
        args = [sys.executable, str(ROOT / "bench/verify_run.py"), "--cfg", str(cfg), "--skill", "none",
                "--model", "test-model", "--result", str(result_path)]
        result = subprocess.run(args, text=True, capture_output=True)
        self.assert_passes(result)
        self.assertIn("耗时：未知", result.stdout)
        self.assertNotIn("耗时：2.0 min", result.stdout)
        (self.base / "elapsed_ms").write_text("invalid")
        invalid = subprocess.run(args, text=True, capture_output=True)
        self.assertNotEqual(invalid.returncode, 0)
        self.assertIn("实际耗时文件无效", invalid.stderr)
        self.assertNotIn("隔离核验通过", invalid.stdout)


if __name__ == "__main__":
    unittest.main()
