/* =========================================================
   林间 · 个人作品集
   交互：筛选、项目详情、复制邮箱、演示表单、移动端菜单
   ========================================================= */

(function () {
  'use strict';

  var EMAIL = 'linjian@example.com';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     作品数据
     --------------------------------------------------------- */
  var projects = {
    field: {
      title: '田野书店',
      kicker: '品牌视觉 · 2024',
      lede: '为一家关注文学、艺术与在地生活的独立书店，建立亲切、有辨识度的品牌形象。',
      background: '田野书店藏在城市边缘，选书围绕文学、艺术与在地生活。它不希望成为一座“网红打卡点”，而是想成为附近居民愿意反复走进来的地方。品牌需要保留这种亲近感，同时让人一眼记住。',
      scope: ['品牌标识与基础规范', '字体与色彩系统', '书签及活动海报', '品牌应用示意'],
      idea: '从书页与田野的关系出发：书页的层层叠叠，像被风翻动的田野。用简单的几何形与克制的绿色，把阅读与日常连接起来，让品牌既有泥土气，也有书卷气。',
      tags: ['品牌标识', '视觉系统', '印刷物']
    },
    sync: {
      title: '同频',
      kicker: '数字产品 · 2023',
      lede: '面向自由职业者与小型团队的项目协作工具，让任务、讨论和进度清楚地组织在一起。',
      background: '同频服务的是自由职业者与小型团队：人不多，但项目并行、信息散落。旧工具把任务、讨论和进度拆在不同地方，团队常常要花时间确认“现在到底该做什么”。',
      scope: ['信息架构梳理', '任务看板设计', '项目概览页面', '界面组件与规范'],
      idea: '减少信息噪声，把“当前需要关注的事”放在最显眼的位置。用克制的层级与状态色，让团队少一点寻找，多一点推进。',
      tags: ['信息架构', 'UI 设计', '设计系统']
    },
    cafe: {
      title: '慢日咖啡',
      kicker: '网站设计 · 2023',
      lede: '为社区咖啡店建立品牌官网，传达轻松的空间氛围，介绍咖啡与季节菜单。',
      background: '慢日咖啡是一家社区咖啡店，熟客比游客多。网站既要让人快速找到地址与营业时间，也要把店里那种“可以坐很久”的节奏带到屏幕上。',
      scope: ['品牌官网设计', '菜单展示', '移动端体验', '内容结构梳理'],
      idea: '把线下空间的节奏带到屏幕上：大图、留白与短句，让浏览像一次短暂的停留。菜单跟随季节更新，像店里那块手写的小黑板。',
      tags: ['响应式网站', '内容设计', '前端体验']
    },
    city: {
      title: '城市间隙',
      kicker: '编辑设计 · 2022',
      lede: '一本记录城市散步、街角店铺与日常细节的独立刊物。',
      background: '《城市间隙》记录城市散步、街角店铺与日常细节。它不追逐地标，而是把目光放在被忽略的缝隙里：一面旧墙、一扇半开的门、傍晚六点的公交站。',
      scope: ['封面设计', '内页排版', '图文编排', '印刷监制'],
      idea: '通过文字与图像的节奏，让被忽略的城市细节重新进入视野。版面像散步一样有快有慢：有时停下来读一段长文，有时只是一张照片和一行注脚。',
      tags: ['编辑设计', '字体排印', '印刷物']
    }
  };

  var projectOrder = ['field', 'sync', 'cafe', 'city'];

  /* ---------------------------------------------------------
     工具
     --------------------------------------------------------- */
  var toast = document.getElementById('toast');
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2600);
  }

  /* ---------------------------------------------------------
     顶部导航状态
     --------------------------------------------------------- */
  var header = document.getElementById('site-header');

  function updateHeader() {
    if (header) {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    }
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  /* ---------------------------------------------------------
     移动端菜单
     --------------------------------------------------------- */
  var menuToggle = document.getElementById('menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');
  var menuCloseTimer = null;

  function setMenuLabel(isOpen) {
    if (!menuToggle) return;
    var label = menuToggle.querySelector('.sr-only');
    if (label) label.textContent = isOpen ? '关闭菜单' : '打开菜单';
  }

  function openMenu() {
    if (!menuToggle || !mobileMenu) return;
    window.clearTimeout(menuCloseTimer);
    mobileMenu.hidden = false;
    document.documentElement.classList.add('is-locked');
    menuToggle.setAttribute('aria-expanded', 'true');
    setMenuLabel(true);
    window.requestAnimationFrame(function () {
      mobileMenu.classList.add('is-open');
    });
  }

  function closeMenu(returnFocus) {
    if (!menuToggle || !mobileMenu) return;
    mobileMenu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    setMenuLabel(false);
    window.clearTimeout(menuCloseTimer);
    menuCloseTimer = window.setTimeout(function () {
      mobileMenu.hidden = true;
      document.documentElement.classList.remove('is-locked');
      if (returnFocus) menuToggle.focus();
    }, 300);
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function () {
      if (menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu(true);
      } else {
        openMenu();
      }
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) === '#') {
          event.preventDefault();
          var target = document.querySelector(href);
          closeMenu(false);
          if (target) {
            window.setTimeout(function () {
              target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            }, 320);
          }
        } else {
          closeMenu(false);
        }
      });
    });

    window.matchMedia('(min-width: 901px)').addEventListener('change', function (event) {
      if (event.matches && menuToggle.getAttribute('aria-expanded') === 'true') {
        closeMenu(false);
      }
    });
  }

  /* ---------------------------------------------------------
     滚动入场
     --------------------------------------------------------- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  }

  /* ---------------------------------------------------------
     导航高亮
     --------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('[data-nav]'));

  if ('IntersectionObserver' in window && navLinks.length) {
    var sectionMap = [];
    navLinks.forEach(function (link) {
      var section = document.querySelector(link.getAttribute('href'));
      if (section) sectionMap.push({ link: link, section: section });
    });

    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionMap.forEach(function (item) {
          item.link.removeAttribute('aria-current');
        });
        var active = sectionMap.find(function (item) {
          return item.section === entry.target;
        });
        if (active) active.link.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-42% 0px -50% 0px', threshold: 0 });

    sectionMap.forEach(function (item) {
      spyObserver.observe(item.section);
    });
  }

  /* ---------------------------------------------------------
     作品筛选
     --------------------------------------------------------- */
  var filters = Array.prototype.slice.call(document.querySelectorAll('.filter'));
  var workCards = Array.prototype.slice.call(document.querySelectorAll('.work-card'));
  var filterStatus = document.getElementById('filter-status');
  var worksGrid = document.getElementById('works-grid');

  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.getAttribute('data-filter');
      var visibleCount = 0;

      filters.forEach(function (item) {
        var active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      workCards.forEach(function (card) {
        var show = filter === 'all' || card.getAttribute('data-type') === filter;
        card.hidden = !show;
        if (show) visibleCount += 1;
      });

      if (worksGrid) {
        worksGrid.classList.toggle('is-filtered', filter !== 'all');
      }

      if (filterStatus) {
        filterStatus.textContent = '共 ' + visibleCount + ' 个项目';
      }
    });
  });

  /* ---------------------------------------------------------
     项目详情弹窗
     --------------------------------------------------------- */
  var modal = document.getElementById('project-modal');
  var modalPanel = modal ? modal.querySelector('.modal-panel') : null;
  var modalScroll = document.getElementById('modal-scroll');
  var modalVisual = document.getElementById('modal-visual');
  var modalKicker = document.getElementById('modal-kicker');
  var modalTitle = document.getElementById('modal-title');
  var modalLede = document.getElementById('modal-lede');
  var modalBg = document.getElementById('modal-bg');
  var modalScope = document.getElementById('modal-scope');
  var modalIdea = document.getElementById('modal-idea');
  var modalTags = document.getElementById('modal-tags');
  var modalPrev = document.getElementById('modal-prev');
  var modalNext = document.getElementById('modal-next');
  var modalClose = modal ? modal.querySelector('.modal-close') : null;

  var activeProject = 'field';
  var lastFocused = null;
  var closeTimer = null;
  var modalOpen = false;

  function findCard(projectId) {
    return document.querySelector('.work-hit[data-project="' + projectId + '"]');
  }

  function renderProject(projectId) {
    var project = projects[projectId];
    if (!project) return;

    activeProject = projectId;

    if (modalKicker) modalKicker.textContent = project.kicker;
    if (modalTitle) modalTitle.textContent = project.title;
    if (modalLede) modalLede.textContent = project.lede;
    if (modalBg) modalBg.textContent = project.background;
    if (modalIdea) modalIdea.textContent = project.idea;

    if (modalScope) {
      modalScope.innerHTML = '';
      project.scope.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        modalScope.appendChild(li);
      });
    }

    if (modalTags) {
      modalTags.innerHTML = '';
      project.tags.forEach(function (tag) {
        var span = document.createElement('span');
        span.textContent = tag;
        modalTags.appendChild(span);
      });
    }

    if (modalVisual) {
      modalVisual.innerHTML = '';
      var cardButton = findCard(projectId);
      var card = cardButton ? cardButton.closest('.work-card') : null;
      var art = card ? card.querySelector('.art') : null;
      if (art) {
        modalVisual.appendChild(art.cloneNode(true));
      }
    }

    var index = projectOrder.indexOf(projectId);
    var prevId = projectOrder[(index - 1 + projectOrder.length) % projectOrder.length];
    var nextId = projectOrder[(index + 1) % projectOrder.length];

    if (modalPrev) {
      modalPrev.setAttribute('aria-label', '查看上一个项目：' + projects[prevId].title);
    }
    if (modalNext) {
      modalNext.setAttribute('aria-label', '查看下一个项目：' + projects[nextId].title);
    }
  }

  function openProject(projectId) {
    if (!modal) return;

    window.clearTimeout(closeTimer);
    lastFocused = document.activeElement;
    renderProject(projectId);

    modal.hidden = false;
    document.documentElement.classList.add('is-locked');
    modalOpen = true;

    window.requestAnimationFrame(function () {
      modal.classList.add('is-open');
      if (modalClose) modalClose.focus({ preventScroll: true });
    });

    if (modalScroll) modalScroll.scrollTop = 0;
  }

  function closeProject() {
    if (!modal || !modalOpen) return;

    modalOpen = false;
    modal.classList.remove('is-open');
    window.clearTimeout(closeTimer);

    closeTimer = window.setTimeout(function () {
      modal.hidden = true;
      document.documentElement.classList.remove('is-locked');
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus({ preventScroll: true });
      }
    }, 340);
  }

  if (modal) {
    document.querySelectorAll('.work-hit').forEach(function (button) {
      button.addEventListener('click', function () {
        openProject(button.getAttribute('data-project'));
      });
    });

    modal.querySelectorAll('[data-modal-close]').forEach(function (button) {
      button.addEventListener('click', closeProject);
    });

    if (modalPrev) {
      modalPrev.addEventListener('click', function () {
        var index = projectOrder.indexOf(activeProject);
        var prev = projectOrder[(index - 1 + projectOrder.length) % projectOrder.length];
        renderProject(prev);
        if (modalScroll) modalScroll.scrollTop = 0;
        if (modalClose) modalClose.focus({ preventScroll: true });
      });
    }

    if (modalNext) {
      modalNext.addEventListener('click', function () {
        var index = projectOrder.indexOf(activeProject);
        var next = projectOrder[(index + 1) % projectOrder.length];
        renderProject(next);
        if (modalScroll) modalScroll.scrollTop = 0;
        if (modalClose) modalClose.focus({ preventScroll: true });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (!modalOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeProject();
        return;
      }

      if (event.key !== 'Tab' || !modalPanel) return;

      var focusable = modalPanel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* Esc 同时关闭移动端菜单 */
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menuToggle && menuToggle.getAttribute('aria-expanded') === 'true') {
      closeMenu(true);
    }
  });

  /* ---------------------------------------------------------
     复制邮箱
     --------------------------------------------------------- */
  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();

    var success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      success = false;
    }

    document.body.removeChild(area);
    return success;
  }

  function copyEmail() {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(EMAIL).then(function () {
        showToast('邮箱已复制：' + EMAIL);
      }).catch(function () {
        var ok = fallbackCopy(EMAIL);
        showToast(ok ? '邮箱已复制：' + EMAIL : '请手动复制：' + EMAIL);
      });
    } else {
      var ok = fallbackCopy(EMAIL);
      showToast(ok ? '邮箱已复制：' + EMAIL : '请手动复制：' + EMAIL);
    }
  }

  document.querySelectorAll('[data-copy-email]').forEach(function (button) {
    button.addEventListener('click', copyEmail);
  });

  /* ---------------------------------------------------------
     演示联系表单
     --------------------------------------------------------- */
  var form = document.getElementById('contact-form');
  var formSuccess = document.getElementById('form-success');
  var formAgain = document.getElementById('form-again');

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var submit = form.querySelector('[type="submit"]');
      var original = submit ? submit.innerHTML : '';
      if (submit) {
        submit.disabled = true;
        submit.innerHTML = '<span>正在发送…</span><span aria-hidden="true">·</span>';
      }

      window.setTimeout(function () {
        if (submit) {
          submit.disabled = false;
          submit.innerHTML = original;
        }
        if (formSuccess) formSuccess.hidden = false;
        form.classList.add('is-sent');
        form.reset();
      }, 850);
    });
  }

  if (formAgain) {
    formAgain.addEventListener('click', function () {
      if (!form) return;
      form.classList.remove('is-sent');
      if (formSuccess) formSuccess.hidden = true;
      form.reset();
      var firstField = form.querySelector('input');
      if (firstField) firstField.focus();
    });
  }

  /* ---------------------------------------------------------
     页脚年份
     --------------------------------------------------------- */
  var year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
