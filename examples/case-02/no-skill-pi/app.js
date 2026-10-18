/* =========================================================
   同频 · 官网交互脚本
   所有数据仅存在于当前页面，不连接任何真实服务
   ========================================================= */
(function () {
  'use strict';

  var $ = function (selector, root) {
    return (root || document).querySelector(selector);
  };
  var $$ = function (selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 页脚年份 ---------- */
  var yearEl = $('#footerYear');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- 顶部导航滚动状态 ---------- */
  var header = $('#siteHeader');
  var scrollTicking = false;
  function handleScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(function () {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  /* ---------- 全局提示 ---------- */
  var toast = $('#toast');
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2800);
  }

  /* ---------- 移动端菜单 ---------- */
  var menuToggle = $('#menuToggle');
  var mobileMenu = $('#mobileMenu');

  function setMobileMenu(open) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('nav-open', open);
    if (!open && mobileMenu.contains(document.activeElement)) {
      menuToggle.focus();
    }
    if (open) {
      var firstLink = $('a', mobileMenu);
      if (firstLink) window.setTimeout(function () { firstLink.focus(); }, 180);
    }
  }

  if (menuToggle) {
    menuToggle.addEventListener('click', function () {
      setMobileMenu(!mobileMenu.classList.contains('is-open'));
    });
  }

  $$('[data-mobile-link]').forEach(function (link) {
    link.addEventListener('click', function () { setMobileMenu(false); });
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 1020 && mobileMenu && mobileMenu.classList.contains('is-open')) {
      setMobileMenu(false);
    }
  });

  /* ---------- 导航当前区块高亮 ---------- */
  var navLinks = $$('.desktop-nav a[data-nav]');
  var navSections = navLinks.map(function (link) {
    return document.getElementById(link.getAttribute('data-nav'));
  }).filter(Boolean);

  if ('IntersectionObserver' in window && navSections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          link.classList.toggle('is-active', link.getAttribute('data-nav') === entry.target.id);
        });
      });
    }, { rootMargin: '-38% 0px -54% 0px', threshold: 0 });

    navSections.forEach(function (section) { navObserver.observe(section); });
  }

  /* ---------- 滚动出现动画 ---------- */
  var revealEls = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- 核心功能标签切换 ---------- */
  var featureTabs = $$('.feature-tab');

  function activateFeatureTab(tab, focusTab) {
    featureTabs.forEach(function (item) {
      var selected = item === tab;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.setAttribute('tabindex', selected ? '0' : '-1');
      var panel = document.getElementById(item.getAttribute('aria-controls'));
      if (panel) {
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
      }
    });
    if (focusTab) tab.focus();
  }

  featureTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { activateFeatureTab(tab, false); });
    tab.addEventListener('keydown', function (event) {
      var nextIndex = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % featureTabs.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + featureTabs.length) % featureTabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = featureTabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateFeatureTab(featureTabs[nextIndex], true);
    });
  });

  /* ---------- 功能一：可勾选任务 ---------- */
  var featureTaskList = $('#featureTaskList');
  var featureTaskCount = $('#featureTaskCount');
  var featureTaskBar = $('#featureTaskBar');

  function updateFeatureTaskProgress() {
    if (!featureTaskList) return;
    var items = $$('li', featureTaskList);
    var done = $$('li.is-done', featureTaskList).length;
    if (featureTaskCount) featureTaskCount.innerHTML = '<b>' + done + '</b> / ' + items.length + ' 已完成';
    if (featureTaskBar) featureTaskBar.style.width = (items.length ? (done / items.length) * 100 : 0) + '%';
  }

  if (featureTaskList) {
    featureTaskList.addEventListener('click', function (event) {
      var button = event.target.closest('.task-check');
      if (!button || !featureTaskList.contains(button)) return;
      var item = button.closest('li');
      var done = item.classList.toggle('is-done');
      button.setAttribute('aria-pressed', String(done));
      var titleEl = $('.feature-task-title', item);
      var title = titleEl ? titleEl.textContent : '这项任务';
      button.setAttribute('aria-label', '将「' + title + '」标记为' + (done ? '未完成' : '已完成'));
      updateFeatureTaskProgress();
    });
    updateFeatureTaskProgress();
  }

  /* ---------- 功能二：讨论回复 ---------- */
  var replyForm = $('#replyForm');
  var replyInput = $('#replyInput');
  var threadMessages = $('#threadMessages');

  if (replyForm && replyInput && threadMessages) {
    replyForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var text = replyInput.value.trim();
      if (!text) {
        replyInput.focus();
        showToast('先写点什么，再发送回复。');
        return;
      }

      var message = document.createElement('div');
      message.className = 'thread-message';

      var avatar = document.createElement('span');
      avatar.className = 'avatar avatar-me';
      avatar.textContent = '我';
      avatar.setAttribute('aria-hidden', 'true');

      var body = document.createElement('div');
      var meta = document.createElement('div');
      meta.className = 'message-meta';
      var name = document.createElement('strong');
      name.textContent = '我';
      var time = document.createElement('time');
      time.textContent = '刚刚';
      meta.appendChild(name);
      meta.appendChild(time);

      var copy = document.createElement('p');
      copy.textContent = text;

      body.appendChild(meta);
      body.appendChild(copy);
      message.appendChild(avatar);
      message.appendChild(body);
      threadMessages.appendChild(message);

      replyInput.value = '';
      threadMessages.scrollTop = threadMessages.scrollHeight;
      showToast('回复已加入演示讨论。');
    });
  }

  /* =======================================================
     交互工作台：任务数据与渲染
     ======================================================= */
  var initialTasks = [
    {
      id: 't1', title: '整理用户访谈结论', tag: '研究', tagClass: 'tag-design',
      status: 'todo', assignee: '林禾', avatar: 'avatar-lh', due: '今天',
      priority: '高', priorityKey: 'high', comments: 4, fileName: '访谈纪要.pdf',
      desc: '汇总 6 位客户的反馈，提炼出三个关于首页信息层级的共性问题。'
    },
    {
      id: 't2', title: '确定首页视觉方向', tag: '设计', tagClass: 'tag-design',
      status: 'doing', assignee: '陈宁', avatar: 'avatar-cn', due: '周三',
      priority: '高', priorityKey: 'high', comments: 7, fileName: '首页方案_v3.fig',
      desc: '在「留白」与「网格」两个方向中确认主视觉，同步给开发评估。'
    },
    {
      id: 't3', title: '预约拍摄场地', tag: '执行', tagClass: 'tag-run',
      status: 'todo', assignee: '周远', avatar: 'avatar-zy', due: '周四',
      priority: '中', priorityKey: 'mid', comments: 2, fileName: '拍摄清单.xlsx',
      desc: '确认下周三下午的影棚档期，并同步拍摄清单与到场时间。'
    },
    {
      id: 't4', title: '搭建定价页结构', tag: '开发', tagClass: 'tag-dev',
      status: 'doing', assignee: '周远', avatar: 'avatar-zy', due: '周五',
      priority: '中', priorityKey: 'mid', comments: 3, fileName: '定价页结构.md',
      desc: '完成三档价格卡片与对比表，预留后续按年付的扩展空间。'
    },
    {
      id: 't5', title: '归档旧版品牌素材', tag: '整理', tagClass: 'tag-organize',
      status: 'done', assignee: '林禾', avatar: 'avatar-lh', due: '已完成',
      priority: '低', priorityKey: 'low', comments: 1, fileName: '品牌素材归档.zip',
      desc: '旧版 logo、字体授权与图片已归入 2024 归档文件夹。'
    },
    {
      id: 't6', title: '发布更新公告', tag: '内容', tagClass: 'tag-content',
      status: 'done', assignee: '陈宁', avatar: 'avatar-cn', due: '已完成',
      priority: '低', priorityKey: 'low', comments: 5, fileName: '更新公告.docx',
      desc: '公告已在项目讨论中定稿，并同步到客户群。'
    },
    {
      id: 't7', title: '确认移动端断点', tag: '开发', tagClass: 'tag-dev',
      status: 'todo', assignee: '周远', avatar: 'avatar-zy', due: '下周一',
      priority: '中', priorityKey: 'mid', comments: 1, fileName: '交互说明.pdf',
      desc: '确认首页在 768px 与 390px 两个断点下的信息顺序与间距。'
    }
  ];

  var tasks = initialTasks.map(function (task) { return Object.assign({}, task); });
  var workspaceState = { view: 'board', member: 'all' };

  var statusMeta = {
    todo: { label: '待处理', action: '开始处理', next: 'doing', doneText: '已开始处理' },
    doing: { label: '进行中', action: '标记完成', next: 'done', doneText: '已完成' },
    done: { label: '已完成', action: '重新打开', next: 'todo', doneText: '已重新打开' }
  };

  var boardView = $('#boardView');
  var listView = $('#listView');
  var listRows = $('#listRows');
  var memberFilter = $('#memberFilter');
  var workspaceCount = $('#workspaceCount');
  var viewButtons = $$('[data-view]');

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function avatarLetter(name) {
    return name ? name.slice(0, 1) : '同';
  }

  function filteredTasks() {
    return tasks.filter(function (task) {
      return workspaceState.member === 'all' || task.assignee === workspaceState.member;
    });
  }

  function taskCardHTML(task) {
    return '' +
      '<article class="kanban-card' + (task.status === 'done' ? ' is-done' : '') + '"' +
      ' data-task-id="' + task.id + '" tabindex="0" role="button"' +
      ' aria-label="查看任务：' + escapeHTML(task.title) + '">' +
        '<div class="kanban-card-top">' +
          '<span class="task-tag ' + task.tagClass + '">' + task.tag + '</span>' +
          '<span class="kanban-priority ' + task.priorityKey + '">' + task.priority + '优先级</span>' +
        '</div>' +
        '<h4>' + escapeHTML(task.title) + '</h4>' +
        '<div class="kanban-card-foot">' +
          '<span class="avatar ' + task.avatar + '" aria-hidden="true">' + avatarLetter(task.assignee) + '</span>' +
          '<span class="kanban-date">' + escapeHTML(task.due) + '</span>' +
          '<span class="kanban-comments"><svg aria-hidden="true"><use href="#icon-comment"></use></svg>' + task.comments + '</span>' +
        '</div>' +
      '</article>';
  }

  function renderBoard() {
    if (!boardView) return;
    ['todo', 'doing', 'done'].forEach(function (status) {
      var container = $('[data-cards="' + status + '"]', boardView);
      var counter = $('[data-count="' + status + '"]', boardView);
      var items = filteredTasks().filter(function (task) { return task.status === status; });
      if (counter) counter.textContent = String(items.length);
      if (!container) return;
      container.innerHTML = items.length
        ? items.map(taskCardHTML).join('')
        : '<div class="empty-column">暂无任务</div>';
    });
  }

  function renderList() {
    if (!listRows) return;
    var items = filteredTasks();
    if (!items.length) {
      listRows.innerHTML = '<div class="empty-column" style="min-height:180px;">当前筛选下暂无任务</div>';
      return;
    }
    listRows.innerHTML = items.map(function (task) {
      var meta = statusMeta[task.status];
      return '' +
        '<button class="list-row" type="button" data-task-id="' + task.id + '">' +
          '<span class="list-task"><span class="task-tag ' + task.tagClass + '">' + task.tag + '</span><span>' + escapeHTML(task.title) + '</span></span>' +
          '<span class="status-chip" data-status="' + task.status + '">' + meta.label + '</span>' +
          '<span class="assignee"><span class="avatar ' + task.avatar + '" aria-hidden="true">' + avatarLetter(task.assignee) + '</span>' + escapeHTML(task.assignee) + '</span>' +
          '<span class="list-date">' + escapeHTML(task.due) + '</span>' +
          '<span class="list-comments"><svg aria-hidden="true"><use href="#icon-comment"></use></svg>' + task.comments + '</span>' +
        '</button>';
    }).join('');
  }

  function renderWorkspace() {
    renderBoard();
    renderList();
    if (workspaceCount) workspaceCount.textContent = String(filteredTasks().length);
  }

  function setWorkspaceView(view) {
    workspaceState.view = view;
    if (boardView) boardView.hidden = view !== 'board';
    if (listView) listView.hidden = view !== 'list';
    viewButtons.forEach(function (button) {
      var active = button.getAttribute('data-view') === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  viewButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setWorkspaceView(button.getAttribute('data-view'));
    });
  });

  if (memberFilter) {
    memberFilter.addEventListener('change', function () {
      workspaceState.member = memberFilter.value;
      renderWorkspace();
      showToast(memberFilter.value === 'all' ? '已显示全部成员的任务。' : '已筛选「' + memberFilter.value + '」的任务。');
    });
  }

  renderWorkspace();

  /* =======================================================
     任务详情抽屉
     ======================================================= */
  var taskDrawer = $('#taskDrawer');
  var drawerOverlay = $('#drawerOverlay');
  var drawerStatus = $('#drawerStatus');
  var drawerPriority = $('#drawerPriority');
  var drawerTitle = $('#drawerTitle');
  var drawerDesc = $('#drawerDesc');
  var drawerAssignee = $('#drawerAssignee');
  var drawerDue = $('#drawerDue');
  var drawerComments = $('#drawerComments');
  var drawerFileName = $('#drawerFileName');
  var drawerAction = $('#drawerAction');
  var currentTaskId = null;
  var drawerLastFocus = null;

  function currentTask() {
    return tasks.find(function (task) { return task.id === currentTaskId; });
  }

  function fillDrawer(task) {
    var meta = statusMeta[task.status];
    if (drawerStatus) {
      drawerStatus.textContent = meta.label;
      drawerStatus.setAttribute('data-status', task.status);
    }
    if (drawerPriority) {
      drawerPriority.textContent = task.priority + '优先级';
      drawerPriority.className = 'priority-chip ' + task.priorityKey;
    }
    if (drawerTitle) drawerTitle.textContent = task.title;
    if (drawerDesc) drawerDesc.textContent = task.desc;
    if (drawerAssignee) drawerAssignee.textContent = task.assignee;
    if (drawerDue) drawerDue.textContent = task.due;
    if (drawerComments) drawerComments.textContent = task.comments + ' 条回复';
    if (drawerFileName) drawerFileName.textContent = task.fileName;
    if (drawerAction) {
      drawerAction.textContent = meta.action;
      drawerAction.setAttribute('aria-label', meta.action + '：' + task.title);
    }
  }

  function openTaskDrawer(id) {
    var task = tasks.find(function (item) { return item.id === id; });
    if (!task || !taskDrawer) return;
    currentTaskId = id;
    drawerLastFocus = document.activeElement;
    fillDrawer(task);
    taskDrawer.classList.add('is-open');
    taskDrawer.setAttribute('aria-hidden', 'false');
    if (drawerOverlay) drawerOverlay.classList.add('is-open');
    document.body.classList.add('drawer-open');
    window.setTimeout(function () {
      var closeButton = $('.drawer-close', taskDrawer);
      if (closeButton) closeButton.focus();
    }, 220);
  }

  function closeTaskDrawer() {
    if (!taskDrawer) return;
    taskDrawer.classList.remove('is-open');
    taskDrawer.setAttribute('aria-hidden', 'true');
    if (drawerOverlay) drawerOverlay.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    var closingId = currentTaskId;
    currentTaskId = null;
    if (drawerLastFocus && document.contains(drawerLastFocus)) {
      drawerLastFocus.focus();
    } else if (closingId) {
      var triggerScope = workspaceState.view === 'list' ? listView : boardView;
      var restoredTrigger = triggerScope ? $('[data-task-id="' + closingId + '"]', triggerScope) : null;
      if (restoredTrigger) restoredTrigger.focus();
    }
    drawerLastFocus = null;
  }

  function onTaskActivate(event) {
    var target = event.target.closest('[data-task-id]');
    if (!target) return;
    openTaskDrawer(target.getAttribute('data-task-id'));
  }

  if (boardView) {
    boardView.addEventListener('click', onTaskActivate);
    boardView.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      var card = event.target.closest('.kanban-card');
      if (!card) return;
      event.preventDefault();
      openTaskDrawer(card.getAttribute('data-task-id'));
    });
  }

  if (listView) listView.addEventListener('click', onTaskActivate);

  if (drawerAction) {
    drawerAction.addEventListener('click', function () {
      var task = currentTask();
      if (!task) return;
      var meta = statusMeta[task.status];
      task.status = meta.next;
      if (task.status === 'todo' && task.due === '已完成') task.due = '待安排';
      fillDrawer(task);
      renderWorkspace();
      showToast('「' + task.title + '」' + meta.doneText + '。');
    });
  }

  if (drawerOverlay) drawerOverlay.addEventListener('click', closeTaskDrawer);
  $$('[data-close-drawer]').forEach(function (button) {
    button.addEventListener('click', closeTaskDrawer);
  });

  /* ---------- 重置演示 ---------- */
  var resetDemo = $('#resetDemo');
  if (resetDemo) {
    resetDemo.addEventListener('click', function () {
      tasks = initialTasks.map(function (task) { return Object.assign({}, task); });
      workspaceState = { view: 'board', member: 'all' };
      if (memberFilter) memberFilter.value = 'all';
      setWorkspaceView('board');
      renderWorkspace();
      showToast('演示数据已重置。');
    });
  }

  /* =======================================================
     注册 / 登录弹窗
     ======================================================= */
  var authModal = $('#authModal');
  var authFormView = $('#authFormView');
  var authSuccess = $('#authSuccess');
  var authForm = $('#authForm');
  var authEmail = $('#authEmail');
  var authEmailError = $('#authEmailError');
  var authPlan = $('#authPlan');
  var planField = $('#planField');
  var authTitle = $('#authTitle');
  var authSubtitle = $('#authSubtitle');
  var authBadge = $('#authBadge');
  var authSubmit = $('#authSubmit');
  var authLastFocus = null;

  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setFieldError(input, errorEl, field, message) {
    if (errorEl) errorEl.textContent = message || '';
    if (field) field.classList.toggle('has-error', Boolean(message));
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function openAuth(mode, plan) {
    if (!authModal) return;
    var isLogin = mode === 'login';
    authLastFocus = document.activeElement;
    if (authSuccess) authSuccess.hidden = true;
    if (authFormView) authFormView.hidden = false;
    if (authForm) authForm.reset();
    setFieldError(authEmail, authEmailError, authEmail ? authEmail.closest('.field') : null, '');

    if (isLogin) {
      if (authBadge) authBadge.textContent = '欢迎回来';
      if (authTitle) authTitle.textContent = '继续你的同频。';
      if (authSubtitle) authSubtitle.textContent = '输入邮箱，进入演示工作空间。演示环境无需密码，也不会读取任何信息。';
      if (planField) planField.hidden = true;
      if (authSubmit) authSubmit.textContent = '进入演示空间';
    } else {
      if (authBadge) authBadge.textContent = '免费开始';
      if (authTitle) authTitle.textContent = '先把下一步，放进同频。';
      if (authSubtitle) authSubtitle.textContent = '填写邮箱，开启你的演示空间。不需要信用卡，也不会真的创建账号。';
      if (planField) planField.hidden = false;
      if (authSubmit) authSubmit.textContent = '创建免费空间';
      var safePlan = ['免费版', '专业版', '团队版'].indexOf(plan) !== -1 ? plan : '免费版';
      if (authPlan) authPlan.value = safePlan;
    }

    authModal.classList.add('is-open');
    authModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    window.setTimeout(function () {
      if (authEmail) authEmail.focus();
    }, 180);
  }

  function closeAuth() {
    if (!authModal) return;
    authModal.classList.remove('is-open');
    authModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (authLastFocus && document.contains(authLastFocus)) authLastFocus.focus();
    authLastFocus = null;
  }

  $$('[data-open-auth]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (mobileMenu && mobileMenu.classList.contains('is-open')) setMobileMenu(false);
      openAuth(button.getAttribute('data-open-auth') || 'trial', button.getAttribute('data-plan'));
    });
  });

  var loginBtn = $('#loginBtn');
  var mobileLoginBtn = $('#mobileLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', function () { openAuth('login'); });
  if (mobileLoginBtn) {
    mobileLoginBtn.addEventListener('click', function () {
      setMobileMenu(false);
      openAuth('login');
    });
  }

  $$('[data-close-auth]').forEach(function (button) {
    button.addEventListener('click', closeAuth);
  });

  if (authEmail) {
    authEmail.addEventListener('input', function () {
      setFieldError(authEmail, authEmailError, authEmail.closest('.field'), '');
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = authEmail ? authEmail.value.trim() : '';
      if (!emailPattern.test(email)) {
        setFieldError(authEmail, authEmailError, authEmail.closest('.field'), email ? '请填写有效的邮箱地址。' : '请填写工作邮箱。');
        if (authEmail) authEmail.focus();
        return;
      }
      setFieldError(authEmail, authEmailError, authEmail.closest('.field'), '');
      if (authFormView) authFormView.hidden = true;
      if (authSuccess) authSuccess.hidden = false;
      showToast('演示完成，未创建真实账号。');
      window.setTimeout(function () {
        var closeButton = $('[data-close-auth]', authSuccess);
        if (closeButton) closeButton.focus();
      }, 100);
    });
  }

  if (authModal) {
    authModal.addEventListener('click', function (event) {
      if (event.target === authModal) closeAuth();
    });
  }

  /* =======================================================
     最终行动号召表单
     ======================================================= */
  var ctaForm = $('#ctaForm');
  var ctaEmail = $('#ctaEmail');
  var ctaError = $('#ctaError');
  var ctaSuccess = $('#ctaSuccess');
  var successEmail = $('#successEmail');
  var resetCta = $('#resetCta');

  if (ctaEmail) {
    ctaEmail.addEventListener('input', function () {
      if (ctaError) ctaError.textContent = '';
      ctaEmail.setAttribute('aria-invalid', 'false');
    });
  }

  if (ctaForm) {
    ctaForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var email = ctaEmail ? ctaEmail.value.trim() : '';
      if (!emailPattern.test(email)) {
        if (ctaError) ctaError.textContent = email ? '请填写有效的邮箱地址，例如 you@example.com。' : '请填写工作邮箱。';
        if (ctaEmail) {
          ctaEmail.setAttribute('aria-invalid', 'true');
          ctaEmail.focus();
        }
        return;
      }
      if (ctaError) ctaError.textContent = '';
      if (successEmail) successEmail.textContent = email;
      ctaForm.hidden = true;
      if (ctaSuccess) ctaSuccess.hidden = false;
      showToast('演示注册成功，未发送真实邮件。');
      window.setTimeout(function () {
        if (resetCta) resetCta.focus();
      }, 100);
    });
  }

  if (resetCta) {
    resetCta.addEventListener('click', function () {
      if (ctaSuccess) ctaSuccess.hidden = true;
      if (ctaForm) ctaForm.hidden = false;
      if (ctaEmail) {
        ctaEmail.value = '';
        ctaEmail.focus();
      }
      if (ctaError) ctaError.textContent = '';
    });
  }

  /* =======================================================
     价格对比展开
     ======================================================= */
  var compareToggle = $('#compareToggle');
  var comparePanel = $('#comparePanel');

  if (compareToggle && comparePanel) {
    compareToggle.addEventListener('click', function () {
      var open = !comparePanel.classList.contains('is-open');
      comparePanel.classList.toggle('is-open', open);
      comparePanel.setAttribute('aria-hidden', String(!open));
      compareToggle.setAttribute('aria-expanded', String(open));
      if (compareToggle.firstChild) {
        compareToggle.firstChild.nodeValue = open ? '收起完整功能对比 ' : '查看完整功能对比 ';
      }
    });
  }

  /* =======================================================
     常见问题手风琴
     ======================================================= */
  var faqItems = $$('.faq-item');

  function setFaqItem(item, open) {
    var button = $('.faq-question', item);
    item.classList.toggle('is-open', open);
    if (button) button.setAttribute('aria-expanded', String(open));
  }

  faqItems.forEach(function (item) {
    var button = $('.faq-question', item);
    if (!button) return;
    button.addEventListener('click', function () {
      var willOpen = !item.classList.contains('is-open');
      faqItems.forEach(function (other) { setFaqItem(other, false); });
      setFaqItem(item, willOpen);
    });
  });

  /* ---------- 演示占位链接 ---------- */
  $$('[data-demo]').forEach(function (button) {
    button.addEventListener('click', function () {
      showToast(button.getAttribute('data-demo') || '这是官网演示功能。');
    });
  });

  /* =======================================================
     键盘操作与焦点管理
     ======================================================= */
  function getFocusable(container) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.getClientRects().length > 0; });
  }

  function trapFocus(event, container) {
    if (event.key !== 'Tab' || !container) return;
    var focusable = getFocusable(container);
    if (!focusable.length) {
      event.preventDefault();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (authModal && authModal.classList.contains('is-open')) {
        closeAuth();
        return;
      }
      if (taskDrawer && taskDrawer.classList.contains('is-open')) {
        closeTaskDrawer();
        return;
      }
      if (mobileMenu && mobileMenu.classList.contains('is-open')) {
        setMobileMenu(false);
        if (menuToggle) menuToggle.focus();
        return;
      }
    }

    if (authModal && authModal.classList.contains('is-open')) {
      trapFocus(event, $('.modal-card', authModal));
      return;
    }
    if (taskDrawer && taskDrawer.classList.contains('is-open')) {
      trapFocus(event, taskDrawer);
    }
  });

  /* ---------- 页面初始化完成 ---------- */
  updateFeatureTaskProgress();
  setWorkspaceView('board');
  renderWorkspace();

})();
