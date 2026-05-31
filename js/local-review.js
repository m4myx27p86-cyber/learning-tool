/* =========================
   総復習ダッシュボード（localStorage）
========================= */

function getReviewableTypes() {
  const priority = [
    "speakingReview", "speakingReviewCloze", "speakingErrorCorrection", "phrasalVerbs", "monitor",
    "sentence", "polaris3", "vocab", "sokudokuVocab", "target1900Vocab",
    "eikenConnectors", "classicalWords", "classicalGrammar", "classicalKnowledge",
    "englishTheory", "statisticsQuestions", "writingTheoryChapter4", "writingTheoryMap", "presentationBuilderTasks"
  ];
  const rest = Object.keys(TEST_CONFIG).filter(type => !priority.includes(type));
  return [...priority, ...rest].filter(type => isReviewDashboardSupported(type) && hasAccessToMaterial(type));
}

async function openLocalReviewDashboard(materialType = "") {
  const types = getReviewableTypes();
  if (!types.length) return alert("総復習に使える教材がありません。");
  if (materialType && types.includes(materialType)) activeLocalReviewType = materialType;
  if (!types.includes(activeLocalReviewType)) activeLocalReviewType = types[0];
  applyThemeForMaterial(activeLocalReviewType);
  showOnly("reviewDashboardScreen");
  await renderLocalReviewDashboard();
}

async function renderLocalReviewDashboard() {
  const type = activeLocalReviewType;
  const config = TEST_CONFIG[type];
  const questionsForType = await ensureQuestionsLoaded(type);
  const statuses = getLocalReviewStatuses(type, questionsForType);
  const mastered = statuses.filter(item => item.status === "mastered").length;
  const needReview = statuses.filter(item => item.status === "review").length;
  const unlearned = statuses.filter(item => item.status === "unlearned").length;
  const total = statuses.length || 1;
  const percent = Math.round((mastered / total) * 100);
  const reviewPercent = Math.round((needReview / total) * 100);

  setText("localReviewMaterialLabel", config.title);
  setText("localReviewTitle", `教材別ダッシュボード - ${getLocalReviewKindLabel(type)}`);
  setText("localReviewDonutNumber", `${percent}%`);
  setText("localReviewMasteredCount", `${mastered}問`);
  setText("localReviewNeedReviewCount", `${needReview}問`);
  setText("localReviewUnlearnedCount", `${unlearned}問`);
  setText("localReviewTotalButton", `復習 ${statuses.filter(item => item.status !== "unlearned" || getLocalReviewSettings().includeUnlearned).length}問`);
  const donut = document.getElementById("localReviewDonut");
  if (donut) {
    donut.style.setProperty("--mastered-percent", `${percent}%`);
    donut.style.setProperty("--review-percent", `${reviewPercent}%`);
  }
  renderReviewPlant(mastered, needReview, unlearned);

  loadLocalReviewSettingsToForm();
  renderLocalReviewPanels(statuses);
}

function getLocalReviewKindLabel(type) {
  const config = TEST_CONFIG[type] || {};
  if (["vocab", "sokudokuVocab", "target1900Vocab", "classicalWords"].includes(type)) return "単語";
  if (type === "polaris3") return "読解";
  if (["phrasalVerbs", "speakingReview", "speakingReviewCloze"].includes(type)) return "チャンク";
  if (config.type === "sentence") return "語順";
  if (config.type === "cloze") return "穴埋め";
  if (config.type === "errorCorrection") return "誤り発見";
  return "確認問題";
}

function getLocalReviewStatuses(type, sourceQuestions) {
  const history = getLocalHistory().filter(item => item.studentId === currentStudentId && item.testType === type);
  const wrongIds = getWrongIdsForType(type);
  const starred = getStarredIds(type);
  return sourceQuestions.map(q => {
    const itemHistory = history.filter(item => String(item.questionId) === String(q.id));
    const last = itemHistory[itemHistory.length - 1];
    const isWrong = wrongIds.includes(String(q.id)) || (last && !last.correct);
    const status = isWrong ? "review" : (last && last.correct ? "mastered" : "unlearned");
    return { question: q, status, starred: starred.includes(String(q.id)), last };
  });
}

