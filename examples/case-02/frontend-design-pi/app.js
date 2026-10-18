/* ============================================================
   同频 · 页面交互
   只做演示：所有数据留在浏览器内存里，不发送请求。
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- 任务详情数据 ---------------- */

  var TASKS = {
    t1: {
      desc: "把客户在上次会议里提到的修改意见整理成首页文案。首屏要能直接看到价格入口，标题不改动。",
      thread: [
        {
          name: "林禾",
          initial: "禾",
          tone: "a1",
          text: "我先按“先说结果、再说过程”的顺序改一版，今天下午发在这里。"
        },
        {
          name: "陈宁",
          initial: "宁",
          tone: "a3",
          text: "价格入口记得放在首屏按钮旁边，客户上次特别提过。",
          file: "首页修改意见_v2.pdf"
        }
      ]
    },
    t2: {
      desc: "确认移动端导航的展开方式与层级，把结论写进设计稿说明，方便开发直接照着做。",
      thread: [
        {
          name: "陈宁",
          initial: "宁",
          tone: "a3",
          text: "窄屏下先收起“价格”和“评价”，只留一个菜单按钮，展开后按顺序排列。"
        },
        {
          name: "周远",
          initial: "远",
          tone: "a2",
          text: "可以，菜单里的“免费开始”保持整行宽度，手指更好点。"
        }
      ]
    },
    t3: {
      desc: "完成首页视觉第一版：首屏、功能说明、价格三个区块，先做桌面宽度，再补移动端。",
      thread: [
        {
          name: "周远",
          initial: "远",
          tone: "a2",
          text: "第一版已经放进文件里了，首屏右侧想放一个可以直接点的项目看板。"
        },
        {
          name: "林禾",
          initial: "禾",
          tone: "a1",
          text: "支持，看板比截图更能说明产品在做什么。卡片文字别太多。",
          file: "首页视觉_v1.fig"
        }
      ]
    },
    t4: {
      desc: "整理定价页的信息结构：三档价格、每档适用人群、包含内容，以及按月计费的说明放在哪里。",
      thread: [
        {
          name: "林禾",
          initial: "禾",
          tone: "a1",
          text: "我想把“专业版”放在中间并用深色，其他两档保持浅色。"
        },
        {
          name: "陈宁",
          initial: "宁",
          tone: "a3",
          text: "可以，中间那档加一句“多数小团队从这里开始”，比写“最受欢迎”更可信。"
        }
      ]
    },
    t5: {
      desc: "把客户在群里分散提出的修改意见收进任务，标出优先级，作为首页改版的依据。",
      thread: [
        {
          name: "陈宁",
          initial: "宁",
          tone: "a3",
          text: "一共 11 条，合并成 6 个任务了，重复的部分已经标出来。"
        },
        {
          name: "林禾",
          initial: "禾",
          tone: "a1",
          text: "收到，我先做首屏相关的那三条。"
        }
      ]
    },
    t6: {
      desc: "确定官网的信息架构：首屏、产品定位、核心功能、价格、用户评价、结尾行动区。",
      thread: [
        {
          name: "周远",
          initial: "远",
          tone: "a2",
          text: "功能部分按“任务、讨论、进展”三块展开，每块配一个界面小样。"
        },
        {
          name: "陈宁",
          initial: "宁",
          tone: "a3",
          text: "同意，价格放在功能之后，评价作为佐证。",
          file: "信息架构.png"
        }
      ]
    }
  };

  var taskEls = Array.prototype.slice.call(document.querySelectorAll(".task"));
  var board = document.querySelector(".board");
  var detail = document.getElementById("task-detail");
  var detailColumn = detail.querySelector("[data-detail-column]");
  var detailTitle = detail.querySelector("[data-detail-title]");
  var detailDesc = detail.querySelector("[data-detail-desc]");
  var detailOwner = detail.querySelector("[data-detail-owner]");
  var detailDue = detail.querySelector("[data-detail-due]");
  var detailPrio = detail.querySelector("[data-detail-prio]");
  var detailThread = detail.querySelector("[data-detail-thread]");
  var completeBtn = detail.querySelector("[data-complete]");
  var detailHint = detail.querySelector(".detail-hint");
  var closeDetailBtn = detail.querySelector("[data-close-detail]");
  var meter = document.querySelector("[data-meter]");
  var meterLabel = document.querySelector("[data-meter-label]");
  var activeTask = null;

  /* ---------------- 提示条 ---------------- */

  var toast = document.querySelector(".toast");
  var toastTimer = null;
  var toastHideTimer = null;

  function showToast(message) {
    window.clearTimeout(toastTimer);
    window.clearTimeout(toastHideTimer);
    toast.textContent = message;
    toast.hidden = false;
    window.requestAnimationFrame(function () {
      toast.classList.add("is-visible");
    });
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
      toastHideTimer = window.setTimeout(function () {
        toast.hidden = true;
      }, 240);
    }, 2600);
  }

  /* ---------------- 看板：计数与进度 ---------------- */

  function countTasks(col) {
    return col.querySelectorAll(".task").length;
  }

  function refreshBoard() {
    var cols = Array.prototype.slice.call(board.querySelectorAll(".col"));
    var total = 0;
    var done = 0;

    cols.forEach(function (col) {
      var count = countTasks(col);
      total += count;
      col.querySelector("[data-count]").textContent = String(count);
      if (col.getAttribute("data-column") === "已完成") {
        done = count;
      }
    });

    var percent = total ? Math.round((done / total) * 100) : 0;
    meter.style.width = percent + "%";
    meterLabel.textContent = done + " / " + total + " 项已完成";
    meter.setAttribute("aria-label", "项目完成进度：" + percent + "%");
  }

  function priorityOf(taskEl) {
    return taskEl.querySelector(".prio");
  }

  function columnOf(taskEl) {
    var col = taskEl.closest(".col");
    return col ? col.getAttribute("data-column") : "";
  }

  function ownerName(taskEl) {
    var avatar = taskEl.querySelector(".avatar");
    var names = { 禾: "林禾", 远: "周远", 宁: "陈宁" };
    return avatar ? names[avatar.textContent.trim()] || "" : "";
  }

  /* ---------------- 任务详情 ---------------- */

  function renderThread(items) {
    detailThread.innerHTML = "";
    items.forEach(function (item) {
      var wrap = document.createElement("div");
      wrap.className = "thread-msg";

      var avatar = document.createElement("span");
      avatar.className = "avatar xs " + item.tone;
      avatar.textContent = item.initial;

      var body = document.createElement("div");
      body.className = "thread-body";

      var name = document.createElement("span");
      name.className = "thread-name";
      name.textContent = item.name;

      var text = document.createElement("p");
      text.textContent = item.text;

      body.appendChild(name);
      body.appendChild(text);

      if (item.file) {
        var file = document.createElement("span");
        file.className = "thread-file";
        file.textContent = item.file;
        body.appendChild(file);
      }

      wrap.appendChild(avatar);
      wrap.appendChild(body);
      detailThread.appendChild(wrap);
    });
  }

  function syncCompleteButton(taskEl) {
    var done = taskEl.classList.contains("is-done");
    completeBtn.classList.toggle("btn-primary", !done);
    completeBtn.classList.toggle("btn-outline", done);
    completeBtn.textContent = done ? "重新打开任务" : "标记为完成";
    detailHint.textContent = done
      ? "这项任务已完成，3 位成员都能看到"
      : "完成状态会同步给 3 位成员";
  }

  function openDetail(taskEl) {
    var id = taskEl.getAttribute("data-task");
    var data = TASKS[id];
    if (!data) {
      return;
    }

    taskEls.forEach(function (item) {
      item.classList.toggle("is-active", item === taskEl);
    });
    activeTask = taskEl;

    detailColumn.textContent = columnOf(taskEl);
    detailTitle.textContent = taskEl.querySelector(".task-title").textContent;
    detailDesc.textContent = data.desc;
    detailOwner.textContent = ownerName(taskEl) || "未指派";
    detailDue.textContent = taskEl.querySelector(".task-due").textContent;
    detailPrio.textContent = priorityOf(taskEl).textContent;
    renderThread(data.thread);
    syncCompleteButton(taskEl);

    detail.hidden = false;

    // 窄屏时把详情滚动到可见位置，并尊重系统的减少动效设置
    if (window.matchMedia("(max-width: 620px)").matches) {
      var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      detail.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }
  }

  function closeDetail(restoreFocus) {
    if (detail.hidden) {
      return;
    }
    detail.hidden = true;
    taskEls.forEach(function (item) {
      item.classList.remove("is-active");
    });
    if (restoreFocus && activeTask) {
      activeTask.focus();
    }
    activeTask = null;
  }

  taskEls.forEach(function (taskEl) {
    taskEl.addEventListener("click", function () {
      openDetail(taskEl);
    });
  });

  closeDetailBtn.addEventListener("click", function () {
    closeDetail(true);
  });

  /* 完成任务：卡片移动到“已完成”，进度同步更新 */
  completeBtn.addEventListener("click", function () {
    if (!activeTask) {
      return;
    }

    var title = activeTask.querySelector(".task-title").textContent;
    var prio = priorityOf(activeTask);
    var doneCol = board.querySelector('[data-column="已完成"]');
    var doingCol = board.querySelector('[data-column="进行中"]');

    if (activeTask.classList.contains("is-done")) {
      activeTask.classList.remove("is-done");
      prio.className = "prio prio-mid";
      prio.textContent = "中";
      doingCol.appendChild(activeTask);
      detailColumn.textContent = "进行中";
      showToast("已重新打开「" + title + "」");
    } else {
      activeTask.classList.add("is-done");
      prio.className = "prio prio-done";
      prio.textContent = "完成";
      doneCol.appendChild(activeTask);
      detailColumn.textContent = "已完成";
      showToast("「" + title + "」已完成，3 位成员已同步");
    }

    syncCompleteButton(activeTask);
    detailPrio.textContent = prio.textContent;
    refreshBoard();
  });

  // 首屏进度条从 0 开始增长
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(refreshBoard);
  });

  /* ---------------- 卡点提醒 ---------------- */

  var remindBtn = document.querySelector("[data-remind]");
  if (remindBtn) {
    remindBtn.addEventListener("click", function () {
      if (remindBtn.disabled) {
        return;
      }
      remindBtn.disabled = true;
      remindBtn.textContent = "已提醒";
      showToast("已提醒林禾处理首页配图");
    });
  }

  /* ---------------- 试用弹窗 ---------------- */

  var modal = document.getElementById("signup");
  var formView = modal.querySelector("[data-signup-form-view]");
  var successView = modal.querySelector("[data-signup-success]");
  var form = document.getElementById("signup-form");
  var emailInput = document.getElementById("signup-email");
  var errorText = form.querySelector(".form-error");
  var planNameEls = modal.querySelectorAll("[data-plan-name]");
  var lastFocused = null;

  function setPlan(name) {
    Array.prototype.forEach.call(planNameEls, function (el) {
      el.textContent = name || "免费版";
    });
  }

  function resetForm() {
    form.reset();
    emailInput.removeAttribute("aria-invalid");
    errorText.hidden = true;
  }

  function openSignup(plan) {
    lastFocused = document.activeElement;
    // 移动端菜单开着时先收起，避免弹窗下面留着展开的导航
    if (!mobileNav.hidden) {
      closeMobileNav();
      lastFocused = navToggle;
    }
    setPlan(plan);
    formView.hidden = false;
    successView.hidden = true;
    modal.setAttribute("aria-labelledby", "signup-title");
    modal.setAttribute("aria-describedby", "signup-sub");
    resetForm();
    modal.hidden = false;
    document.body.style.overflow = "hidden";

    window.setTimeout(function () {
      emailInput.focus();
    }, 60);
  }

  function closeSignup() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  Array.prototype.forEach.call(
    document.querySelectorAll("[data-open-signup]"),
    function (btn) {
      btn.addEventListener("click", function () {
        openSignup(btn.getAttribute("data-plan"));
      });
    }
  );

  Array.prototype.forEach.call(
    document.querySelectorAll("[data-close-signup]"),
    function (btn) {
      btn.addEventListener("click", closeSignup);
    }
  );

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeSignup();
    }
  });

  // 让 Tab 键留在弹窗内部
  modal.addEventListener("keydown", function (event) {
    if (event.key !== "Tab") {
      return;
    }

    var focusables = Array.prototype.filter.call(
      modal.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      ),
      function (el) {
        return el.offsetParent !== null && !el.disabled;
      }
    );

    if (!focusables.length) {
      return;
    }

    var first = focusables[0];
    var last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  emailInput.addEventListener("input", function () {
    if (isValidEmail(emailInput.value.trim())) {
      emailInput.removeAttribute("aria-invalid");
      errorText.hidden = true;
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = emailInput.value.trim();

    if (!isValidEmail(value)) {
      emailInput.setAttribute("aria-invalid", "true");
      errorText.hidden = false;
      emailInput.focus();
      return;
    }

    emailInput.removeAttribute("aria-invalid");
    errorText.hidden = true;
    formView.hidden = true;
    successView.hidden = false;
    modal.setAttribute("aria-labelledby", "signup-success-title");
    modal.setAttribute("aria-describedby", "signup-success-sub");
    var title = successView.querySelector(".modal-title");
    if (title) {
      title.setAttribute("tabindex", "-1");
      title.focus();
    }
    showToast("演示空间已创建（仅本地演示）");
  });

  /* ---------------- 移动端导航 ---------------- */

  var navToggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  function closeMobileNav() {
    mobileNav.hidden = true;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.querySelector(".nav-toggle-text").textContent = "菜单";
  }

  navToggle.addEventListener("click", function () {
    var open = navToggle.getAttribute("aria-expanded") === "true";
    if (open) {
      closeMobileNav();
    } else {
      mobileNav.hidden = false;
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.querySelector(".nav-toggle-text").textContent = "关闭";
    }
  });

  Array.prototype.forEach.call(mobileNav.querySelectorAll("a"), function (link) {
    link.addEventListener("click", closeMobileNav);
  });

  /* ---------------- 键盘操作 ---------------- */

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      return;
    }
    if (!modal.hidden) {
      closeSignup();
    } else if (!detail.hidden) {
      closeDetail(true);
    } else if (!mobileNav.hidden) {
      closeMobileNav();
      navToggle.focus();
    }
  });

  // 视口变宽时收起移动端导航，避免状态残留
  window.addEventListener("resize", function () {
    if (window.innerWidth > 900 && !mobileNav.hidden) {
      closeMobileNav();
    }
  });
})();
