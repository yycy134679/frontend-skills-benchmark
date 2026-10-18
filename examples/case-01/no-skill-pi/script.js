/* =========================================================
   寻常科技 · 加入我们
   页面交互
   ========================================================= */

'use strict';

document.documentElement.classList.add('js');

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- 轻提示 ---------- */
const toast = $('#toast');
let toastTimer = null;

function showToast(message) {
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3000);
}

/* ---------- 顶部滚动状态与进度 ---------- */
const header = $('#siteHeader');
const progressBar = $('#scrollProgress');
let scrollTicking = false;

function updateScrollUI() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;

  if (header) {
    header.classList.toggle('is-scrolled', scrollTop > 14);
  }

  if (progressBar) {
    const progress = scrollable > 0 ? Math.min(scrollTop / scrollable, 1) : 0;
    progressBar.style.transform = `scaleX(${progress})`;
  }

  scrollTicking = false;
}

function requestScrollUpdate() {
  if (!scrollTicking) {
    window.requestAnimationFrame(updateScrollUI);
    scrollTicking = true;
  }
}

window.addEventListener('scroll', requestScrollUpdate, { passive: true });
window.addEventListener('resize', requestScrollUpdate);
updateScrollUI();

/* ---------- 移动端菜单 ---------- */
const menuToggle = $('#menuToggle');
const mainNav = $('#mainNav');

function closeMenu() {
  if (!menuToggle || !mainNav) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '打开菜单');
  mainNav.classList.remove('is-open');
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? '打开菜单' : '关闭菜单');
    mainNav.classList.toggle('is-open', !isOpen);
  });

  $$('.nav-link', mainNav).forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('click', (event) => {
    if (!mainNav.classList.contains('is-open')) return;
    if (!mainNav.contains(event.target) && !menuToggle.contains(event.target)) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });
}

/* ---------- 导航当前章节 ---------- */
const navLinks = $$('.nav-link');
const navSections = navLinks
  .map((link) => {
    const id = link.getAttribute('href');
    return id && id.startsWith('#') ? $(id) : null;
  })
  .filter(Boolean);

if ('IntersectionObserver' in window && navSections.length) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: '-32% 0px -58% 0px', threshold: 0 }
  );

  navSections.forEach((section) => navObserver.observe(section));
}

/* ---------- 滚动出现 ---------- */
const revealItems = $$('.reveal');

if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

/* ---------- 首屏今日清单 ---------- */
const heroTasks = $$('[data-task]');
const taskCount = $('#taskCount');
let allTasksAnnounced = false;

function updateTaskCount() {
  if (!taskCount) return;
  const done = heroTasks.filter((task) => task.classList.contains('is-done')).length;
  taskCount.textContent = `${done} / ${heroTasks.length}`;

  if (done === heroTasks.length && !allTasksAnnounced) {
    allTasksAnnounced = true;
    showToast('今天的三件事，完成了。去散个步吧。');
  }

  if (done < heroTasks.length) allTasksAnnounced = false;
}

heroTasks.forEach((task) => {
  task.setAttribute('aria-pressed', String(task.classList.contains('is-done')));
  task.addEventListener('click', () => {
    task.classList.toggle('is-done');
    task.setAttribute('aria-pressed', String(task.classList.contains('is-done')));
    updateTaskCount();
  });
});

updateTaskCount();

/* ---------- 产品能力切换 ---------- */
const productTabs = $$('.product-tab');
const productPanels = $$('.product-panel');

function activateProductTab(tab, moveFocus = false) {
  if (!tab) return;

  productTabs.forEach((item) => {
    const selected = item === tab;
    item.classList.toggle('is-active', selected);
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
  });

  productPanels.forEach((panel) => {
    const selected = panel.id === tab.getAttribute('aria-controls');
    panel.hidden = !selected;
    panel.classList.toggle('is-active', selected);
  });

  if (moveFocus) tab.focus();
}

productTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateProductTab(tab));

  tab.addEventListener('keydown', (event) => {
    let nextIndex = index;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % productTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + productTabs.length) % productTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = productTabs.length - 1;

    if (nextIndex !== index) {
      event.preventDefault();
      activateProductTab(productTabs[nextIndex], true);
    }
  });
});

/* ---------- 岗位筛选与展开 ---------- */
const jobCards = $$('.job-card');
const filterButtons = $$('.filter-button');

function setJobPanelState(card, open) {
  const trigger = $('.job-trigger', card);
  const panel = $('.job-panel', card);
  if (!trigger || !panel) return;

  card.classList.toggle('is-open', open);
  trigger.setAttribute('aria-expanded', String(open));
  panel.setAttribute('aria-hidden', String(!open));

  // 收起时让内部按钮不可聚焦，避免键盘跳过隐藏内容
  panel.inert = !open;
}

function closeAllJobs(except = null) {
  jobCards.forEach((card) => {
    if (card !== except) setJobPanelState(card, false);
  });
}

jobCards.forEach((card) => {
  const trigger = $('.job-trigger', card);
  const panel = $('.job-panel', card);
  if (!trigger || !panel) return;

  setJobPanelState(card, false);

  trigger.addEventListener('click', () => {
    const willOpen = !card.classList.contains('is-open');
    closeAllJobs(card);
    setJobPanelState(card, willOpen);
  });
});

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter || 'all';
    let visibleCount = 0;

    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });

    closeAllJobs();

    jobCards.forEach((card) => {
      const matches = filter === 'all' || card.dataset.category === filter;
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    const label = button.childNodes[0] ? button.childNodes[0].textContent.trim() : '岗位';
    showToast(`已显示${label} · ${String(visibleCount).padStart(2, '0')} 个机会`);
  });
});

/* ---------- 投递弹窗 ---------- */
const applyModal = $('#applyModal');
const modalDialog = $('#modalDialog');
const modalFormView = $('#modalFormView');
const modalSuccess = $('#modalSuccess');
const modalRole = $('#modalRole');
const modalClose = $('#modalClose');
const successClose = $('#successClose');
const applyForm = $('#applyForm');
const applyName = $('#applyName');
const applyEmail = $('#applyEmail');
const applyLink = $('#applyLink');
const applyMessage = $('#applyMessage');
const applyConsent = $('#applyConsent');
const nameError = $('#nameError');
const emailError = $('#emailError');
const messageError = $('#messageError');
const consentError = $('#consentError');
const successText = $('#successText');
const submitButton = $('.form-submit', applyForm);
const submitText = submitButton ? $('span', submitButton) : null;

let lastFocusedElement = null;
let submitTimer = null;
let isSubmitting = false;

function setFieldError(input, errorElement) {
  if (input) {
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    if (errorElement && errorElement.id) input.setAttribute('aria-describedby', errorElement.id);
  }
  if (errorElement) errorElement.classList.add('is-visible');
}

function clearFieldError(input, errorElement) {
  if (input) {
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    if (errorElement && errorElement.id) input.removeAttribute('aria-describedby');
  }
  if (errorElement) errorElement.classList.remove('is-visible');
}

function clearAllFormErrors() {
  clearFieldError(applyName, nameError);
  clearFieldError(applyEmail, emailError);
  clearFieldError(applyMessage, messageError);
  if (consentError) consentError.classList.remove('is-visible');
}

function resetApplyForm() {
  if (!applyForm) return;
  window.clearTimeout(submitTimer);
  isSubmitting = false;
  applyForm.reset();
  clearAllFormErrors();

  if (submitButton) submitButton.disabled = false;
  if (submitText) submitText.textContent = '发出这封信';
}

function resetModalContent() {
  resetApplyForm();
  if (modalFormView) modalFormView.hidden = false;
  if (modalSuccess) modalSuccess.hidden = true;
  if (modalDialog) modalDialog.scrollTop = 0;
}