function getWrongIdsForType(type) {
  try {
    return JSON.parse(localStorage.getItem(getWrongKey(type))) || [];
  } catch {
    return [];
  }
}

function getStarredKey(type) {
  return `${STORAGE_KEYS.starredPrefix}_${type}_${currentStudentId || "unknown"}`;
}

function getStarredIds(type) {
  try {
    return JSON.parse(localStorage.getItem(getStarredKey(type))) || [];
  } catch {
    return [];
  }
}

function toggleStarredItem(type, id) {
  const key = getStarredKey(type);
  const ids = getStarredIds(type);
  const textId = String(id);
  const next = ids.includes(textId) ? ids.filter(v => v !== textId) : [...ids, textId];
  localStorage.setItem(key, JSON.stringify(next));
  renderLocalReviewDashboard();
}

function renderLocalReviewPanels(statuses) {
  const list = document.getElementById("localReviewListPanel");
  const summary = document.getElementById("localReviewSummaryPanel");
  if (!list || !summary) return;
  summary.classList.toggle("hidden", activeLocalReviewTab === "list");
  list.classList.toggle("hidden", activeLocalReviewTab !== "list");

  if (activeLocalReviewTab !== "list") {
    const insight = document.getElementById("localReviewInsightArea");
    const weak = statuses.filter(item => item.status === "review").slice(0, 3);
    if (insight) {
      insight.innerHTML = weak.length ? `
        <div class="local-insight-card">
          <strong>今日の弱点トップ${weak.length}</strong>
          ${weak.map(item => `<p>・${escapeHtml(item.question.word || item.question.question || item.question.prompt || item.question.id)}</p>`).join("")}
        </div>
      ` : `<div class="local-insight-card"><strong>良い状態です</strong><p>要復習が少ない場合は、未学習・ランダムで回転数を増やしましょう。</p></div>`;
    }
    return;
  }

  list.innerHTML = statuses.map(item => {
    const label = item.status === "mastered" ? "習得済" : item.status === "review" ? "要復習" : "未学習";
    return `
      <div class="local-review-row ${item.status}">
        <button class="star-button ${item.starred ? "active" : ""}" data-star-id="${escapeHtml(item.question.id)}">?</button>
        <div><strong>${escapeHtml(item.question.word || item.question.question || item.question.prompt || item.question.id)}</strong><span>${escapeHtml(label)} / ${escapeHtml(item.question.section || "")}</span></div>
        <button class="small-button secondary-button" data-study-id="${escapeHtml(item.question.id)}">1問</button>
      </div>`;
  }).join("");
  list.querySelectorAll("[data-star-id]").forEach(button => button.addEventListener("click", () => toggleStarredItem(activeLocalReviewType, button.dataset.starId)));
  list.querySelectorAll("[data-study-id]").forEach(button => button.addEventListener("click", () => startSingleLocalReview(button.dataset.studyId)));
}

function setLocalReviewTab(tab) {
  activeLocalReviewTab = tab;
  document.querySelectorAll(".local-tab-button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  renderLocalReviewDashboard();
}

function cycleLocalReviewType(direction) {
  const types = getReviewableTypes();
  const current = Math.max(0, types.indexOf(activeLocalReviewType));
  activeLocalReviewType = types[(current + direction + types.length) % types.length];
  renderLocalReviewDashboard();
}

function toggleLocalReviewSettings(open) {
  const panel = document.getElementById("localReviewSettingsPanel");
  if (panel) panel.classList.toggle("hidden", !open);
}

function getLocalReviewSettings() {
  const defaults = {
    includeMastered: true,
    includeReview: true,
    includeStarred: true,
    includeWrong: true,
    includeUnlearned: true,
    count: 1000,
    unlearnedMethod: "quiz",
    reviewMethod: "quiz",
    listMethod: "quiz"
  };
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(STORAGE_KEYS.localReviewSettings)) || {}) };
  } catch {
    return defaults;
  }
}

