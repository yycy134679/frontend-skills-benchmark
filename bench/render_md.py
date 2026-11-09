#!/usr/bin/env python3
"""把仓库里的记录类 Markdown 渲染成同目录的静态 HTML（只用标准库）。

用法：
    python3 bench/render_md.py                # 渲染全部
    python3 bench/render_md.py 评分规则.md ...  # 只渲染指定文件

`.md` 是唯一的内容源，生成的 `.html` 一起入库，首页链接指向它们。
页面自包含、样式内联、不请求外部资源，直接用 file:// 打开也可用。
"""
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 需要渲染的文件（相对仓库根目录的 glob）
SOURCES = [
    "examples/case-*/对照记录.md",
    "examples/case-*/评分记录.md",
    "评分规则.md",
    "案例提示词.md",
    "frontend-skills/README.md",
]


# ───────────────────────── 行内 ─────────────────────────

def slugify(text):
    text = re.sub(r"[`*]", "", text).strip()
    text = re.sub(r"[^\w一-鿿]+", "-", text).strip("-")
    return text or "section"


def rewrite_href(href):
    """指向 .md 的相对链接改成 .html，保留锚点；其余原样。"""
    if re.match(r"^[a-z][a-z0-9+.-]*:", href, re.I):
        return href
    m = re.match(r"^([^#?]*)\.md(([#?].*)?)$", href)
    return f"{m.group(1)}.html{m.group(2)}" if m else href


def inline(text):
    """转义后依次处理行内代码、粗体、斜体、链接。"""
    codes = []

    def stash(m):
        codes.append(f"<code>{html.escape(m.group(1))}</code>")
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", stash, text)
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![*\w])\*([^*\s][^*]*?)\*(?![*\w])", r"<em>\1</em>", text)

    def link(m):
        label, href = m.group(1), html.unescape(m.group(2))
        href = rewrite_href(href)
        ext = re.match(r"^https?:", href)
        attrs = ' target="_blank" rel="noopener"' if ext else ""
        return f'<a href="{html.escape(href)}"{attrs}>{label}</a>'

    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, text)
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], text)


# ───────────────────────── 块级 ─────────────────────────

def split_row(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    cells, buf, in_code = [], "", False
    for ch in line:
        if ch == "`":
            in_code = not in_code
        if ch == "|" and not in_code:
            cells.append(buf.strip())
            buf = ""
        else:
            buf += ch
    cells.append(buf.strip())
    return cells


MARK_CLASS = {"✓": "ok", "△": "half", "✗": "no", "—": "na"}


def render_cell(tag, text, scope=None):
    cls = MARK_CLASS.get(text.strip())
    attr = f' class="mark-{cls}"' if cls else ""
    scope_attr = f' scope="{scope}"' if scope else ""
    return f"<{tag}{scope_attr}{attr}>{inline(text)}</{tag}>"


def render_table(rows):
    head, body = rows[0], rows[2:]
    out = ['<div class="table-wrap"><table><thead><tr>']
    out += [render_cell("th", c, "col") for c in head]
    out.append("</tr></thead><tbody>")
    for row in body:
        out.append("<tr>")
        for i, c in enumerate(row):
            out.append(render_cell("th", c, "row") if i == 0 else render_cell("td", c))
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)


