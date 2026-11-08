import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent


class TimingIntegrationTest(unittest.TestCase):
    def test_run_measures_process_instead_of_model_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            fake_bin = base / 'bin'
            fake_bin.mkdir()
            fake_claude = fake_bin / 'claude'
            fake_claude.write_text('''#!/usr/bin/python3
import json, os, pathlib, time
path = pathlib.Path(os.environ['CLAUDE_CONFIG_DIR']) / 'projects' / 'fake' / 'session.jsonl'
path.parent.mkdir(parents=True)
records = [{'attachment': {'type': 'skill_listing', 'content': '- plugin-authoring: test'}}]
records += [{'type': 'user', 'sessionId': 'session-1', 'isSidechain': False} for _ in range(3)]
records += [{'type': 'user', 'sessionId': 'other-session', 'isSidechain': False}]
path.write_text(''.join(json.dumps(record) + '\\n' for record in records))
time.sleep(3.2)
print(json.dumps({'duration_ms': 1, 'num_turns': 1, 'session_id': 'session-1', 'result_index': 1, 'modelUsage': {'test-model': {}}}))
''', encoding='utf-8')
            fake_claude.chmod(0o755)
            prompt = base / 'prompt.md'
            prompt.write_text('测试', encoding='utf-8')
            output = base / 'out'
            env = os.environ.copy()
            env.update(PATH=str(fake_bin) + os.pathsep + env['PATH'], ANTHROPIC_BASE_URL='http://example.invalid', ANTHROPIC_AUTH_TOKEN='test')
            result = subprocess.run(['bash', str(ROOT / 'bench/run.sh'), '--prompt', str(prompt), '--model', 'test-model', '--out', str(output)], env=env, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            elapsed = int((output / 'elapsed_ms').read_text())
            self.assertGreaterEqual(elapsed, 3000)
            self.assertLess(elapsed, 10000)
            self.assertEqual(json.loads((output / 'result.json').read_text())['duration_ms'], 1)
            self.assertIn('轮次：3，耗时：0.1 min', result.stdout)
            meta = (output / 'run.meta').read_text()
            self.assertIn('turns=3', meta)
            self.assertIn('duration_min=0.1', meta)

    def test_timed_process_failure_retains_exit_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            elapsed = Path(tmp) / 'elapsed_ms'
            result = subprocess.run(['python3', str(ROOT / 'bench/timed_run.py'), str(elapsed), 'python3', '-c', 'raise SystemExit(7)'])
            self.assertEqual(result.returncode, 7)
            self.assertGreaterEqual(int(elapsed.read_text()), 0)

    def test_legacy_result_does_not_present_reported_time_as_elapsed(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            cfg = base / 'cfg' / 'projects' / 'fake'
            cfg.mkdir(parents=True)
            (cfg / 'session.jsonl').write_text(json.dumps({'attachment': {'type': 'skill_listing', 'content': '- plugin-authoring: test'}}) + '\n', encoding='utf-8')
            result_path = base / 'result.json'
            result_path.write_text(json.dumps({'duration_ms': 120000, 'num_turns': 1, 'modelUsage': {'test-model': {}}}), encoding='utf-8')
            result = subprocess.run(['python3', str(ROOT / 'bench/verify_run.py'), '--cfg', str(base / 'cfg'), '--skill', 'none', '--model', 'test-model', '--result', str(result_path)], text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('耗时：未知', result.stdout)
            self.assertNotIn('耗时：2.0 min', result.stdout)
            (base / 'elapsed_ms').write_text('invalid', encoding='utf-8')
            invalid = subprocess.run(['python3', str(ROOT / 'bench/verify_run.py'), '--cfg', str(base / 'cfg'), '--skill', 'none', '--model', 'test-model', '--result', str(result_path)], text=True, capture_output=True)
            self.assertNotEqual(invalid.returncode, 0)
            self.assertIn('实际耗时文件无效', invalid.stderr)
            self.assertNotIn('隔离核验通过', invalid.stdout)


if __name__ == '__main__':
    unittest.main()