function loadLocalReviewSettingsToForm() {
  const settings = getLocalReviewSettings();
  const map = {
    localIncludeMastered: settings.includeMastered,
    localIncludeReview: settings.includeReview,
    localIncludeStarred: settings.includeStarred,
    localIncludeWrong: settings.includeWrong,
    localIncludeUnlearned: settings.includeUnlearned
  };
  Object.entries(map).forEach(([id, checked]) => {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
  });
  setText("localReviewCountDisplay", `${settings.count}問`);
  setRadioValue("localUnlearnedMethod", settings.unlearnedMethod);
  setRadioValue("localReviewMethod", settings.reviewMethod);
  setRadioValue("localListMethod", settings.listMethod);
}

function saveLocalReviewSettingsFromForm() {
  const settings = getLocalReviewSettings();
  settings.includeMastered = Boolean(document.getElementById("localIncludeMastered")?.checked);
  settings.includeReview = Boolean(document.getElementById("localIncludeReview")?.checked);
  settings.includeStarred = Boolean(document.getElementById("localIncludeStarred")?.checked);
  settings.includeWrong = Boolean(document.getElementById("localIncludeWrong")?.checked);
  settings.includeUnlearned = Boolean(document.getElementById("localIncludeUnlearned")?.checked);
  settings.unlearnedMethod = getRadioValue("localUnlearnedMethod") || "quiz";
  settings.reviewMethod = getRadioValue("localReviewMethod") || "quiz";
  settings.listMethod = getRadioValue("localListMethod") || "quiz";
  localStorage.setItem(STORAGE_KEYS.localReviewSettings, JSON.stringify(settings));
  renderLocalReviewDashboard();
}

function changeLocalReviewCount(amount) {
  const settings = getLocalReviewSettings();
  settings.count = Math.max(10, Math.min(2000, Number(settings.count || 1000) + amount));
  localStorage.setItem(STORAGE_KEYS.localReviewSettings, JSON.stringify(settings));
  loadLocalReviewSettingsToForm();
}

function resetLocalReviewSettings() {
  localStorage.removeItem(STORAGE_KEYS.localReviewSettings);
  renderLocalReviewDashboard();
}

async function startLocalReviewQuiz(mode = "review") {
  bossBattleState = null;
  const type = activeLocalReviewType;
  const sourceQuestions = await ensureQuestionsLoaded(type);
  const settings = getLocalReviewSettings();
  const isSettingScreenContext = type === testType && !document.getElementById("settingScreen")?.classList.contains("hidden");
  let statuses = getLocalReviewStatuses(type, sourceQuestions);

  if (isSettingScreenContext) {
    statuses = filterStatusesBySelectedSection(statuses);
  }

  if (mode === "review") {
    statuses = getFilteredLocalReviewStatuses(statuses, settings);
  }

  let pool = statuses.map(item => item.question);
  if (!pool.length) return alert("条件に合う問題がありません。設定を変更してください。");
  testType = type;
  reviewMode = mode !== "random";

  const limit = isSettingScreenContext ? getConfiguredPracticeCount(pool.length) : Math.min(settings.count, pool.length);
  pool = orderQuestionsForMode(type, pool);
  questions = pool.slice(0, limit);
  startQuizCommon();
}

async function startSingleLocalReview(id) {
  bossBattleState = null;
  const sourceQuestions = await ensureQuestionsLoaded(activeLocalReviewType);
  const q = sourceQuestions.find(item => String(item.id) === String(id));
  if (!q) return;
  testType = activeLocalReviewType;
  reviewMode = true;
  document.getElementById("timeLimitSelect").value = String(TEST_CONFIG[testType].defaultTime || 0);
  questions = [q];
  startQuizCommon();
}

function retryCurrentMistakes() {
  bossBattleState = null;
  if (!lastMistakeQuestions.length) return alert("今回解き直すミスはありません。");
  reviewMode = true;
  questions = orderQuestionsForMode(testType, lastMistakeQuestions);
  startQuizCommon();
}

function getRadioValue(name) {
  return document.querySelector(`input[name='${name}']:checked`)?.value || "";
}

function setRadioValue(name, value) {
  const el = document.querySelector(`input[name='${name}'][value='${value}']`);
  if (el) el.checked = true;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateMistakeCountInSettings() {
  const countText = document.getElementById("settingMistakeCount");
  if (!countText) return;
  countText.textContent = `保存された間違い：${getWrongIds().length}問`;
}

