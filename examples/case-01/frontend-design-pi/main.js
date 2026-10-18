/* ==========================================================
   寻常科技 · 加入我们
   这里只处理页面演示需要的行为，不依赖任何外部资源。
   ========================================================== */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- 日期与年份 ---------- */

  var today = new Date();
  var weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  var deskDate = document.getElementById("desk-date");

  if (deskDate) {
    deskDate.textContent =
      (today.getMonth() + 1) + " 月 " + today.getDate() + " 日，" + weekdays[today.getDay()];
  }

  var year = document.getElementById("year");
  if (year) {
    year.textContent = String(today.getFullYear());
  }

  /* ---------- 移动端导航 ---------- */

  var menuToggle = document.getElementById("menu-toggle");
  var mobileMenu = document.getElementById("mobile-menu");
  var menuLabel = menuToggle ? menuToggle.querySelector(".sr-only") : null;

  function setMenu(open) {
    if (!menuToggle || !mobileMenu) return;
    menuToggle.setAttribute("aria-expanded", String(open));
    mobileMenu.hidden = !open;
    if (menuLabel) {
      menuLabel.textContent = open ? "关闭导航菜单" : "打开导航菜单";
    }
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function () {
      setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
    });

    mobileMenu.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenu(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuToggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (menuToggle.getAttribute("aria-expanded") !== "true") return;
      if (!event.target.closest(".site-header")) {
        setMenu(false);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) {
        setMenu(false);
      }
    });
  }

  /* ---------- 岗位切换 ---------- */

  var roleTabs = Array.prototype.slice.call(document.querySelectorAll(".role-tab"));
  var rolePanels = Array.prototype.slice.call(document.querySelectorAll(".role-panel"));

  function selectRole(key) {
    roleTabs.forEach(function (tab) {
      var active = tab.getAttribute("data-role") === key;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });

    rolePanels.forEach(function (panel) {
      var active = panel.getAttribute("data-panel") === key;
      panel.hidden = !active;
    });
  }

  roleTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      selectRole(tab.getAttribute("data-role"));
    });
  });

  /* ---------- 首屏演示：把三件小事各归其位 ---------- */

  var sortButton = document.getElementById("sort-button");
  var deskStatus = document.getElementById("desk-status");
  var inbox = document.getElementById("inbox");
  var inboxEmpty = document.getElementById("inbox-empty");
  var fragments = Array.prototype.slice.call(document.querySelectorAll(".fragment"));
  var isSorted = false;
  var isBusy = false;

  function moveWithFlip(cards, move) {
    if (reducedMotion.matches) {
      move();
      return;
    }

    var firstRects = new Map();
    cards.forEach(function (card) {
      firstRects.set(card, card.getBoundingClientRect());
    });

    move();

    cards.forEach(function (card, index) {
      var first = firstRects.get(card);
      var last = card.getBoundingClientRect();
      var deltaX = first.left - last.left;
      var deltaY = first.top - last.top;

      if (!deltaX && !deltaY) return;

      card.animate(
        [
          { transform: "translate(" + deltaX + "px, " + deltaY + "px)" },
          { transform: "translate(0, 0)" }
        ],
        {
          duration: 520,
          delay: index * 70,
          easing: "cubic-bezier(.2, .8, .2, 1)",
          fill: "backwards"
        }
      );
    });
  }

  function finishBusy(delay) {
    window.setTimeout(function () {
      isBusy = false;
      if (sortButton) sortButton.disabled = false;
    }, delay);
  }

  function sortFragments() {
    moveWithFlip(fragments, function () {
      fragments.forEach(function (card) {
        var targetId = card.getAttribute("data-target");
        var target = targetId ? document.getElementById(targetId) : null;
        if (!target) return;
        target.appendChild(card);
        card.classList.add("is-settled");
      });
      if (inboxEmpty) inboxEmpty.hidden = false;
    });

    isSorted = true;
    if (sortButton) sortButton.textContent = "重新开始";
    if (deskStatus) {
      deskStatus.textContent = "已经理好：1 则笔记、1 个任务、1 个日程。";
    }
    finishBusy(reducedMotion.matches ? 30 : 820);
  }

  function resetFragments() {
    moveWithFlip(fragments, function () {
      fragments.forEach(function (card) {
        if (!inbox) return;
        inbox.appendChild(card);
        card.classList.remove("is-settled");
      });
      if (inboxEmpty) inboxEmpty.hidden = true;
    });

    isSorted = false;
    if (sortButton) sortButton.textContent = "帮我理一理";
    if (deskStatus) {
      deskStatus.textContent = "三件小事，各归其位。";
    }
    finishBusy(reducedMotion.matches ? 30 : 820);
  }

  if (sortButton) {
    sortButton.addEventListener("click", function () {
      if (isBusy) return;
      isBusy = true;
      sortButton.disabled = true;

      if (isSorted) {
        resetFragments();
      } else {
        sortFragments();
      }
    });
  }

  /* ---------- 申请对话框 ---------- */

  var dialog = document.getElementById("apply-dialog");
  var dialogClose = document.getElementById("dialog-close");
  var applyForm = document.getElementById("apply-form");
  var applyTitle = document.getElementById("apply-title");
  var applyRole = document.getElementById("apply-role");
  var applySuccess = document.getElementById("apply-success");
  var successClose = document.getElementById("success-close");
  var formError = document.getElementById("form-error");
  var nameInput = document.getElementById("apply-name");
  var contactInput = document.getElementById("apply-contact");
  var lastTrigger = null;

  function clearFormError() {
    if (!formError) return;
    formError.hidden = true;
    formError.textContent = "";
    if (nameInput) {
      nameInput.removeAttribute("aria-invalid");
      nameInput.removeAttribute("aria-describedby");
    }
    if (contactInput) {
      contactInput.removeAttribute("aria-invalid");
      contactInput.removeAttribute("aria-describedby");
    }
  }

  function openApply(roleName) {
    if (!dialog || !applyForm || !applySuccess || !applyTitle) return;

    lastTrigger = document.activeElement;
    applyForm.reset();
    applyForm.hidden = false;
    applySuccess.hidden = true;
    clearFormError();

    if (applyRole) {
      var optionExists = roleName && Array.prototype.some.call(
        applyRole.options,
        function (option) { return option.value === roleName; }
      );
      applyRole.value = optionExists ? roleName : "先聊聊";
    }

    applyTitle.textContent = roleName ? "投递「" + roleName + "」" : "先聊聊你想做的事";

    if (!dialog.open) {
      dialog.showModal();
    }
    document.body.classList.add("is-dialog-open");

    window.setTimeout(function () {
      if (nameInput) nameInput.focus();
    }, 60);
  }

  function closeApply() {
    if (dialog && dialog.open) {
      dialog.close();
    }
  }

  document.querySelectorAll(".js-apply").forEach(function (button) {
    button.addEventListener("click", function () {
      var roleName = button.getAttribute("data-role") || "";
      openApply(roleName);
    });
  });

  if (dialogClose) {
    dialogClose.addEventListener("click", closeApply);
  }

  if (successClose) {
    successClose.addEventListener("click", closeApply);
  }

  if (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) {
        closeApply();
      }
    });

    dialog.addEventListener("close", function () {
      document.body.classList.remove("is-dialog-open");
      if (lastTrigger && typeof lastTrigger.focus === "function") {
        lastTrigger.focus();
      }
    });
  }

  if (applyForm) {
    applyForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!applyForm || !applySuccess) return;

      var name = nameInput ? nameInput.value.trim() : "";
      var contact = contactInput ? contactInput.value.trim() : "";
      var errorText = "";

      if (!name && !contact) {
        errorText = "请先写下称呼，以及能联系到你的邮箱或微信。";
      } else if (!name) {
        errorText = "请写下怎么称呼你。";
      } else if (!contact) {
        errorText = "请留下邮箱或微信，方便我们回复你。";
      }

      if (errorText) {
        if (formError) {
          formError.textContent = errorText;
          formError.hidden = false;
        }
        if (!name && nameInput) {
          nameInput.setAttribute("aria-invalid", "true");
          nameInput.setAttribute("aria-describedby", "form-error");
          nameInput.focus();
        } else if (contactInput) {
          contactInput.setAttribute("aria-invalid", "true");
          contactInput.setAttribute("aria-describedby", "form-error");
          contactInput.focus();
        }
        return;
      }

      clearFormError();
      applyForm.hidden = true;
      applySuccess.hidden = false;

      var successHeading = applySuccess.querySelector("h3");
      if (successHeading) {
        successHeading.setAttribute("tabindex", "-1");
        successHeading.focus();
      }
    });
  }

  if (nameInput) {
    nameInput.addEventListener("input", clearFormError);
  }

  if (contactInput) {
    contactInput.addEventListener("input", clearFormError);
  }
})();
