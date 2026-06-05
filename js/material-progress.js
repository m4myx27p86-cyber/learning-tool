/* =========================
   教材開始画面：設定＋進捗の一括表示
========================= */

async function renderSettingProgressDashboard(type = testType) {
  if (!type || !TEST_CONFIG[type] || TEST_CONFIG[type].type === "writing") return;
  activeLocalReviewType = type;
  const config = TEST_CONFIG[type];
  const questionsForType = await ensureQuestionsLoaded(type);
  const statuses = getLocalReviewStatuses(type, questionsForType);
  const mastered = statuses.filter(item => item.status === "mastered").length;
  const needReview = statuses.filter(item => item.status === "review").length;
  const unlearned = statuses.filter(item => item.status === "unlearned").length;
  const total = statuses.length || 1;
  const percent = Math.round((mastered / total) * 100);
  const reviewPercent = Math.round((needReview / total) * 100);
  const settings = getLocalReviewSettings();
  const sectionFilteredStatuses = filterStatusesBySelectedSection(statuses);
  const selectedCount = getFilteredLocalReviewStatuses(sectionFilteredStatuses, settings).length;
  const selectedLimit = getConfiguredPracticeCount(selectedCount);

  setText("settingReviewDonutNumber", `${percent}%`);
  setText("settingReviewMasteredCount", `${mastered}問`);
  setText("settingReviewNeedReviewCount", `${needReview}問`);
  setText("settingReviewUnlearnedCount", `${unlearned}問`);
  setText("settingReviewTotalButton", `総復習 ${selectedLimit}問`);

  const donut = document.getElementById("settingReviewDonut");
  if (donut) {
    donut.style.setProperty("--mastered-percent", `${percent}%`);
    donut.style.setProperty("--review-percent", `${reviewPercent}%`);
  }
  renderReviewPlant(mastered, needReview, unlearned, "settingReviewPlant", "settingReviewPlantMessage");
  renderBossBattleArea(type, statuses);
  setText("settingReviewRandomButton", TEST_CONFIG[type]?.keepOrder ? "選択範囲を順番に練習" : "ランダムで練習");
  loadSettingReviewSettingsToForm();
  renderSettingReviewInsight(statuses, config);
  renderSettingReviewList(statuses);
}

function getFilteredLocalReviewStatuses(statuses, settings = getLocalReviewSettings()) {
  return statuses.filter(item => {
    if (item.status === "mastered" && settings.includeMastered) return true;
    if (item.status === "review" && (settings.includeReview || settings.includeWrong)) return true;
    if (item.starred && settings.includeStarred) return true;
    if (item.status === "unlearned" && settings.includeUnlearned) return true;
    return false;
  });
}

function renderSettingReviewInsight(statuses, config) {
  const settingPanel = document.getElementById("settingReviewPanel");
  const single = document.querySelector(".unified-material-single");
  const insight = document.getElementById("settingReviewInsightArea");
  if (!settingPanel && !insight) return;
  const weak = statuses.filter(item => item.status === "review").slice(0, 3);
  const mastered = statuses.filter(item => item.status === "mastered").length;
  const total = statuses.length;
  insight.innerHTML = weak.length ? `
    <div class="local-insight-card compact-insight-card">
      <strong>今日の復習ポイント</strong>
      ${weak.map(item => `<p>・${escapeHtml(getQuestionLabel(item.question))}</p>`).join("")}
    </div>
  ` : `
    <div class="local-insight-card compact-insight-card">
      <strong>${escapeHtml(config.title)}の状態</strong>
      <p>${total ? `習得済み ${mastered}問。未学習も含めて回すと、知識の根が広がります。` : "問題データの読み込みを確認してください。"}</p>
    </div>
  `;
}

function renderSettingReviewList(statuses) {
  const list = document.getElementById("settingReviewListPanel");
  if (!list) return;
  list.classList.toggle("hidden", !settingReviewListVisible);
  if (!settingReviewListVisible) return;
  list.innerHTML = statuses.map(item => {
    const label = item.status === "mastered" ? "習得済" : item.status === "review" ? "要復習" : "未学習";
    return `
      <div class="local-review-row ${item.status}">
        <button class="star-button ${item.starred ? "active" : ""}" data-setting-star-id="${escapeHtml(item.question.id)}" type="button">?</button>
        <div><strong>${escapeHtml(getQuestionLabel(item.question))}</strong><span>${escapeHtml(label)} / ${escapeHtml(item.question.section || "")}</span></div>
        <button class="small-button secondary-button" data-setting-study-id="${escapeHtml(item.question.id)}" type="button">1問</button>
      </div>`;
  }).join("");
  list.querySelectorAll("[data-setting-star-id]").forEach(button => {
    button.addEventListener("click", () => {
      toggleStarredItem(testType, button.dataset.settingStarId);
      renderSettingProgressDashboard(testType);
    });
  });
  list.querySelectorAll("[data-setting-study-id]").forEach(button => {
    button.addEventListener("click", () => {
      activeLocalReviewType = testType;
      startSingleLocalReview(button.dataset.settingStudyId);
    });
  });
}

function getQuestionLabel(question) {
  return question.word || question.question || question.prompt || question.answer || question.id || "問題";
}

function toggleSettingReviewList() {
  settingReviewListVisible = !settingReviewListVisible;
  const button = document.getElementById("settingReviewListToggleButton");
  if (button) button.textContent = settingReviewListVisible ? "一覧を閉じる" : "問題一覧";
  renderSettingProgressDashboard(testType);
}

