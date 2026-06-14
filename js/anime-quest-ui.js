/* =========================================================
   2026-06-14 Anime Quest UI enhancer
   Decorative/navigation layer only. Core learning logic is unchanged.
========================================================= */
(function () {
  "use strict";

  function clickIfPresent(id) {
    const element = document.getElementById(id);
    if (element) {
      element.click();
      return true;
    }
    return false;
  }

  function safeCall(name) {
    if (typeof window[name] === "function") {
      window[name]();
      return true;
    }
    try {
      if (name === "renderMenu" && typeof renderMenu === "function") {
        renderMenu();
        return true;
      }
      if (name === "openCalendar" && typeof openCalendar === "function") {
        openCalendar();
        return true;
      }
      if (name === "openHistoryScreen" && typeof openHistoryScreen === "function") {
        openHistoryScreen();
        return true;
      }
      if (name === "openAccessManager" && typeof openAccessManager === "function") {
        openAccessManager();
        return true;
      }
    } catch (error) {
      console.warn("Quest navigation action failed:", name, error);
    }
    return false;
  }

  function showHome() {
    if (safeCall("renderMenu") && typeof showOnly === "function") {
      showOnly("menuScreen");
      return;
    }
    clickIfPresent("backToMenuButton") || clickIfPresent("resultMenuButton") || clickIfPresent("historyBackButton");
  }

  function showMaterials() {
    showHome();
    setTimeout(() => {
      document.body.classList.add("materials-open");
      document.getElementById("materialShelf")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function showCalendar() {
    if (!safeCall("openCalendar")) {
      showHome();
      setTimeout(() => document.getElementById("learningCalendarHomeArea")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    }
  }

  function showReviewOrHistory() {
    if (!safeCall("openHistoryScreen")) {
      clickIfPresent("adminHistoryButton") || showHome();
    }
  }

  function showSettings() {
    if (!safeCall("openAccessManager")) {
      clickIfPresent("accessManagerButton") || showHome();
    }
  }

  function ensureBottomNav() {
    if (document.getElementById("questBottomNav")) return;
    const nav = document.createElement("nav");
    nav.id = "questBottomNav";
    nav.className = "quest-bottom-nav";
    nav.setAttribute("aria-label", "Quest navigation");
    nav.innerHTML = `
      <button type="button" data-quest-nav="home"><b>⌂</b><span>Home</span></button>
      <button type="button" data-quest-nav="materials"><b>▣</b><span>Materials</span></button>
      <button type="button" data-quest-nav="calendar"><b>🔥</b><span>Streak</span></button>
      <button type="button" data-quest-nav="review"><b>◎</b><span>History</span></button>
      <button type="button" data-quest-nav="settings"><b>⚙</b><span>Admin</span></button>
    `;
    document.body.appendChild(nav);
    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-quest-nav]");
      if (!button) return;
      const action = button.dataset.questNav;
      if (action === "home") showHome();
      if (action === "materials") showMaterials();
      if (action === "calendar") showCalendar();
      if (action === "review") showReviewOrHistory();
      if (action === "settings") showSettings();
    });
  }

  function ensureFileProtocolNotice() {
    if (typeof location === "undefined" || location.protocol !== "file:") return;
    if (document.getElementById("fileProtocolNotice")) return;
    const notice = document.createElement("div");
    notice.id = "fileProtocolNotice";
    notice.className = "file-protocol-notice";
    notice.innerHTML = `
      <strong>Question files cannot be read from file://.</strong>
      <span>Open this app at <code>http://127.0.0.1:8000/index.html</code>.</span>
    `;
    document.body.prepend(notice);
  }

  function decorateMaterialCards() {
    document.querySelectorAll(".material-card[data-material]").forEach(card => {
      const type = card.dataset.material || "";
      card.dataset.questTone = TEST_CONFIG?.[type]?.category || "general";
    });
  }

  function applyQuestClass() {
    document.body.classList.add("anime-quest-ui", "restored-game-ui");
    if (!document.getElementById("menuScreen")?.classList.contains("hidden")) {
      document.body.classList.add("compact-game-home");
    }
  }

  const previousRenderMaterialCategories = window.renderMaterialCategories;
  if (typeof previousRenderMaterialCategories === "function") {
    window.renderMaterialCategories = function renderMaterialCategoriesWithQuestUi() {
      const result = previousRenderMaterialCategories.apply(this, arguments);
      setTimeout(decorateMaterialCards, 0);
      return result;
    };
  }

  const previousShowOnly = window.showOnly;
  if (typeof previousShowOnly === "function") {
    window.showOnly = function showOnlyWithQuestUi(screenId) {
      const result = previousShowOnly.apply(this, arguments);
      document.body.classList.toggle("compact-game-home", screenId === "menuScreen");
      ensureBottomNav();
      setTimeout(decorateMaterialCards, 0);
      return result;
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyQuestClass();
    ensureFileProtocolNotice();
    ensureBottomNav();
    decorateMaterialCards();
  });
})();
