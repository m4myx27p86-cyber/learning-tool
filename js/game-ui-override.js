/* =========================================================
   2026-06-03 Mockup-aligned Game UI Override v3
   - ホーム / 教材選択 / 教材画面の見た目と配置だけを後読みで整える
   - ログイン・採点・CSV読込・GAS送信・履歴保存・Speaking Review本体は変更しない
========================================================= */
(function () {
  "use strict";

  const CHARACTER_ASSET_BASE = "assets/characters";
  const zodiacAssetMap = {
    "子": "zodiac-子.svg", "丑": "zodiac-丑.svg", "寅": "zodiac-寅.svg", "卯": "zodiac-卯.svg",
    "辰": "zodiac-辰.svg", "巳": "zodiac-巳.svg", "午": "zodiac-午.svg", "未": "zodiac-未.svg",
    "申": "zodiac-申.svg", "酉": "zodiac-酉.svg", "戌": "zodiac-戌.svg", "亥": "zodiac-亥.svg"
  };

  const safeHtml = value => {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>\"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  };

  const fallbackDateKey = date => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const characterImg = (file, label, extraClass = "") =>
    `<img class="manga-character-img ${extraClass}" src="${CHARACTER_ASSET_BASE}/${file}" alt="${safeHtml(label)}" loading="lazy" onerror="this.style.display='none'; this.parentElement?.classList.add('character-fallback');" />`;

  const getHistory = () => {
    if (typeof getCurrentStudentHistory === "function") return getCurrentStudentHistory();
    if (typeof getLocalHistory === "function" && typeof currentStudentId !== "undefined") {
      return getLocalHistory().filter(item => item.studentId === currentStudentId);
    }
    return [];
  };

  const getTree = correct => {
    if (typeof getTreeLevelInfo === "function") return getTreeLevelInfo(correct);
    const thresholds = [0, 5, 15, 30, 60, 100, 160, 250, 380, 550, 750, 1000];
    let level = 1;
    for (let i = 1; i < thresholds.length; i += 1) if (correct >= thresholds[i]) level = i + 1;
    const nextTarget = thresholds[level] || null;
    const base = thresholds[level - 1] || 0;
    return {
      level,
      maxLevel: thresholds.length,
      remaining: nextTarget ? Math.max(0, nextTarget - correct) : 0,
      progress: nextTarget ? Math.min(100, Math.max(correct > 0 ? 6 : 0, Math.round(((correct - base) / Math.max(1, nextTarget - base)) * 100))) : 100,
      isMaxLevel: !nextTarget
    };
  };

  const getZodiac = () => {
    if (typeof getZodiacInfo === "function") return getZodiacInfo();
    return { key: "寅", name: "とら", icon: "🐯", trait: "挑戦する力" };
  };

  const getZodiacLevel = todayCorrect => {
    if (typeof getDailyZodiacLevelInfo === "function") return getDailyZodiacLevelInfo(todayCorrect);
    const thresholds = [0, 3, 10, 20, 30];
    let level = 1;
    for (let i = 1; i < thresholds.length; i += 1) if (todayCorrect >= thresholds[i]) level = i + 1;
    const nextTarget = thresholds[level] || null;
    const base = thresholds[level - 1] || 0;
    return {
      level,
      remaining: nextTarget ? Math.max(0, nextTarget - todayCorrect) : 0,
      progress: nextTarget ? Math.min(100, Math.max(todayCorrect > 0 ? 8 : 0, Math.round(((todayCorrect - base) / Math.max(1, nextTarget - base)) * 100))) : 100,
      isMaxLevel: !nextTarget
    };
  };

  function openMaterialShelf() {
    document.body.classList.add("materials-open");
    document.body.classList.remove("calendar-open");
    document.getElementById("materialShelf")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCalendarShelf() {
    document.body.classList.add("calendar-open");
    document.body.classList.remove("materials-open");
    document.getElementById("learningCalendarHomeArea")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.renderGameHomeHero = function renderGameHomeHeroOverride() {
    const area = document.getElementById("gameHomeHero");
    if (!area || typeof currentStudentId === "undefined" || !currentStudentId) return;

    document.body.classList.add("compact-game-home", "restored-game-ui");

    const history = getHistory();
    const todayKey = typeof getDateKey === "function" ? getDateKey(new Date()) : fallbackDateKey(new Date());
    const today = history.filter(item => item.dateKey === todayKey);
    const todayCorrect = today.filter(item => item.correct).length;
    const correct = history.filter(item => item.correct).length;
    const total = history.length;
    const featureIsOn = typeof isFeatureEnabled === "function" ? isFeatureEnabled : () => true;
    const showTree = featureIsOn("learningTree");
    const showZodiac = featureIsOn("zodiac");
    const showBoss = featureIsOn("boss");
    const tree = getTree(correct);
    const zodiac = getZodiac();
    const zodiacLevel = getZodiacLevel(todayCorrect);
    const zodiacFile = zodiacAssetMap[zodiac.key] || "zodiac-寅.svg";
    const bossStep = 50;
    const bossLevel = Math.max(1, Math.floor(total / bossStep) + 1);
    const nextBossAt = Math.max(bossStep, bossLevel * bossStep);
    const bossRemain = Math.max(0, nextBossAt - total);
    const bossProgress = Math.min(100, Math.round((total % bossStep) / bossStep * 100));
    const streak = typeof getProtectedStreakInfo === "function" ? getProtectedStreakInfo() : { count: 0 };
    const noticeMascot = showZodiac
      ? characterImg(zodiacFile, `${zodiac.key}：${zodiac.name}`, "notice-zodiac-img")
      : showTree
        ? characterImg("tree.svg", "知識の木", "notice-tree-img")
        : showBoss
          ? characterImg("boss.svg", "ボス", "notice-boss-img")
          : "";
    const statusCards = [
      showTree ? `
        <article class="mock-status-card tree-card">
          <span>知識の木</span>
          <div class="mock-character-stage">${characterImg("tree.svg", "知識の木", "tree-img")}</div>
          <strong>Lv.${tree.level}</strong>
          <small>${tree.isMaxLevel ? "最大レベル達成" : `次のレベルまで あと ${tree.remaining}問`}</small>
          <div class="mock-progress"><i style="width:${tree.progress}%"></i><b>${correct} / 1,000</b></div>
        </article>` : "",
      showZodiac ? `
        <article class="mock-status-card zodiac-card">
          <span>十二支の道</span>
          <div class="mock-character-stage">${characterImg(zodiacFile, `${zodiac.key}：${zodiac.name}`, "zodiac-img")}</div>
          <strong>Lv.${zodiacLevel.level}</strong>
          <small>${zodiacLevel.isMaxLevel ? "本日の最高Lv." : `次のレベルまで あと ${zodiacLevel.remaining}問`}</small>
          <div class="mock-progress orange"><i style="width:${zodiacLevel.progress}%"></i><b>${todayCorrect} / 30</b></div>
        </article>` : "",
      showBoss ? `
        <article class="mock-status-card boss-card">
          <span>ボスバトル</span>
          <div class="mock-character-stage">${characterImg("boss.svg", "ボス", "boss-img")}</div>
          <strong>Lv.${bossLevel}</strong>
          <small>次のレベルまで あと ${bossRemain}問</small>
          <div class="mock-progress purple"><i style="width:${bossProgress}%"></i><b>${total % bossStep} / ${bossStep}</b></div>
        </article>` : ""
    ].filter(Boolean).join("");

    area.innerHTML = `
      <section class="mock-home-notice" aria-label="お知らせ">
        <div class="notice-mascot">${noticeMascot}</div>
        <div class="notice-copy"><span>お知らせ</span><strong>今日もコツコツ学習してレベルアップを目指そう！</strong></div>
        <button type="button" class="notice-open-button" id="heroNoticeMaterialButton" aria-label="教材へ進む">›</button>
      </section>
      ${statusCards ? `<section class="mock-status-grid" aria-label="成長状況">${statusCards}</section>` : ""}
      <button id="heroMaterialButton" class="mock-material-button" type="button">
        <span class="mock-chest" aria-hidden="true">▣</span>
        <span><strong>教材へ</strong><small>学習できる教材を選ぼう！</small></span>
        <b>›</b>
      </button>
      <section class="mock-home-mini-grid" aria-label="連続学習とアイテム">
        <article><span>連続学習日数</span><strong>${streak.count || 0}日</strong><small>最高記録を更新しよう</small></article>
        <article><span>今日の学習</span><strong>${today.length}問</strong><small>1問でも継続達成</small></article>
      </section>`;

    document.getElementById("heroMaterialButton")?.addEventListener("click", openMaterialShelf);
    document.getElementById("heroNoticeMaterialButton")?.addEventListener("click", openMaterialShelf);
    area.querySelectorAll(".mock-status-card").forEach(card => card.addEventListener("click", openMaterialShelf));
  };

  function enhanceMaterialQuestLayout() {
    const settingScreen = document.getElementById("settingScreen");
    const card = document.getElementById("settingReviewPanel");
    const head = settingScreen?.querySelector(".unified-material-head");
    const visual = card?.querySelector(".setting-review-visual-grid");
    const settings = card?.querySelector(".integrated-settings-block");
    const conditions = card?.querySelector(".setting-review-conditions");
    const actions = card?.querySelector(".setting-review-actions");
    const startActions = card?.querySelector(".integrated-start-actions");
    const topLine = card?.querySelector(".practice-settings-topline");
    const listButton = document.getElementById("settingReviewListToggleButton");
    const plant = document.getElementById("settingReviewPlant");
    const boss = document.getElementById("bossBattleArea");

    if (!settingScreen || !card || !settings) return;
    document.body.classList.add("restored-game-ui", "mock-material-screen");

    if (visual && visual.nextElementSibling !== settings) {
      settings.parentNode.insertBefore(visual, settings);
    }
    if (topLine && listButton && listButton.parentElement !== topLine) {
      topLine.appendChild(listButton);
    }
    if (conditions && conditions.parentElement !== settings) {
      settings.appendChild(conditions);
    }
    if (actions && actions.parentElement !== settings) {
      settings.appendChild(actions);
    }
    if (startActions && startActions.parentElement === settings && conditions && settings.compareDocumentPosition(startActions) & Node.DOCUMENT_POSITION_FOLLOWING) {
      // 通常演習ボタンは設定項目の直後に残し、総復習条件はその下へ置く。
    }
    if (boss && head && (typeof isFeatureEnabled !== "function" || isFeatureEnabled("boss")) && boss.previousElementSibling !== head) {
      head.insertAdjacentElement("afterend", boss);
      boss.classList.add("boss-top-banner");
    }

    if (plant && (typeof isFeatureEnabled !== "function" || isFeatureEnabled("learningTree")) && !plant.querySelector(".setting-tree-img")) {
      plant.innerHTML = `<img class="setting-tree-img" src="${CHARACTER_ASSET_BASE}/tree.svg" alt="知識の木" loading="lazy" onerror="this.style.display='none';">`;
    }

    const bossChar = document.querySelector("#bossBattleArea .boss-character");
    if (bossChar && (typeof isFeatureEnabled !== "function" || isFeatureEnabled("boss")) && !bossChar.querySelector("img")) {
      bossChar.innerHTML = `<img class="boss-banner-img" src="${CHARACTER_ASSET_BASE}/boss.svg" alt="ボス" loading="lazy">`;
    }
  }

  const previousRenderSettingProgressDashboard = window.renderSettingProgressDashboard;
  if (typeof previousRenderSettingProgressDashboard === "function") {
    window.renderSettingProgressDashboard = function renderSettingProgressDashboardWithMockup() {
      const result = previousRenderSettingProgressDashboard.apply(this, arguments);
      Promise.resolve(result).finally(() => setTimeout(enhanceMaterialQuestLayout, 0));
      return result;
    };
  }

  const previousRenderMenu = window.renderMenu;
  if (typeof previousRenderMenu === "function") {
    window.renderMenu = function renderMenuWithMockup() {
      previousRenderMenu.apply(this, arguments);
      document.body.classList.add("compact-game-home", "restored-game-ui");
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("restored-game-ui");
    setTimeout(enhanceMaterialQuestLayout, 50);
  });
})();
