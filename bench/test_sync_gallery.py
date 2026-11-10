"""画廊同步的字节一致性、只读检查和重复执行测试。"""

import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sync_gallery


class SyncGalleryTest(unittest.TestCase):
    def test_checked_in_design_is_exact_generated_bytes(self):
        root = sync_gallery.ROOT
        expected = sync_gallery.design_page((root / "index.html").read_text(encoding="utf-8"))
        self.assertEqual((root / "gallery-prototype/design-demos/dir-1.html").read_bytes(),
                         expected.encode("utf-8"))

    def test_only_resource_paths_change(self):
        source = ('<img src="assets/a.jpg"><a href="examples/a.html">案例</a>'
                  '<a href="评分规则.html">规则</a><a href="https://example.org/assets/a">外链</a>'
                  '<script>const path = `${root}examples/${caseDir}`;</script>\n')
        expected = source.replace('="assets/', '="../../assets/').replace(
            '="examples/', '="../../examples/').replace('="评分规则.html"', '="../../评分规则.html"')
        self.assertEqual(sync_gallery.design_page(source).encode(), expected.encode())

    def test_check_is_read_only_and_generation_is_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "index.html"
            source.write_text('<a href="评分规则.html">中文</a>\n', encoding="utf-8")
            target = root / "gallery-prototype/design-demos/dir-1.html"
            target.parent.mkdir(parents=True)
            target.write_bytes(b"stale")
            with patch.object(sync_gallery, "ROOT", root), contextlib.redirect_stdout(io.StringIO()), \
                    contextlib.redirect_stderr(io.StringIO()):
                with patch.object(sys, "argv", ["sync_gallery.py", "--check"]):
                    self.assertEqual(sync_gallery.main(), 1)
                    self.assertEqual(target.read_bytes(), b"stale")
                with patch.object(sys, "argv", ["sync_gallery.py"]):
                    self.assertEqual(sync_gallery.main(), 0)
                    before = target.stat().st_mtime_ns
                    expected = sync_gallery.design_page(source.read_text()).encode()
                    self.assertEqual(target.read_bytes(), expected)
                    self.assertEqual(sync_gallery.main(), 0)
                    self.assertEqual(target.stat().st_mtime_ns, before)
                with patch.object(sys, "argv", ["sync_gallery.py", "--check"]):
                    self.assertEqual(sync_gallery.main(), 0)

    def test_check_does_not_create_missing_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "index.html").write_text("首页", encoding="utf-8")
            with patch.object(sync_gallery, "ROOT", root), \
                    patch.object(sys, "argv", ["sync_gallery.py", "--check"]), \
                    contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(sync_gallery.main(), 1)
            self.assertEqual([p.name for p in root.iterdir()], ["index.html"])

    def test_gallery_launcher_follows_checkout_directory(self):
        config = json.loads((sync_gallery.ROOT / ".claude/launch.json").read_text(encoding="utf-8"))
        args = next(item["runtimeArgs"] for item in config["configurations"] if item["name"] == "gallery")
        directory = Path(args[args.index("-d") + 1])
        with tempfile.TemporaryDirectory() as tmp:
            checkout = Path(tmp).resolve()
            self.assertEqual((checkout / directory).resolve(), checkout)


if __name__ == "__main__":
    unittest.main()