def parse(md):
    """返回 (html 正文, 标题, 目录[(级别, id, 文本)])。"""
    lines = md.splitlines()
    out, toc, title = [], [], None
    used_ids = set()
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue

        fence = re.match(r"^```\s*(\S*)", line)
        if fence:
            i += 1
            buf = []
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1
            lang = fence.group(1)
            cls = f' class="lang-{html.escape(lang)}"' if lang else ""
            out.append(f"<pre><code{cls}>{html.escape(chr(10).join(buf))}</code></pre>")
            continue

        h = re.match(r"^(#{1,6})\s+(.*)$", line)
        if h:
            level, text = len(h.group(1)), h.group(2).strip()
            if level == 1 and title is None:
                title = re.sub(r"[`*]", "", text)
            sid = base = slugify(text)
            n = 2
            while sid in used_ids:
                sid, n = f"{base}-{n}", n + 1
            used_ids.add(sid)
            if level in (2, 3):
                toc.append((level, sid, re.sub(r"[`*]", "", text)))
            out.append(f'<h{level} id="{html.escape(sid)}">{inline(text)}</h{level}>')
            i += 1
            continue

        if re.match(r"^(-{3,}|\*{3,})\s*$", line):
            out.append("<hr>")
            i += 1
            continue

        if line.lstrip().startswith("|") and i + 1 < len(lines) and re.match(
            r"^\s*\|?\s*:?-{2,}", lines[i + 1]
        ):
            rows = []
            while i < len(lines) and lines[i].lstrip().startswith("|"):
                rows.append(split_row(lines[i]))
                i += 1
            out.append(render_table(rows))
            continue

        if line.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i].lstrip("> ").rstrip())
                i += 1
            out.append(f"<blockquote><p>{inline(' '.join(buf))}</p></blockquote>")
            continue

        item = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
        if item:
            ordered = item.group(2)[0].isdigit()
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>")
            while i < len(lines):
                m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", lines[i])
                if not m or m.group(2)[0].isdigit() != ordered:
                    break
                text = m.group(3)
                i += 1
                # 缩进的续行并入当前条目
                while i < len(lines) and lines[i].startswith("  ") and lines[i].strip() and not re.match(
                    r"^\s*([-*]|\d+\.)\s+", lines[i]
                ):
                    text += " " + lines[i].strip()
                    i += 1
                out.append(f"<li>{inline(text)}</li>")
            out.append(f"</{tag}>")
            continue

        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(
            r"^(#{1,6}\s|```|\||>|\s*([-*]|\d+\.)\s)", lines[i]
        ):
            buf.append(lines[i].strip())
            i += 1
        if not buf:  # 防止死循环：遇到无法识别的行当段落处理
            buf.append(lines[i].strip())
            i += 1
        out.append(f"<p>{inline(' '.join(buf))}</p>")

    return "\n".join(out), title or "记录", toc


# ───────────────────────── 页面 ─────────────────────────

CSS = """
:root{--paper:#f2ebdd;--paper-deep:#e8dfc9;--cream:#fbf7ec;--ink:#221e18;--muted:#5e5546;--line:#c8bda7;--green:#28503c;--rust:#a33a26;--pad:clamp(20px,5vw,72px);
--serif:"Songti SC","Noto Serif SC","STSong","SimSun",serif;--sans:"PingFang SC","Helvetica Neue","Noto Sans SC",sans-serif;--mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:24px}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.85;-webkit-font-smoothing:antialiased}
a{color:var(--green);text-decoration-thickness:1px;text-underline-offset:3px}
a:hover{color:var(--rust)}
:focus-visible{outline:2px solid var(--rust);outline-offset:3px}
::selection{background:var(--rust);color:var(--cream)}
.shell{max-width:1240px;margin:0 auto;padding:0 var(--pad)}
.masthead{display:flex;justify-content:space-between;align-items:end;gap:24px;padding-top:26px;padding-bottom:16px;border-bottom:2px solid var(--ink)}
.mark{font-family:var(--serif);font-size:27px;font-weight:600;letter-spacing:.02em;color:var(--ink);text-decoration:none}
.back{font-size:12px;color:var(--ink);text-decoration:none;border-bottom:1px solid transparent;padding-bottom:3px}
.back:hover{border-color:var(--ink);color:var(--ink)}
.layout{display:grid;grid-template-columns:minmax(0,1fr);gap:56px;padding-top:clamp(36px,5vw,64px);padding-bottom:96px}
.doc{min-width:0;max-width:860px}
.toc{display:none}
@media(min-width:1100px){.layout{grid-template-columns:minmax(0,860px) 230px;justify-content:space-between}
.toc{display:block;position:sticky;top:24px;align-self:start;max-height:calc(100vh - 48px);overflow:auto;font-size:13px;line-height:1.6}}
.toc p{margin:0 0 10px;font-size:12px;letter-spacing:.12em;color:var(--muted)}
.toc ol{list-style:none;margin:0;padding:0;border-left:1px solid var(--line)}
.toc a{display:block;padding:4px 0 4px 14px;margin-left:-1px;border-left:2px solid transparent;color:var(--muted);text-decoration:none}
.toc a.sub{padding-left:28px;font-size:12px}
.toc a:hover{color:var(--ink)}
.toc a.active{border-left-color:var(--rust);color:var(--ink);font-weight:600}
.doc h1{margin:0 0 22px;font-family:var(--serif);font-weight:600;font-size:clamp(34px,4.6vw,54px);line-height:1.2;letter-spacing:-.02em;text-wrap:balance}
.doc h1+p{font-size:16px;color:var(--muted)}
.doc h2{margin:56px 0 18px;padding-top:16px;border-top:1px solid var(--ink);font-family:var(--serif);font-weight:600;font-size:26px;line-height:1.35}
.doc h3{margin:36px 0 12px;font-family:var(--serif);font-weight:600;font-size:19px;line-height:1.45;color:var(--green)}
.doc p{margin:0 0 16px}
.doc ul,.doc ol{margin:0 0 20px;padding-left:1.3em}
.doc li{margin:4px 0;padding-left:.2em}
.doc li::marker{color:var(--rust)}
.doc strong{font-weight:600}
.doc code{font-family:var(--mono);font-size:.86em;background:var(--cream);border:1px solid var(--line);border-radius:3px;padding:1px 5px;word-break:break-word}
.doc pre{margin:0 0 22px;padding:16px 20px;background:var(--cream);border:1px solid var(--line);border-left:3px solid var(--green);overflow-x:auto;font-size:13px;line-height:1.75}
.doc pre code{background:none;border:0;padding:0;font-size:inherit;word-break:normal;white-space:pre-wrap}
.doc blockquote{margin:0 0 20px;padding:2px 0 2px 18px;border-left:3px solid var(--rust);color:var(--muted)}
.doc hr{border:0;border-top:1px solid var(--line);margin:40px 0}
.table-wrap{margin:0 0 28px;overflow-x:auto;border-top:2px solid var(--ink);border-bottom:1px solid var(--ink);background:var(--cream)}
table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.7}
th,td{padding:10px 14px;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
thead th{background:var(--paper-deep);font-weight:600;white-space:nowrap;border-bottom:1px solid var(--ink)}
tbody th{font-weight:600;min-width:5em}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}
td{min-width:4.5em}
.mark-ok,.mark-half,.mark-no,.mark-na{text-align:center;font-weight:700}
.mark-ok{color:var(--green)}.mark-half{color:#b0761a}.mark-no{color:var(--rust)}.mark-na{color:var(--muted);font-weight:400}
@media(max-width:700px){body{font-size:14px}.mark{font-size:22px}.doc h2{font-size:22px;margin-top:44px}th,td{padding:8px 10px}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
"""