function loadSettingReviewSettingsToForm() {
  const settings = getLocalReviewSettings();
  const map = {
    settingIncludeMastered: settings.includeMastered,
    settingIncludeReview: settings.includeReview,
    settingIncludeStarred: settings.includeStarred,
    settingIncludeWrong: settings.includeWrong,
    settingIncludeUnlearned: settings.includeUnlearned
  };
  Object.entries(map).forEach(([id, checked]) => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  });
  setText("settingReviewCountDisplay", `${settings.count}問`);
}

function saveSettingReviewSettingsFromForm() {
  const settings = getLocalReviewSettings();
  const getChecked = id => Boolean(document.getElementById(id)?.checked);
  settings.includeMastered = getChecked("settingIncludeMastered");
  settings.includeReview = getChecked("settingIncludeReview");
  settings.includeStarred = getChecked("settingIncludeStarred");
  settings.includeWrong = getChecked("settingIncludeWrong");
  settings.includeUnlearned = getChecked("settingIncludeUnlearned");
  localStorage.setItem(STORAGE_KEYS.localReviewSettings, JSON.stringify(settings));
}

function changeSettingReviewCount(amount) {
  const settings = getLocalReviewSettings();
  settings.count = Math.max(10, Math.min(2000, Number(settings.count || 1000) + amount));
  localStorage.setItem(STORAGE_KEYS.localReviewSettings, JSON.stringify(settings));
  loadSettingReviewSettingsToForm();
  renderSettingProgressDashboard(testType);
}

function startSettingReviewQuiz(mode = "review") {
  if (!testType) return;
  activeLocalReviewType = testType;
  saveSettingReviewSettingsFromForm();
  startLocalReviewQuiz(mode);
}


function ensureBossBattleArea() {
  if (document.getElementById("bossBattleArea")) return;
  const settingPanel = document.getElementById("settingReviewPanel");
  const single = document.querySelector(".unified-material-single");
  const insight = document.getElementById("settingReviewInsightArea");
  if (!settingPanel && !insight) return;
  const area = document.createElement("div");
  area.id = "bossBattleArea";
  area.className = "boss-battle-card boss-top-banner hidden";
  area.innerHTML = `
    <div class="boss-info">
      <span class="panel-label">Boss Battle</span>
      <h3 id="bossBattleTitle">50問ごとのボス</h3>
      <p id="bossBattleMessage">50問ごとに、間違えた問題から5問のボス戦が開きます。</p>
      <div class="boss-hp-preview"><i id="bossHpPreviewBar" style="width:100%"></i></div>
    </div>
    <div class="boss-character" aria-hidden="true">👾</div>
    <button id="bossBattleButton" class="secondary-button" type="button">ボスに挑戦</button>
  `;
  if (single && settingPanel) {
    single.insertBefore(area, settingPanel);
  } else {
    insight.parentNode.insertBefore(area, insight);
  }
}

function getBossKey(type = testType) {
  return `learningTool_bossCleared_${type}_${currentStudentId || "unknown"}`;
}

function getBossClearedMilestone(type = testType) {
  return Math.max(0, Number(localStorage.getItem(getBossKey(type)) || 0));
}

function setBossClearedMilestone(type, milestone) {
  localStorage.setItem(getBossKey(type), String(Math.max(0, Number(milestone) || 0)));
}

function getBossMilestoneForType(type) {
  const answered = getLocalHistory().filter(item => item.studentId === currentStudentId && item.testType === type).length;
  return Math.floor(answered / 50);
}

function renderBossBattleArea(type = testType, statuses = []) {
  if (typeof isFeatureEnabled === "function" && !isFeatureEnabled("boss")) {
    const existing = document.getElementById("bossBattleArea");
    if (existing) existing.classList.add("hidden");
    return;
  }
  ensureBossBattleArea();
  const area = document.getElementById("bossBattleArea");
  if (!area || !type) return;
  const answered = getLocalHistory().filter(item => item.studentId === currentStudentId && item.testType === type).length;
  const milestone = Math.floor(answered / 50);
  const cleared = getBossClearedMilestone(type);
  const available = milestone > cleared;
  const wrongCount = statuses.filter(item => item.status === "review").length;
  const nextAt = Math.max(50, (milestone + 1) * 50);
  const remain = Math.max(0, nextAt - answered);
  const button = document.getElementById("bossBattleButton");
  const title = document.getElementById("bossBattleTitle");
  const message = document.getElementById("bossBattleMessage");
  const bar = document.getElementById("bossHpPreviewBar");

  area.classList.remove("hidden", "boss-ready", "boss-cleared");
  if (available && wrongCount > 0) {
    area.classList.add("boss-ready");
    setText("bossBattleTitle", `Boss Lv.${milestone}`);
    setText("bossBattleMessage", `解放中：間違えた問題から最大5問出題します。正解ごとにHPを削ります。`);
    if (button) {
      button.disabled = false;
      button.textContent = "ボスに挑戦";
    }
    if (bar) bar.style.width = "100%";
    return;
  }

  if (milestone > 0 && cleared >= milestone) {
    area.classList.add("boss-cleared");
    setText("bossBattleTitle", `Boss Lv.${milestone} 討伐済み`);
    setText("bossBattleMessage", `次のボスまであと${remain}問です。`);
  } else if (available && wrongCount === 0) {
    setText("bossBattleTitle", `Boss Lv.${milestone} 待機中`);
    setText("bossBattleMessage", "ボス戦に使う間違い問題がありません。通常演習で弱点が見つかると挑戦できます。");
  } else {
    setText("bossBattleTitle", "50問ごとのボス");
    setText("bossBattleMessage", `次のボスまであと${remain}問です。`);
  }
  if (button) {
    button.disabled = true;
    button.textContent = "まだ挑戦できません";
  }
  if (bar) bar.style.width = `${Math.min(100, (answered % 50) * 2)}%`;
}
