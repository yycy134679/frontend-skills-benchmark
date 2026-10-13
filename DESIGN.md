---
name: frontend-skills-benchmark
description: 纸感设计刊物风格的前端技能画廊
colors:
  paper: "#f4f0e5"
  ink: "#293f31"
  muted: "#596650"
  line: "#c9cbb5"
  primary: "#8c3c26"
  track: "#e6e4d7"
  frame: "#fffdf7"
typography:
  display:
    fontFamily: '"Songti SC", "Noto Serif CJK SC", serif'
    fontSize: "clamp(44px, 5vw, 70px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Songti SC", serif'
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif'
    fontSize: "15px"
    lineHeight: 1.6
rounded:
  frame: "0px"
spacing:
  frame: "10px"
  track: "30px"
components:
  screenshot-frame:
    backgroundColor: "{colors.frame}"
    rounded: "{rounded.frame}"
    padding: "{spacing.frame}"
---

## Overview

采用纸感设计刊物风格。暖纸色承托内容，深绿墨色建立阅读层次，中文衬线标题形成章节。截图是画廊主体，控件与补充信息保持克制。参考原型为 `prototypes/gallery.html?style=journal`。

## Colors

纸色用于网站背景，墨色用于标题与正文，次要文字色用于说明，浅色分隔线用于区分章节。红棕强调色用于重点入口、聚焦与文本选中状态。白色画幅托住截图，不改变成品本身的色彩。

## Typography

主要标题采用中文衬线字体，正文与操作标签使用无衬线字体。英文品牌字标使用 Georgia。手机主标题为 40px，案例标题为 26px。保留清楚的层次，避免把小字缩得难以阅读。

## Layout

顶部水平页眉，最大宽 1500px、高 105px，底部以 2px 墨色线收口；主内容最大宽 1680px、左右留白 4vw。案例纵向排列，版本横向排列，轨道间距使用 track token。

桌面截图卡片宽度为 `calc((100% - 90px)/2.6)`，露出下一张以提示可横向浏览。760px 以下主内容左右留白 20px，卡片约占轨道宽度 87%；保留横向滑动与箭头，辅助信息展开查看。

## Elevation & Depth

通过背景、画幅与分隔线建立层次，不给画廊叠加阴影。示例截图中的阴影属于成品内容，与展示网站的视觉系统分开。

## Shapes

截图画幅使用直角，内留白使用 frame token。圆形只用于左右箭头控件；打开完整页面的文字标签保持直角。

## Components

每组画廊包含案例标题、描述、左右箭头、版本截图和可展开的提示词与生成信息。技能仓库链接独立于截图打开链接。

截图链接在新标签页打开完整成品，返回保留浏览位置。键盘聚焦使用 3px 强调色描边，横向轨道按卡片吸附；到两端禁用对应箭头。减少动态效果偏好下关闭平滑滚动与缩略图过渡。

## Do's and Don'ts

- 保持同组截图窗口尺寸、范围和卡片尺寸一致。
- 保持纸色、墨色、衬线标题与白色画幅的组合。
- 用章节和排版组织信息，优先给成品留空间。
- 展示网站的风格不覆盖、润色或改变示例成品。
- 示意内容明确标注，不作为真实技能评测结果。