JS = """
(function(){
  var links=[].slice.call(document.querySelectorAll('.toc a'));
  if(!links.length||!('IntersectionObserver' in window))return;
  var map={};links.forEach(function(a){map[a.getAttribute('href').slice(1)]=a});
  var heads=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))}).filter(Boolean);
  function update(){
    var cur=heads[0];
    heads.forEach(function(h){if(h.getBoundingClientRect().top<=120)cur=h});
    links.forEach(function(a){a.classList.remove('active');a.removeAttribute('aria-current')});
    var a=cur&&map[cur.id];if(a){a.classList.add('active');a.setAttribute('aria-current','true')}
  }
  var ticking=false;
  addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){ticking=false;update()})}},{passive:true});
  update();
})();
"""


def home_href(path):
    depth = len(path.relative_to(ROOT).parts) - 1
    href = "../" * depth + "index.html"
    m = re.match(r"case-(\d+)$", path.parent.name)
    return f"{href}#case-{m.group(1)}" if m else href


def build_page(md, path):
    body, title, toc = parse(md)
    toc_html = ""
    if toc:
        items = "".join(
            f'<li><a href="#{html.escape(sid)}"{" class=sub" if lv == 3 else ""}>{html.escape(t)}</a></li>'
            for lv, sid, t in toc
        )
        toc_html = f'<nav class="toc" aria-label="本页目录"><p>目录</p><ol>{items}</ol></nav>'
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} · 技能对照册</title>
<style>{CSS}</style>
</head>
<body>
<header class="shell masthead">
  <a class="mark" href="{home_href(path)}">技能对照册</a>
  <a class="back" href="{home_href(path)}">← 返回首页</a>
</header>
<div class="shell layout">
<main class="doc">
{body}
</main>
{toc_html}
</div>
<script>{JS}</script>
</body>
</html>
"""


def render_file(path):
    path = Path(path).resolve()
    out = path.with_suffix(".html")
    page = build_page(path.read_text(encoding="utf-8"), path)
    if not out.exists() or out.read_text(encoding="utf-8") != page:
        out.write_text(page, encoding="utf-8")
    return out


def main(argv):
    if argv:
        files = [Path(a) for a in argv]
    else:
        files = sorted(p for pat in SOURCES for p in ROOT.glob(pat))
    for f in files:
        out = render_file(f)
        print(f"{f} -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1:])
