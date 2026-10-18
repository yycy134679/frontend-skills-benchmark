/* ============================================================
   林间 · 个人作品集
   交互：导航、首屏线条、作品筛选、册页弹窗、复制邮箱、邮件草稿
   ============================================================ */

(function () {
  "use strict";

  const doc = document.documentElement;
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = reduceQuery.matches;

  /* ---------- 年份 ---------- */
  const yearNode = document.getElementById("year");
  if (yearNode) yearNode.textContent = String(new Date().getFullYear());

  /* ---------- 手机菜单 ---------- */
  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!menuToggle || !siteNav) return;
    siteNav.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    doc.classList.toggle("menu-open", open);
    const label = menuToggle.querySelector(".sr-only");
    if (label) label.textContent = open ? "关闭菜单" : "打开菜单";
  }

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", function () {
      setMenu(!siteNav.classList.contains("is-open"));
    });

    siteNav.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    const desktopQuery = window.matchMedia("(min-width: 901px)");
    const closeOnDesktop = function (event) {
      if (event.matches) setMenu(false);
    };
    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", closeOnDesktop);
    } else if (typeof desktopQuery.addListener === "function") {
      desktopQuery.addListener(closeOnDesktop);
    }
  }

  /* ---------- 导航高亮 ---------- */
  const sections = Array.from(document.querySelectorAll("main section[id]"));
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));

  function setActiveSection(id) {
    navLinks.forEach(function (link) {
      const isActive = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      const hash = link.getAttribute("href") || "";
      if (hash.charAt(0) === "#") setActiveSection(hash.slice(1));
    });
  });

  /* ---------- 首屏：会被指针轻轻拨开的线条 ---------- */
  const hero = document.querySelector(".hero");
  const field = document.querySelector(".hero-field");
  const canvas = field ? field.querySelector(".field-canvas") : null;

  if (hero && field && canvas) {
    const context = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let lastDpr = 0;
    let strands = [];
    let targetX = 0;
    let targetY = 0;
    let drawX = 0;
    let drawY = 0;
    let pull = 0;
    let targetPull = 0;
    let reveal = reduceMotion ? 1 : 0;
    let loadStart = performance.now();
    let running = false;
    let firstFrame = true;

    function buildStrands() {
      const spacing = width < 420 ? 15 : width < 760 ? 20 : 25;
      const count = Math.max(5, Math.ceil(width / spacing));
      strands = [];

      for (let i = 0; i < count; i += 1) {
        strands.push({
          x: spacing * (i + 0.5),
          width: i % 8 === 0 ? 1.5 : 1,
          alpha: 0.14 + 0.17 * (0.5 + 0.5 * Math.sin(i * 1.7)),
          accent: i % 11 === 4,
          phase: i * 0.9
        });
      }
    }

    function resizeField() {
      if (!context) return;
      const rect = field.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        Math.abs(rect.width - width) < 1 &&
        Math.abs(rect.height - height) < 1 &&
        dpr === lastDpr
      ) {
        return;
      }

      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      lastDpr = dpr;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      targetX = drawX = width * 0.72;
      targetY = drawY = height * 0.48;
      buildStrands();
      if (reduceMotion) reveal = 1;
      requestRender();
    }

    function easeOutCubic(value) {
      return 1 - Math.pow(1 - value, 3);
    }

    function render() {
      if (!context) return;
      context.clearRect(0, 0, width, height);

      const visible = easeOutCubic(reveal);
      if (visible <= 0) return;

      context.save();
      context.beginPath();
      context.rect(0, height * (1 - visible), width, height * visible + 1);
      context.clip();

      const radius = Math.max(150, width * 0.28);

      strands.forEach(function (strand) {
        context.beginPath();

        for (let y = height + 12; y >= -12; y -= 12) {
          let x = strand.x;

          if (pull > 0.001) {
            const distance = Math.abs(strand.x - drawX);
            if (distance < radius) {
              const part = 1 - distance / radius;
              const vertical = Math.exp(
                -Math.pow((y - drawY) / (height * 0.52 + 1), 2)
              );
              const direction = strand.x >= drawX ? 1 : -1;
              x += direction * part * part * vertical * 52 * pull;
            }
          }

          // 固定的细小起伏，让线条像手绘而不是印刷网格
          x += Math.sin(y * 0.011 + strand.phase) * 1.7;

          if (y === height + 12) context.moveTo(x, y);
          else context.lineTo(x, y);
        }

        context.lineWidth = strand.width;
        context.strokeStyle = strand.accent
          ? "rgba(75, 50, 195, " + (0.2 + 0.22 * pull).toFixed(3) + ")"
          : "rgba(24, 35, 28, " + strand.alpha.toFixed(3) + ")";
        context.stroke();
      });

      context.restore();
    }

    function tick(now) {
      running = false;
      let needsAnotherFrame = false;

      if (reduceMotion) {
        reveal = 1;
        pull = targetPull;
        drawX = targetX;
        drawY = targetY;
      } else {
        if (reveal < 1) {
          reveal = Math.min(1, (now - loadStart) / 1700);
          needsAnotherFrame = true;
        }

        const nextPull = pull + (targetPull - pull) * 0.1;
        if (Math.abs(targetPull - pull) > 0.001) {
          pull = nextPull;
          needsAnotherFrame = true;
        } else {
          pull = targetPull;
        }

        const dx = targetX - drawX;
        const dy = targetY - drawY;
        if (Math.abs(dx) > 0.4 || Math.abs(dy) > 0.4) {
          drawX += dx * 0.14;
          drawY += dy * 0.14;
          needsAnotherFrame = true;
        } else {
          drawX = targetX;
          drawY = targetY;
        }
      }

      render();

      if (needsAnotherFrame) requestRender();
    }

    function requestRender() {
      if (running) return;
      running = true;
      if (firstFrame) {
        firstFrame = false;
        loadStart = performance.now();
      }
      window.requestAnimationFrame(tick);
    }

    function onPointerMove(event) {
      if (event.pointerType === "touch" || reduceMotion) return;
      const rect = field.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        targetPull = 0;
      } else {
        targetX = x;
        targetY = y;
        targetPull = 1;
      }
      requestRender();
    }

    function onPointerLeave() {
      targetPull = 0;
      requestRender();
    }

    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerleave", onPointerLeave, { passive: true });

    const handleReduceChange = function (event) {
      reduceMotion = event.matches;
      if (reduceMotion) {
        reveal = 1;
        targetPull = 0;
        pull = 0;
        requestRender();
      }
    };
    if (typeof reduceQuery.addEventListener === "function") {
      reduceQuery.addEventListener("change", handleReduceChange);
    } else if (typeof reduceQuery.addListener === "function") {
      reduceQuery.addListener(handleReduceChange);
    }

    if ("ResizeObserver" in window) {
      const fieldObserver = new ResizeObserver(resizeField);
      fieldObserver.observe(field);
    }
    window.addEventListener("resize", resizeField, { passive: true });

    resizeField();
    requestRender();
  }

  /* ---------- 作品筛选 ---------- */
  const workGrid = document.getElementById("work-grid");
  const filterButtons = Array.from(document.querySelectorAll(".filter"));
  const projects = Array.from(document.querySelectorAll(".project"));
  const filterStatus = document.getElementById("filter-status");

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const filter = button.dataset.filter || "all";
      let visibleCount = 0;
      let visibleTitle = "";

      filterButtons.forEach(function (item) {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      projects.forEach(function (project) {
        const show = filter === "all" || project.dataset.type === filter;
        project.hidden = !show;
        if (show) {
          visibleCount += 1;
          const title = project.querySelector(".plate-title");
          if (title) visibleTitle = title.textContent.trim();
        }
      });

      if (workGrid) {
        workGrid.classList.toggle("is-filtered", filter !== "all");
      }

      if (filterStatus) {
        filterStatus.textContent =
          filter === "all"
            ? "正在显示全部四件作品"
            : "正在显示 " + visibleCount + " 件" + button.textContent.trim() + "作品" +
              (visibleTitle ? "：" + visibleTitle : "");
      }
    });
  });

  /* ---------- 作品册页 ---------- */
  const sheet = document.getElementById("project-sheet");
  const sheetInner = sheet ? sheet.querySelector(".sheet-inner") : null;
  const sheetCover = document.getElementById("sheet-cover");
  const sheetType = document.getElementById("sheet-type");
  const sheetTitle = document.getElementById("sheet-title");
  const sheetSummary = document.getElementById("sheet-summary");
  const sheetBackground = document.getElementById("sheet-background");
  const sheetContent = document.getElementById("sheet-content-text");
  const sheetApproach = document.getElementById("sheet-approach");
  const closeButton = document.getElementById("sheet-close");
  const prevButton = document.getElementById("prev-project");
  const nextButton = document.getElementById("next-project");
  const prevTitle = document.getElementById("prev-title");
  const nextTitle = document.getElementById("next-title");
  const triggers = Array.from(document.querySelectorAll(".plate"));

  let activeProject = 0;
  let lastTrigger = null;

  function detailsFor(index) {
    const button = triggers[index];
    if (!button) return null;
    const article = button.closest(".project");
    const read = function (selector) {
      const node = article ? article.querySelector(selector) : null;
      return node ? node.textContent.trim() : "";
    };
    const cover = button.querySelector(".cover");
    const titleNode = button.querySelector(".plate-title");
    const descNode = button.querySelector(".plate-desc");
    const typeNode = button.querySelector(".plate-type");

    return {
      title: titleNode ? titleNode.textContent.trim() : "",
      type: typeNode ? typeNode.textContent.trim() : "",
      summary: descNode ? descNode.textContent.trim() : "",
      background: read("[data-background]"),
      content: read("[data-content]"),
      approach: read("[data-approach]"),
      coverHTML: cover ? cover.innerHTML : ""
    };
  }

  function fillSheet(index, moveFocus) {
    const data = detailsFor(index);
    if (!data) return;

    activeProject = index;
    if (sheetType) sheetType.textContent = data.type;
    if (sheetTitle) sheetTitle.textContent = data.title;
    if (sheetSummary) sheetSummary.textContent = data.summary;
    if (sheetBackground) sheetBackground.textContent = data.background;
    if (sheetContent) sheetContent.textContent = data.content;
    if (sheetApproach) sheetApproach.textContent = data.approach;
    if (sheetCover) sheetCover.innerHTML = data.coverHTML;

    const total = triggers.length;
    const previous = detailsFor((index - 1 + total) % total);
    const next = detailsFor((index + 1) % total);
    if (prevTitle && previous) prevTitle.textContent = previous.title;
    if (nextTitle && next) nextTitle.textContent = next.title;
    if (prevButton && previous) {
      prevButton.setAttribute("aria-label", "上一件作品：" + previous.title);
    }
    if (nextButton && next) {
      nextButton.setAttribute("aria-label", "下一件作品：" + next.title);
    }

    if (moveFocus) {
      if (sheetInner) sheetInner.scrollTop = 0;
      if (sheetTitle) {
        sheetTitle.setAttribute("tabindex", "-1");
        sheetTitle.focus({ preventScroll: true });
      }
    }
  }

  function openSheet(index, trigger) {
    if (!sheet || typeof sheet.showModal !== "function") return;
    lastTrigger = trigger || null;
    fillSheet(index, false);
    if (!sheet.open) sheet.showModal();
    doc.classList.add("sheet-open");
    window.requestAnimationFrame(function () {
      if (closeButton) closeButton.focus();
    });
  }

  if (sheet && triggers.length) {
    triggers.forEach(function (button, index) {
      button.addEventListener("click", function () {
        openSheet(index, button);
      });
    });

    if (closeButton) {
      closeButton.addEventListener("click", function () {
        sheet.close();
      });
    }

    sheet.addEventListener("click", function (event) {
      if (event.target === sheet) sheet.close();
    });

    sheet.addEventListener("close", function () {
      doc.classList.remove("sheet-open");
      if (lastTrigger) lastTrigger.focus();
    });

    if (prevButton) {
      prevButton.addEventListener("click", function () {
        fillSheet((activeProject - 1 + triggers.length) % triggers.length, true);
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", function () {
        fillSheet((activeProject + 1) % triggers.length, true);
      });
    }
  }

  /* ---------- 复制邮箱 ---------- */
  const emailAddress = "linjian@example.com";
  const copyButton = document.getElementById("copy-email");
  const copyStatus = document.getElementById("copy-status");
  let copyTimer = 0;

  function fallbackCopy(text) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.top = "-1000px";
    helper.style.left = "-1000px";
    document.body.appendChild(helper);
    helper.select();
    const succeeded = document.execCommand("copy");
    document.body.removeChild(helper);
    if (!succeeded) throw new Error("copy failed");
  }

  function showCopyStatus(message) {
    if (!copyStatus) return;
    window.clearTimeout(copyTimer);
    copyStatus.textContent = message;
    copyTimer = window.setTimeout(function () {
      copyStatus.textContent = "";
    }, 3200);
  }

  if (copyButton) {
    copyButton.addEventListener("click", async function () {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(emailAddress);
        } else {
          fallbackCopy(emailAddress);
        }
        showCopyStatus("邮箱已复制：" + emailAddress);
      } catch (error) {
        try {
          fallbackCopy(emailAddress);
          showCopyStatus("邮箱已复制：" + emailAddress);
        } catch (fallbackError) {
          showCopyStatus("复制没有成功，请手动选择邮箱地址。");
        }
      }
    });
  }

  /* ---------- 联系表单：生成邮件草稿 ---------- */
  const form = document.getElementById("contact-form");
  const result = document.getElementById("form-result");
  const resultName = document.getElementById("result-name");
  const resultSummary = document.getElementById("result-summary");
  const draftLink = document.getElementById("draft-link");
  const resetButton = document.getElementById("reset-form");

  const fields = {
    name: document.getElementById("field-name"),
    email: document.getElementById("field-email"),
    idea: document.getElementById("field-idea")
  };

  const errors = {
    name: document.getElementById("name-error"),
    email: document.getElementById("email-error"),
    idea: document.getElementById("idea-error")
  };

  function setFieldError(key, message) {
    const input = fields[key];
    const error = errors[key];
    if (!input || !error) return;
    error.textContent = message || "";
    input.setAttribute("aria-invalid", message ? "true" : "false");
    const wrapper = input.closest(".field");
    if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
  }

  function clearErrors() {
    Object.keys(fields).forEach(function (key) {
      setFieldError(key, "");
    });
  }

  Object.keys(fields).forEach(function (key) {
    const input = fields[key];
    if (!input) return;
    input.addEventListener("input", function () {
      if (input.getAttribute("aria-invalid") === "true") setFieldError(key, "");
    });
  });

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearErrors();

      const name = fields.name ? fields.name.value.trim() : "";
      const email = fields.email ? fields.email.value.trim() : "";
      const idea = fields.idea ? fields.idea.value.trim() : "";
      let firstInvalid = null;

      if (!name) {
        setFieldError("name", "请留一个称呼，方便我知道怎么开始。");
        firstInvalid = fields.name;
      }

      if (!email) {
        setFieldError("email", "请填一个邮箱地址，方便我把回复发给你。");
        firstInvalid = firstInvalid || fields.email;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFieldError("email", "这个邮箱地址看起来不完整，请再检查一下。");
        firstInvalid = firstInvalid || fields.email;
      }

      if (!idea) {
        setFieldError("idea", "请简单说说你想一起做的事。");
        firstInvalid = firstInvalid || fields.idea;
      } else if (idea.length < 10) {
        setFieldError("idea", "可以再多写一点，让我更清楚你想做什么。");
        firstInvalid = firstInvalid || fields.idea;
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const subject = "合作想法：" + name;
      const body =
        "林间，你好：\n\n" +
        "我是" + name + "。\n\n" +
        idea + "\n\n" +
        "可以通过 " + email + " 联系我。\n\n" +
        "（这封草稿来自林间的作品集演示页面）";

      if (draftLink) {
        draftLink.href =
          "mailto:linjian@example.com?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
      }
      if (resultName) resultName.textContent = name;
      if (resultSummary) {
        resultSummary.textContent =
          "主题是“" + subject + "”，回复会发送到 " + email +
          "。打开邮件应用后，检查内容再发送。";
      }

      form.hidden = true;
      if (result) {
        result.hidden = false;
        result.focus();
      }
    });
  }

  if (resetButton && form && result) {
    resetButton.addEventListener("click", function () {
      form.reset();
      clearErrors();
      result.hidden = true;
      form.hidden = false;
      if (fields.name) fields.name.focus();
    });
  }
})();
