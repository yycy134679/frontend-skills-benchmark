// 真实案例与版本。新技能结果加入对应案例的 versions，基准版始终排在首位。
const benchmarkCases = [
  {
    "id": "case-01",
    "name": "加入我们",
    "type": "虚拟公司招聘展示页",
    "desc": "了解寻常科技的业务、工作方式与加入机会。",
    "prompt": "# 案例一：虚拟公司「加入我们」展示页\n\n请为虚拟公司「寻常科技」制作一个完整的「加入我们」展示页，使用中文。\n\n让访客了解这是一家怎样的公司、在做什么、如何工作，以及正在寻找怎样的伙伴，并愿意进一步了解加入机会。\n\n自主设计页面的信息组织、模块数量与顺序、视觉风格、配色、字体、图片、布局和交互。以下是内容素材，不是页面结构；可以重组、合并和提炼表达，保留关键事实。\n\n## 公司信息\n\n- 公司名称：寻常科技。\n- 业务：开发 AI 个人效率工具，帮助用户整理笔记、管理任务和规划日程。\n- 办公地点：杭州\n- 理念：让工具更懂日常，让人更专注创造。\n\n公司介绍：我们从笔记、任务和日程这些日常小事出发，探索更自然的智能工具。先理解用户为什么需要它，再把技术变成清楚、可靠、容易使用的产品，让人少花一点时间整理，多留一点空间思考。\n\n## 招聘岗位\n\n- 前端工程师：参与 AI 效率工具的 Web 界面开发，关注流畅交互与可靠体验。\n- 后端工程师：建设数据同步与协作服务，让用户的信息可靠流转。\n- 产品设计师：从真实问题出发，把复杂流程变成清楚易用的体验。\n- 内容运营实习生：撰写教程与使用案例，让更多人理解产品的价值。\n",
    "versions": [
      {
        "name": "无技能",
        "repo": null,
        "url": "../examples/case-01/no-skill-pi/index.html",
        "screenshot": "assets/case-01-baseline.png",
        "model": "command-code/deepseek-deepseek-v4.1-flash-fast",
        "provider": "opencodex",
        "tool": "pi",
        "reasoning": "high",
        "date": "2026-10-17",
        "skillVersion": null,
        "viewport": "1440 × 960"
      },
      {
        "name": "frontend-design",
        "repo": "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
        "url": "../examples/case-01/frontend-design-pi/index.html",
        "screenshot": "assets/case-01-frontend-design.png",
        "model": "command-code/deepseek-deepseek-v4.1-flash-fast",
        "provider": "opencodex",
        "tool": "pi",
        "reasoning": "high",
        "date": "2026-10-18",
        "skillVersion": "dbd4588f9e1033efb41dad4bef2f7947c8993d44",
        "viewport": "1440 × 960"
      }
    ]
  },
  {
    "id": "case-02",
    "name": "同频",
    "type": "SaaS 产品官网",
    "desc": "介绍协作工具的功能、价格方案与用户评价。",
    "prompt": "# 案例二：SaaS 产品官网\n\n请为虚拟 SaaS 产品「同频」制作一个完整的中文产品官网，让访客理解产品价值、了解核心功能、比较价格方案，并愿意开始试用。\n\n整体采用现代简约风格，自主设计页面的信息组织、模块顺序、配色、字体、图片、布局与交互。以下是内容素材，可以重组、合并和提炼表达，保留产品、功能、价格与评价的关键事实。\n\n## 产品信息\n\n- 产品名称：同频。\n- 定位：面向自由职业者与小型团队的项目协作工具。\n- 用途：把项目任务、团队讨论与进度放在同一处，减少在不同工具之间切换。\n- 核心价值：少一点来回确认，多一点共同推进。\n\n产品介绍：同频帮助团队清楚知道下一步做什么、由谁负责、进展到哪里。从一个人的项目到多人协作，让信息跟着工作走，让大家保持同一个节奏。\n\n## 宣传文案素材\n\n- 标题：让每个人，都知道下一步。\n- 副标题：把任务、讨论与进度放在一起，让小团队少一点忙乱，多一点默契。\n- 主要 CTA：免费开始。\n- 次要 CTA：了解功能。\n\n## 核心功能\n\n- **任务有序**：用列表和看板组织项目，明确负责人、截止日期与优先级，让下一步清楚可见。\n- **讨论不散**：围绕任务交流，集中保存相关文件与决定，让新加入的伙伴也能快速接上进度。\n- **进展透明**：汇总项目状态与待办事项，及时发现卡点，减少反复询问与临时会议。\n\n## 价格方案\n\n| 方案 | 价格 | 适用人群 | 包含内容 |\n| --- | --- | --- | --- |\n| 免费版 | ¥0 | 个人与刚开始协作的小团队 | 最多 3 位成员、3 个项目、基础任务与讨论、1 GB 文件空间 |\n| 专业版 | ¥39 / 成员 / 月 | 需要持续管理多个项目的团队 | 不限项目、全部任务与讨论功能、进度汇总、20 GB 团队文件空间 |\n| 团队版 | ¥69 / 成员 / 月 | 需要更完整管理能力的团队 | 专业版全部功能、成员权限管理、操作记录、100 GB 团队文件空间、优先支持 |\n\n付费方案按月计费。\n\n## 用户评价素材\n\n- 林禾 · 独立设计师：终于不用在聊天记录里找客户的修改意见了。任务和讨论放在一起，交付前心里更有底。\n- 周远 · 小型开发团队负责人：每天打开项目，就能知道哪里需要我帮忙。我们少开了几次确认进度的会，多了一些专注做事的时间。\n- 陈宁 · 内容工作室主理人：从选题到发布，谁负责、做到哪一步都很清楚。新人加入后，也不用把整个流程重新讲一遍。\n\n以上为虚拟用户评价。\n\n## 品牌与联系信息\n\n- 品牌短句：让工作同频，让协作轻松。\n- 联系邮箱：hello@example.com。\n- 标注：虚拟产品 · 官网展示演示。\n\n## 基本要求\n\n提供流畅的交互动效与响应式适配，保持良好的对比度和可读性。交付可运行的前端页面，导航与按钮提供可用的演示交互，无需真实注册、支付或后台服务。\n",
    "versions": [
      {
        "name": "无技能",
        "repo": null,
        "url": "../examples/case-02/no-skill-pi/index.html",
        "screenshot": "assets/case-02-baseline.png",
        "model": "command-code/deepseek-deepseek-v4.1-flash-fast",
        "provider": "opencodex",
        "tool": "pi",
        "reasoning": "high",
        "date": "2026-10-17",
        "skillVersion": null,
        "viewport": "1440 × 960"
      },
      {
        "name": "frontend-design",
        "repo": "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
        "url": "../examples/case-02/frontend-design-pi/index.html",
        "screenshot": "assets/case-02-frontend-design.png",
        "model": "command-code/deepseek-deepseek-v4.1-flash-fast",
        "provider": "opencodex",
        "tool": "pi",
        "reasoning": "high",
        "date": "2026-10-18",
        "skillVersion": "dbd4588f9e1033efb41dad4bef2f7947c8993d44",
        "viewport": "1440 × 960"
      }
    ]
  },
  {
    "id": "case-03",
    "name": "林间",
    "type": "个人作品集",
    "desc": "认识独立设计师，浏览四个代表项目并了解合作方式。",
    "prompt": "# 案例三：个人作品集\n\n请为虚拟独立设计师「林间」制作一个完整的中文个人作品集网站。\n\n让访客认识这位设计师、了解其创作方向与代表作品，并愿意进一步联系合作。\n\n自主设计页面的信息组织、模块数量与顺序、视觉风格、配色、字体、图片、布局和交互。以下是内容素材，不是页面结构；可以重组、合并和提炼表达，保留关键事实。\n\n## 个人信息\n\n- 姓名：林间。\n- 身份：独立视觉与数字产品设计师。\n- 所在地：杭州，接受远程合作。\n- 创作方向：品牌视觉、网站设计与数字产品体验。\n- 理念：让清楚的表达，也有自己的性格。\n\n个人介绍：我关注人与信息之间的关系，喜欢从日常观察中寻找设计的起点。从一个品牌的第一印象，到一个产品里的细小操作，我希望设计既能传达独特的气质，也能让使用变得自然。\n\n## 代表作品\n\n### 田野书店\n\n- 类型：品牌视觉。\n- 项目背景：一家关注文学、艺术与在地生活的独立书店，希望建立亲切、有辨识度的品牌形象。\n- 设计内容：品牌标识、字体与色彩系统、书签及活动海报。\n- 创作思路：从书页与田野的关系出发，用简单的视觉语言连接阅读与日常。\n\n### 同频\n\n- 类型：数字产品。\n- 项目背景：面向自由职业者与小型团队的项目协作工具，需要让任务、讨论和进度清楚地组织在一起。\n- 设计内容：信息架构、任务看板、项目概览与界面组件。\n- 创作思路：减少信息噪声，让团队快速找到当前需要关注的事情。\n\n### 慢日咖啡\n\n- 类型：网站设计。\n- 项目背景：一家社区咖啡店，希望通过网站传达轻松的空间氛围，介绍咖啡与季节菜单。\n- 设计内容：品牌官网、菜单展示与移动端体验。\n- 创作思路：把线下空间的节奏带到屏幕上，让浏览像一次短暂的停留。\n\n### 城市间隙\n\n- 类型：编辑设计。\n- 项目背景：一本记录城市散步、街角店铺与日常细节的独立刊物。\n- 设计内容：封面、内页排版与图文编排。\n- 创作思路：通过文字与图像的节奏，让被忽略的城市细节重新进入视野。\n\n## 合作信息\n\n- 可合作内容：品牌视觉、官网设计、数字产品界面与编辑设计。\n- 合作方式：项目合作或持续设计支持。\n- 联系邮箱：linjian@example.com。\n- 邀请语：如果你有一个正在萌芽的想法，我们可以一起把它变得清楚。\n\n## 基本要求\n\n作品应有与项目内容相符的视觉展示，可以自行创作封面或设计示意。支持手机与电脑浏览，保持良好的对比度和可读性。交付可运行的前端页面，所采用的导航、作品浏览与联系入口应提供可用的演示交互，无需真实后台。标注「虚拟设计师 · 作品集演示」。\n",
    "versions": [
      {
        "name": "无技能",
        "repo": null,
        "url": "../examples/case-03/no-skill-pi/index.html",
        "screenshot": "assets/case-03-baseline.png",
        "model": "command-code/deepseek-deepseek-v4.1-flash-fast",
        "provider": "opencodex",
        "tool": "pi",
        "reasoning": "high",
        "date": "2026-10-17",
        "skillVersion": null,
        "viewport": "1440 × 960"
      },
      {
        "name": "frontend-design",
        "repo": "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
        "url": "../examples/case-03/frontend-design-pi/index.html",
        "screenshot": "assets/case-03-frontend-design.png",
        "model": "command-code/deepseek-deepseek-v4.1-flash-fast",
        "provider": "opencodex",
        "tool": "pi",
        "reasoning": "high",
        "date": "2026-10-18",
        "skillVersion": "dbd4588f9e1033efb41dad4bef2f7947c8993d44",
        "viewport": "1440 × 960"
      }
    ]
  }
];
