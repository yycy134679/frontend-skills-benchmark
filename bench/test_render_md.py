import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_md  # noqa: E402


class RenderMdTest(unittest.TestCase):
    def test_table(self):
        body, _, _ = render_md.parse("| 版本 | 评分 |\n| --- | --- |\n| 无技能 | ✓ |\n")
        self.assertIn('<th scope="col">版本</th>', body)
        self.assertIn('<th scope="row">无技能</th>', body)
        self.assertIn('<td class="mark-ok">✓</td>', body)

    def test_pipe_inside_code_stays_in_cell(self):
        body, _, _ = render_md.parse("| a | b |\n| - | - |\n| `x|y` | z |\n")
        self.assertIn("<code>x|y</code>", body)

    def test_html_in_inline_code_is_escaped(self):
        body, _, _ = render_md.parse("用 `<details>` 写了问答，<b>不应生效</b>")
        self.assertIn("<code>&lt;details&gt;</code>", body)
        self.assertIn("&lt;b&gt;", body)

    def test_md_links_become_html(self):
        body, _, _ = render_md.parse("[规则](../../评分规则.md#分数) [成品](a/index.html) [外](https://x.io/a.md)")
        self.assertIn('href="../../评分规则.html#分数"', body)
        self.assertIn('href="a/index.html"', body)
        self.assertIn('href="https://x.io/a.md" target="_blank" rel="noopener"', body)

    def test_headings_toc_and_unique_ids(self):
        body, title, toc = render_md.parse("# 标题\n\n## 结果\n\n### 结果\n")
        self.assertEqual(title, "标题")
        self.assertEqual([t[1] for t in toc], ["结果", "结果-2"])
        self.assertIn('<h2 id="结果">', body)

    def test_fence_and_lists(self):
        body, _, _ = render_md.parse("```bash\necho <a>\n```\n\n1. 一\n2. 二\n\n- 甲\n")
        self.assertIn('<pre><code class="lang-bash">echo &lt;a&gt;</code></pre>', body)
        self.assertIn("<ol>", body)
        self.assertIn("<ul>", body)


if __name__ == "__main__":
    unittest.main()