function openApplyModal(role, trigger) {
  if (!applyModal) return;

  lastFocusedElement = trigger || document.activeElement;
  resetModalContent();
  if (modalRole) modalRole.textContent = role || '寻常科技';

  applyModal.classList.add('is-open');
  applyModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  window.setTimeout(() => {
    if (modalDialog) modalDialog.focus();
  }, 80);
}

function closeApplyModal() {
  if (!applyModal || !applyModal.classList.contains('is-open')) return;

  window.clearTimeout(submitTimer);
  isSubmitting = false;
  if (submitButton) submitButton.disabled = false;
  if (submitText) submitText.textContent = '发出这封信';

  applyModal.classList.remove('is-open');
  applyModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  window.setTimeout(() => {
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus({ preventScroll: true });
    }
  }, 80);
}

$$('.job-apply').forEach((button) => {
  button.addEventListener('click', () => {
    openApplyModal(button.dataset.role, button);
  });
});

if (modalClose) modalClose.addEventListener('click', closeApplyModal);
if (successClose) successClose.addEventListener('click', closeApplyModal);

$$('[data-close-modal]').forEach((backdrop) => {
  backdrop.addEventListener('click', closeApplyModal);
});

if (applyForm) {
  [
    [applyName, nameError],
    [applyEmail, emailError],
    [applyMessage, messageError]
  ].forEach(([input, error]) => {
    if (!input) return;
    input.addEventListener('input', () => clearFieldError(input, error));
  });

  if (applyConsent) {
    applyConsent.addEventListener('change', () => {
      if (consentError) consentError.classList.remove('is-visible');
    });
  }

  applyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const name = applyName ? applyName.value.trim() : '';
    const email = applyEmail ? applyEmail.value.trim() : '';
    const message = applyMessage ? applyMessage.value.trim() : '';
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    let firstInvalid = null;

    clearAllFormErrors();

    if (!name) {
      setFieldError(applyName, nameError);
      firstInvalid = firstInvalid || applyName;
    }

    if (!emailIsValid) {
      setFieldError(applyEmail, emailError);
      firstInvalid = firstInvalid || applyEmail;
    }

    if (!message) {
      setFieldError(applyMessage, messageError);
      firstInvalid = firstInvalid || applyMessage;
    }

    if (applyConsent && !applyConsent.checked) {
      if (consentError) consentError.classList.add('is-visible');
      firstInvalid = firstInvalid || applyConsent;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    isSubmitting = true;
    if (submitButton) submitButton.disabled = true;
    if (submitText) submitText.textContent = '正在寄出…';

    // 演示环境：延迟后展示成功状态，不发送任何数据
    submitTimer = window.setTimeout(() => {
      isSubmitting = false;
      if (submitButton) submitButton.disabled = false;
      if (submitText) submitText.textContent = '发出这封信';

      if (modalFormView) modalFormView.hidden = true;
      if (modalSuccess) modalSuccess.hidden = false;
      if (successText) {
        successText.textContent = `${name}，谢谢你愿意了解寻常。如果我们觉得彼此合适，会在 5 个工作日内写信给你。无论结果如何，都祝你今天过得清楚、自在。`;
      }
      if (applyForm) applyForm.reset();
      clearAllFormErrors();

      if (modalDialog) modalDialog.scrollTop = 0;
      if (successClose) successClose.focus();
    }, 760);
  });
}

/* 弹窗键盘操作：Esc 关闭，Tab 在弹窗内循环 */
document.addEventListener('keydown', (event) => {
  if (!applyModal || !applyModal.classList.contains('is-open')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closeApplyModal();
    return;
  }

  if (event.key !== 'Tab' || !modalDialog) return;

  const focusable = $$(
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    modalDialog
  ).filter((element) => !element.hidden && element.offsetParent !== null);

  if (!focusable.length) {
    event.preventDefault();
    modalDialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey && (active === first || active === modalDialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
});

/* 窗口尺寸变化时，同步更新滚动进度 */
window.addEventListener('load', requestScrollUpdate);
