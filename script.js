/* =========================================================
   学習ツール script.js
   - 管理者ログイン: 9999
   - 学習者コード: Google Sheets / Apps Script の AccessCodes で管理
   - 許可教材だけ表示 / 1教材なら直接表示
   - CSV教材、語順並べ替え、穴埋め、Writing提出、履歴送信に対応
========================================================= */

const ADMIN_PASSWORD = "9999";
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbws03Pj4a2ojmA-ihgTrC3HM4FHZjPunJnjRkALqTzMhDGVeSqplY56wdS7xGNAaDww/exec";
const AUTO_NEXT_DELAY_MS = 1600;
const USE_LOCAL_ONLY = false; // false: localStorageに保存しつつ、Apps Scriptへ1問ごとに送信
const USE_PER_QUESTION_SYNC = true; // USE_LOCAL_ONLY=false の場合、1問ごとに軽く送信して結果画面の待ち時間を減らす

const STORAGE_KEYS = {
  sessionStudent: "learningTool_sessionStudent",
  sessionName: "learningTool_sessionName",
  sessionAccessCode: "learningTool_sessionAccessCode",
  allowedMaterials: "learningTool_allowedMaterials",
  featureFlags: "learningTool_featureFlags",
  answerHistory: "learningTool_answerHistory",
  writingHistory: "learningTool_writingHistory",
  localReviewSettings: "learningTool_localReviewSettings",
  starredPrefix: "learningTool_starredItems",
  streak: "learningTool_streak",
  streakPrefix: "learningTool_streak",
  wrongItemsPrefix: "learningTool_wrongItems",
  legacyWrongPrefix: "wrongWords",
  soundEnabled: "learningTool_soundEnabled"
};

const SENTENCE_FILES = [
  "data/sentence_order/sentence_order_1_100.csv",
  "data/sentence_order/sentence_order_101_200.csv"
];

const POLARIS3_FILES = [
  "data/highschool/polaris3_lesson7.csv",
  "data/highschool/polaris3_lesson8.csv",
  "data/highschool/polaris3_lesson9.csv",
  "data/highschool/polaris3_lesson10.csv",
  "data/highschool/polaris3_lesson11.csv",
  "data/highschool/polaris3_lesson12.csv"
];

const CATEGORY_INFO = {
  toeic: { label: "TOEIC", description: "Speaking/Writingで使う表現を瞬発的に出す", theme: "toeic", icon: "🎙️" },
  toefl: { label: "TOEFL", description: "アカデミック英語・語順アウトプット", theme: "toefl", icon: "🎓" },
  highschool: { label: "高校英語", description: "語彙・文法・英検対策", theme: "highschool", icon: "📚" },
  classics: { label: "古文", description: "古典単語・文法・古文常識", theme: "classics", icon: "🌸" },
  teacher: { label: "教師用問題", description: "英語教育理論・授業研究用の確認問題", theme: "teacher", icon: "🧑‍🏫" },
  eiken: { label: "英検", description: "英検準一級Writing対策", theme: "eiken", icon: "✍️" }
};

const TEST_CONFIG = {
  vocab: {
    title: "Stock 3000 単語テスト",
    category: "highschool",
    type: "choice",
    password: "3000",
    defaultTime: 15,
    path: "data/vocab/stock_3000_master.csv",
    review: true,
    description: "単語の意味を素早く確認します。迷った問題は間違い復習に保存されます。"
  },
  sokudokuVocab: {
    title: "速読英単語",
    category: "highschool",
    type: "choice",
    password: "5000",
    defaultTime: 15,
    path: "data/vocab/sokudoku_vocab.csv",
    review: true,
    description: "速読英単語の単語ページから作成した語彙問題を練習します。"
  },
  target1900Vocab: {
    title: "ターゲット1900 単語テスト",
    category: "highschool",
    type: "choice",
    password: "1900",
    defaultTime: 15,
    path: "data/vocab/target_1900.csv",
    review: true,
    description: "ターゲット1900の語彙をテンポよく確認します。"
  },
  polaris3: {
    title: "ポラリス3 読解問題",
    category: "highschool",
    type: "choice",
    password: "3103",
    defaultTime: 60,
    manifest: "data/highschool/polaris3_manifest.csv",
    files: POLARIS3_FILES,
    review: true,
    keepOrder: true,
    description: "ポラリス3 Lesson 7〜12 の読解問題を練習します。"
  },
  sentence: {
    title: "語順並べ替えテスト",
    category: "toefl",
    type: "sentence",
    password: "1200",
    defaultTime: 45,
    files: SENTENCE_FILES,
    description: "TOEFL型の英語アウトプット準備として、語順を正確に組み立てます。"
  },
  eikenConnectors: {
    title: "英検準一級 接続詞対策",
    category: "eiken",
    type: "choice",
    password: "1790",
    defaultTime: 30,
    path: "data/eiken/eiken_connectors.csv",
    description: "英検準一級Writingで使いやすい接続詞・因果表現を英文穴埋めで確認します。"
  },
  eikenWriting: {
    title: "英検準一級 Writing 提出",
    category: "eiken",
    type: "writing",
    password: "1791",
    defaultTime: 0,
    path: "data/eiken/eiken_writing_tasks.csv",
    description: "英検準一級Writingの答案を提出します。採点は行わず、この端末内に保存します。"
  },
  monitor: {
    title: "TOEIC S&W モニター練習",
    category: "toeic",
    type: "choice",
    password: "2180",
    defaultTime: 45,
    path: "data/monitor/monitor_questions.csv",
    description: "TOEIC S&Wで使いやすい自然な表現を選びます。"
  },
  speakingReview: {
    title: "TOEIC Speaking 復習（語順並べ替え）",
    category: "toeic",
    type: "sentence",
    password: "2180",
    defaultTime: 45,
    files: ["data/speaking_review/toeic_speaking_review_sentence.csv"],
    description: "これまでのSpeaking/Writingの誤答から、正しいチャンクを語順で再構成します。"
  },
  speakingReviewCloze: {
    title: "TOEIC Speaking 復習（穴埋め）",
    category: "toeic",
    type: "cloze",
    password: "2180",
    defaultTime: 30,
    path: "data/speaking_review/toeic_speaking_review_cloze.csv",
    description: "正しい表現の一部を自分で書き出し、瞬発的に使えるチャンクを増やします。"
  },
  speakingErrorCorrection: {
    title: "TOEIC Speaking 復習（誤り発見→修正）",
    category: "toeic",
    type: "errorCorrection",
    password: "2180",
    defaultTime: 45,
    path: "data/speaking_review/toeic_error_correction.csv",
    review: true,
    description: "Speaking/Writingの誤りを、誤り発見→修正の2段階で直します。"
  },
  opinionTemplate4: {
    title: "TOEIC Opinion 4文テンプレ完成",
    category: "toeic",
    type: "cloze",
    password: "2180",
    defaultTime: 25,
    path: "data/speaking_review/toeic_opinion_template4.csv",
    review: true,
    description: "短く正確に話すため、Opinionの4文テンプレに必要な表現を穴埋めで固定します。"
  },
  opinionParaphrase: {
    title: "TOEIC Opinion 言い換え練習",
    category: "toeic",
    type: "cloze",
    password: "2180",
    defaultTime: 25,
    path: "data/speaking_review/toeic_opinion_paraphrase.csv",
    review: true,
    description: "これまでの直訳・不自然表現を、自然なTOEIC S&W表現へ言い換えます。"
  },
  phrasalVerbs: {
    title: "Phrasal Verbs / 実用チャンク",
    category: "toeic",
    type: "choice",
    password: "2180",
    defaultTime: 25,
    path: "data/speaking_review/phrasal_verbs.csv",
    review: true,
    description: "TOEIC/IELTSソースから、アウトプットで使える句動詞・定型表現を確認します。"
  },
  englishTheory: {
    title: "英語教育理論",
    category: "teacher",
    type: "choice",
    password: "3303",
    defaultTime: 30,
    path: "data/english_theory/sla_theory_map.csv",
    review: true,
    description: "SLA Chapter 3・Chapter 5 の重要概念を四択で確認します。"
  },
  statisticsQuestions: {
    title: "統計：基礎概念確認",
    category: "teacher",
    type: "choice",
    password: "3303",
    defaultTime: 35,
    path: "data/teacher/statistics_questions.csv",
    review: true,
    description: "研究で必要な統計概念を確認します。"
  },
  writingTheoryChapter4: {
    title: "ライティング理論 Chapter 4",
    category: "teacher",
    type: "choice",
    password: "3303",
    defaultTime: 35,
    path: "data/teacher/writing_theory_chapter4.csv",
    review: true,
    description: "L2 writing / literacy 理論を確認します。"
  },
  writingTheoryMap: {
    title: "ライティング理論 詳細マップ",
    category: "teacher",
    type: "choice",
    password: "3303",
    defaultTime: 40,
    path: "data/teacher/writing_theory_map.csv",
    review: true,
    description: "Chapter 4 の論点をページ・概念ごとに復習します。"
  },
  presentationBuilderTasks: {
    title: "プレゼン作成トレーニング",
    category: "teacher",
    type: "choice",
    password: "3303",
    defaultTime: 30,
    path: "data/teacher/presentation_builder_tasks.csv",
    review: true,
    description: "資料読解からスライド化する流れを確認します。"
  },
  classicalWords: {
    title: "古典単語",
    category: "classics",
    type: "choice",
    password: "1110",
    defaultTime: 15,
    path: "data/classics/classical_words.csv",
    review: true,
    description: "古典単語の意味をテンポよく確認します。"
  },
  classicalGrammar: {
    title: "古典文法",
    category: "classics",
    type: "choice",
    password: "2220",
    defaultTime: 30,
    path: "data/classics/classical_grammar.csv",
    description: "助動詞・敬語・識別などを確認します。"
  },
  classicalKnowledge: {
    title: "古文常識",
    category: "classics",
    type: "choice",
    password: "3330",
    defaultTime: 20,
    path: "data/classics/classical_knowledge.csv",
    description: "古文常識を選択問題で確認します。"
  }
};


const DEFAULT_FEATURE_FLAGS = Object.freeze({
  learningTree: true,
  zodiac: true,
  boss: true
});

const FEATURE_FLAG_DEFINITIONS = Object.freeze([
  { key: "learningTree", param: "learningTreeEnabled", label: "学習の木", description: "ホームや教材画面の木の成長表示" },
  { key: "zodiac", param: "zodiacEnabled", label: "十二支", description: "日替わり十二支キャラクター" },
  { key: "boss", param: "bossEnabled", label: "ボス", description: "50問ごとのボスバトル" }
]);

let featureFlags = { ...DEFAULT_FEATURE_FLAGS };

function normalizeFeatureFlags(value = {}) {
  let source = value;
  if (typeof source === "string") {
    const text = source.trim();
    if (!text) {
      source = {};
    } else {
      try { source = JSON.parse(text); } catch { source = {}; }
    }
  }
  if (!source || typeof source !== "object") source = {};

  const pick = keys => {
    for (const key of keys) {
      if (source[key] !== undefined) return source[key];
    }
    return undefined;
  };

  return {
    learningTree: toFeatureFlagBoolean(pick(["learningTree", "learningTreeEnabled", "tree", "treeEnabled"]), true),
    zodiac: toFeatureFlagBoolean(pick(["zodiac", "zodiacEnabled"]), true),
    boss: toFeatureFlagBoolean(pick(["boss", "bossEnabled"]), true)
  };
}

function toFeatureFlagBoolean(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const text = String(value).trim().toLowerCase();
  if (["false", "0", "off", "no", "disabled", "hide", "hidden", "無効", "非表示", "オフ"].includes(text)) return false;
  if (["true", "1", "on", "yes", "enabled", "show", "visible", "有効", "表示", "オン"].includes(text)) return true;
  return defaultValue;
}

function setFeatureFlags(nextFlags = {}) {
  featureFlags = normalizeFeatureFlags(nextFlags);
  applyFeatureVisibilityFlags();
  return featureFlags;
}

function getEffectiveFeatureFlags() {
  return isAdmin ? { ...DEFAULT_FEATURE_FLAGS } : normalizeFeatureFlags(featureFlags);
}

function isFeatureEnabled(key) {
  return getEffectiveFeatureFlags()[key] !== false;
}

function featureFlagParams(flags = featureFlags) {
  const normalized = normalizeFeatureFlags(flags);
  return {
    learningTreeEnabled: normalized.learningTree,
    zodiacEnabled: normalized.zodiac,
    bossEnabled: normalized.boss
  };
}

function applyFeatureVisibilityFlags() {
  if (typeof document === "undefined" || !document.body) return;
  const flags = getEffectiveFeatureFlags();
  document.body.classList.toggle("feature-learning-tree-off", flags.learningTree === false);
  document.body.classList.toggle("feature-zodiac-off", flags.zodiac === false);
  document.body.classList.toggle("feature-boss-off", flags.boss === false);
}

let currentStudentId = "";
let currentStudentName = "";
let currentAccessCode = "";
let allowedMaterials = null;
let isAdmin = false;
let pendingMaterialType = "";
let testType = "";
let reviewMode = false;
let loadedQuestions = {};
let questions = [];
let currentIndex = 0;
let score = 0;
let selectedChoice = "";
let answersLog = [];
let mistakes = [];
let startTime = null;
let questionStartTime = null;
let selectedTimeLimit = 0;
let selectedAutoNextDelay = AUTO_NEXT_DELAY_MS;
let timerId = null;
let remainingSeconds = 0;
let autoAdvanceTimerId = null;
let toeicCalendar = [];
let writingTasks = [];
let writingStartTime = null;
let errorCorrectionPhase = "identify";
let lastMistakeQuestions = [];
let quizCorrectStreak = 0;
let bestCorrectStreak = 0;
let bossBattleState = null;
let activeLocalReviewType = "vocab";
let activeLocalReviewTab = "mastery";
let settingReviewListVisible = false;



/* =========================
   初期化・イベント登録
========================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeUiEnhancements();
  safeAddEvent("loginButton", "click", checkLogin);
  safeAddEvent("passwordInput", "keydown", event => { if (event.key === "Enter") checkLogin(); });
  safeAddEvent("showPassword", "change", function () { togglePasswordField("passwordInput", this.checked); });

  safeAddEvent("studentLoginButton", "click", checkStudentLogin);
  safeAddEvent("studentLoginInput", "keydown", event => { if (event.key === "Enter") checkStudentLogin(); });
  safeAddEvent("showStudentPassword", "change", function () { togglePasswordField("studentLoginInput", this.checked); });
  safeAddEvent("studentBackButton", "click", () => showOnly("loginScreen"));

  safeAddEvent("accessManagerButton", "click", openAccessManager);
  safeAddEvent("accessBackButton", "click", () => { renderMenu(); showOnly("menuScreen"); });
  safeAddEvent("createAccessCodeButton", "click", createAccessCodeFromForm);
  safeAddEvent("refreshAccessCodesButton", "click", loadAccessCodeList);

  safeAddEvent("showMaterialPassword", "change", function () { togglePasswordField("materialPasswordInput", this.checked); });
  safeAddEvent("materialPasswordButton", "click", checkMaterialPassword);
  safeAddEvent("materialPasswordInput", "keydown", event => { if (event.key === "Enter") checkMaterialPassword(); });
  safeAddEvent("materialPasswordBackButton", "click", () => showOnly("menuScreen"));

  safeAddEvent("calendarBackButton", "click", () => showOnly("menuScreen"));
  safeAddEvent("resetCalendarButton", "click", resetCalendarChecks);

  safeAddEvent("historyBackButton", "click", () => showOnly("menuScreen"));
  safeAddEvent("historySearchInput", "input", renderHistory);
  safeAddEvent("exportHistoryButton", "click", exportHistoryCSV);
  safeAddEvent("clearHistoryButton", "click", clearHistory);
  safeAddEvent("adminHistoryButton", "click", openHistoryScreen);
  safeAddEvent("scrollToMaterialsButton", "click", () => document.getElementById("materialShelf")?.scrollIntoView({ behavior: "smooth", block: "start" }));

  safeAddEvent("questionCountSelect", "change", () => {
    toggleCustomQuestionInput();
    renderSettingProgressDashboard(testType);
  });
  safeAddEvent("customQuestionCountInput", "input", () => renderSettingProgressDashboard(testType));
  safeAddEvent("sectionSelect", "change", () => renderSettingProgressDashboard(testType));
  safeAddEvent("startButton", "click", startNormalQuiz);
  safeAddEvent("reviewButton", "click", startReviewQuiz);
  safeAddEvent("clearStoredMistakesButton", "click", clearStoredMistakes);
  safeAddEvent("backToMenuButton", "click", () => { renderMenu(); showOnly("menuScreen"); });
  safeAddEvent("settingProgressRefreshButton", "click", () => renderSettingProgressDashboard(testType));
  safeAddEvent("settingReviewRandomButton", "click", () => startSettingReviewQuiz("random"));
  safeAddEvent("settingReviewReviewButton", "click", () => startSettingReviewQuiz("review"));
  safeAddEvent("settingReviewListToggleButton", "click", toggleSettingReviewList);
  safeAddEvent("settingReviewCountMinus", "click", () => changeSettingReviewCount(-100));
  safeAddEvent("settingReviewCountPlus", "click", () => changeSettingReviewCount(100));
  ["settingIncludeMastered", "settingIncludeReview", "settingIncludeStarred", "settingIncludeWrong", "settingIncludeUnlearned"].forEach(id => {
    safeAddEvent(id, "change", () => { saveSettingReviewSettingsFromForm(); renderSettingProgressDashboard(testType); });
  });

  safeAddEvent("writingBackButton", "click", () => { renderMenu(); showOnly("menuScreen"); });
  safeAddEvent("writingTaskSelect", "change", renderSelectedWritingTask);
  safeAddEvent("writingText", "input", updateWritingWordCount);
  safeAddEvent("submitWritingButton", "click", submitWriting);

  safeAddEvent("checkButton", "click", checkAnswer);
  safeAddEvent("nextButton", "click", nextQuestion);
  safeAddEvent("quitButton", "click", quitQuiz);

  safeAddEvent("restartButton", "click", () => {
    resetQuizState();
    openSettings(testType);
  });
  safeAddEvent("retryMistakesButton", "click", retryCurrentMistakes);
  document.addEventListener("keydown", handleQuizKeyboard);

  safeAddEvent("localReviewBackButton", "click", () => { renderMenu(); showOnly("menuScreen"); });
  safeAddEvent("localReviewSettingsButton", "click", () => toggleLocalReviewSettings(true));
  safeAddEvent("localReviewCloseSettingsButton", "click", () => toggleLocalReviewSettings(false));
  safeAddEvent("localReviewDoneSettingsButton", "click", () => toggleLocalReviewSettings(false));
  safeAddEvent("localReviewResetButton", "click", resetLocalReviewSettings);
  safeAddEvent("localReviewCountMinus", "click", () => changeLocalReviewCount(-100));
  safeAddEvent("localReviewCountPlus", "click", () => changeLocalReviewCount(100));
  safeAddEvent("localReviewRandomButton", "click", () => startLocalReviewQuiz("random"));
  safeAddEvent("localReviewReviewButton", "click", () => startLocalReviewQuiz("review"));
  safeAddEvent("localReviewPrevTypeButton", "click", () => cycleLocalReviewType(-1));
  safeAddEvent("localReviewNextTypeButton", "click", () => cycleLocalReviewType(1));
  safeAddEvent("localReviewFooterMasteryButton", "click", () => setLocalReviewTab("mastery"));
  safeAddEvent("localReviewFooterListButton", "click", () => setLocalReviewTab("list"));
  safeAddEvent("localReviewFooterReviewButton", "click", () => setLocalReviewTab("review"));

  safeAddEvent("resultMenuButton", "click", () => {
    resetQuizState();
    renderMenu();
    showOnly("menuScreen");
  });
  safeAddEvent("logoutButton", "click", logout);
  safeAddEvent("soundToggleButton", "click", toggleSoundSetting);

  initSoundToggle();
  restoreSession();
  if (currentStudentId) {
    renderMenu();
    showOnly("menuScreen");
  }
});


function initializeUiEnhancements() {
  ["passwordInput", "studentLoginInput", "materialPasswordInput"].forEach(id => togglePasswordField(id, false));

  const adminArea = document.getElementById("adminQuickArea");
  if (adminArea && !document.getElementById("adminHistoryButton")) {
    const button = document.createElement("button");
    button.id = "adminHistoryButton";
    button.className = "admin-card";
    button.textContent = "解答履歴を確認";
    adminArea.appendChild(button);
  }

  const resultMenuButton = document.getElementById("resultMenuButton");
  if (resultMenuButton && !document.getElementById("retryMistakesButton")) {
    const button = document.createElement("button");
    button.id = "retryMistakesButton";
    button.className = "secondary-button hidden";
    button.textContent = "今回のミスを解き直す";
    resultMenuButton.parentNode.insertBefore(button, resultMenuButton);
  }

  ensureBossBattleArea();
  safeAddEvent("bossBattleButton", "click", startBossQuiz);

  document.querySelectorAll(".local-review-condition").forEach(box => {
    box.addEventListener("change", saveLocalReviewSettingsFromForm);
  });
  document.querySelectorAll("input[name='localUnlearnedMethod'], input[name='localReviewMethod'], input[name='localListMethod']").forEach(radio => {
    radio.addEventListener("change", saveLocalReviewSettingsFromForm);
  });
}

function safeAddEvent(id, event, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener(event, handler);
}



/* =========================
   API
========================= */

function apiGetJsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!GAS_WEB_APP_URL) {
      reject(new Error("GAS_WEB_APP_URL が未設定です。"));
      return;
    }

    const callbackName = `jsonpCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const url = new URL(GAS_WEB_APP_URL);

    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) url.searchParams.set(key, value.join(","));
      else url.searchParams.set(key, value == null ? "" : String(value));
    });

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Apps Scriptから応答がありません。デプロイ設定を確認してください。"));
    }, 15000);

    window[callbackName] = data => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("Apps Scriptへの接続に失敗しました。"));
    };

    function cleanup() {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function apiPostNoCors(payload) {
  if (!GAS_WEB_APP_URL) return false;
  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return true;
}



/* =========================
   ログイン
========================= */

function getTodayPassword() {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
}

async function checkLogin() {
  const input = document.getElementById("passwordInput").value.trim();
  const message = document.getElementById("loginMessage");
  if (message) message.textContent = "";

  if (!input) {
    if (message) message.textContent = "パスワードまたは学習者コードを入力してください。";
    return;
  }

  if (input === ADMIN_PASSWORD) {
    loginAsAdmin();
    return;
  }

  // 従来方式：当日4桁 → 学習者番号入力画面
  if (input === getTodayPassword()) {
    currentStudentId = "";
    currentStudentName = "";
    currentAccessCode = "";
    allowedMaterials = null;
    setFeatureFlags(DEFAULT_FEATURE_FLAGS);
    isAdmin = false;
    if (message) message.textContent = "";
    showOnly("studentScreen");
    return;
  }

  // 新方式：管理者が発行した学習者コードを照合
  try {
    if (message) message.textContent = "学習者コードを確認しています...";
    const result = await apiGetJsonp("validateAccessCode", { code: input });
    if (!result || !result.valid) {
      if (message) message.textContent = result?.error || "この学習者コードは使えません。";
      return;
    }
    loginWithAccessCode(result);
  } catch (error) {
    console.error(error);
    if (message) message.textContent = "学習者コードの確認に失敗しました。Apps Scriptのデプロイを確認してください。";
  }
}

function loginAsAdmin() {
  currentStudentId = ADMIN_PASSWORD;
  currentStudentName = "管理者";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = true;
  setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  saveSession();
  document.getElementById("loginMessage").textContent = "";
  renderMenu();
  showOnly("menuScreen");
}

function loginWithAccessCode(result) {
  currentStudentId = result.studentId || "";
  currentStudentName = result.studentName || "";
  currentAccessCode = result.code || "";
  allowedMaterials = Array.isArray(result.allowedMaterials) ? result.allowedMaterials : [];
  isAdmin = false;
  setFeatureFlags(result.featureFlags || result);
  saveSession();

  if (allowedMaterials.length === 1) {
    openMaterial(allowedMaterials[0], true);
    return;
  }

  renderMenu();
  showOnly("menuScreen");
}

function checkStudentLogin() {
  const input = document.getElementById("studentLoginInput").value.trim();
  const message = document.getElementById("studentLoginMessage");

  if (!/^\d{4}$/.test(input)) {
    if (message) message.textContent = "4桁の数字を入力してください。";
    return;
  }

  if (input === ADMIN_PASSWORD) {
    loginAsAdmin();
    return;
  }

  currentStudentId = input;
  currentStudentName = "";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = false;
  setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  saveSession();
  if (message) message.textContent = "";
  renderMenu();
  showOnly("menuScreen");
}

function saveSession() {
  localStorage.setItem(STORAGE_KEYS.sessionStudent, currentStudentId);
  localStorage.setItem(STORAGE_KEYS.sessionName, currentStudentName || "");
  localStorage.setItem(STORAGE_KEYS.sessionAccessCode, currentAccessCode || "");
  localStorage.setItem(STORAGE_KEYS.allowedMaterials, JSON.stringify(allowedMaterials));
  localStorage.setItem(STORAGE_KEYS.featureFlags, JSON.stringify(normalizeFeatureFlags(featureFlags)));
}

function restoreSession() {
  const student = localStorage.getItem(STORAGE_KEYS.sessionStudent);
  if (!student) return;
  currentStudentId = student;
  currentStudentName = localStorage.getItem(STORAGE_KEYS.sessionName) || "";
  currentAccessCode = localStorage.getItem(STORAGE_KEYS.sessionAccessCode) || "";
  try { allowedMaterials = JSON.parse(localStorage.getItem(STORAGE_KEYS.allowedMaterials)); } catch { allowedMaterials = null; }
  try { featureFlags = normalizeFeatureFlags(JSON.parse(localStorage.getItem(STORAGE_KEYS.featureFlags) || "{}")); } catch { featureFlags = { ...DEFAULT_FEATURE_FLAGS }; }
  isAdmin = currentStudentId === ADMIN_PASSWORD;
  applyFeatureVisibilityFlags();
}

function logout() {
  currentStudentId = "";
  currentStudentName = "";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = false;
  setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  localStorage.removeItem(STORAGE_KEYS.sessionStudent);
  localStorage.removeItem(STORAGE_KEYS.sessionName);
  localStorage.removeItem(STORAGE_KEYS.sessionAccessCode);
  localStorage.removeItem(STORAGE_KEYS.allowedMaterials);
  localStorage.removeItem(STORAGE_KEYS.featureFlags);
  document.getElementById("passwordInput").value = "";
  document.getElementById("studentLoginInput").value = "";
  showOnly("loginScreen");
}

function togglePasswordField(id, checked) {
  const field = document.getElementById(id);
  if (field) field.type = checked ? "text" : "password";
}



/* =========================
   音声設定・ゲーム型ホーム
========================= */

function initSoundToggle() {
  if (localStorage.getItem(STORAGE_KEYS.soundEnabled) === null) {
    localStorage.setItem(STORAGE_KEYS.soundEnabled, "true");
  }
  updateSoundToggleUI();
}

function isSoundEnabled() {
  return localStorage.getItem(STORAGE_KEYS.soundEnabled) !== "false";
}

function toggleSoundSetting() {
  localStorage.setItem(STORAGE_KEYS.soundEnabled, String(!isSoundEnabled()));
  updateSoundToggleUI();
}

function updateSoundToggleUI() {
  const button = document.getElementById("soundToggleButton");
  if (!button) return;
  const enabled = isSoundEnabled();
  button.textContent = enabled ? "音声：ON" : "音声：OFF";
  button.setAttribute("aria-pressed", String(enabled));
  button.classList.toggle("sound-off", !enabled);
}

function renderGameHomeHero() {
  const area = document.getElementById("gameHomeHero");
  if (!area || !currentStudentId) return;
  const history = getCurrentStudentHistory();
  const todayKey = getDateKey(new Date());
  const today = history.filter(item => item.dateKey === todayKey);
  const correct = history.filter(item => item.correct).length;
  const total = history.length;
  const level = Math.max(1, Math.floor(correct / 25) + 1);
  const nextNeed = 25 - (correct % 25 || 25);
  const rank = level >= 8 ? "Master Learner" : level >= 4 ? "Quest Learner" : "New Adventurer";
  const xpPercent = Math.min(100, (correct % 25) * 4);

  area.innerHTML = `
    <div class="game-hero-copy">
      <span class="panel-label">AI Learning Tool</span>
      <h3>今日のLearning Quest</h3>
      <p>このホームは、ゲームのような達成感を足しながら、点数だけでなく「使える知識」「復習」「継続」を見える化するためのオリジナル設計です。</p>
      <div class="hero-action-row">
        <button id="heroMaterialButton" type="button">教材へ</button>
        <span class="hero-rank">Lv.${level} / ${escapeHtml(rank)}</span>
      </div>
    </div>
    <div class="quest-status-card">
      <span>Today</span>
      <strong>${today.length}問</strong>
      <small>次のレベルまで ${nextNeed} 正解</small>
      <div class="quest-xp"><i style="width:${xpPercent}%"></i></div>
      <p>${total ? `累計 ${total}問・正解 ${correct}問` : "まずは1問から始められます。"}</p>
    </div>`;

  document.getElementById("heroMaterialButton")?.addEventListener("click", () => {
    document.getElementById("materialShelf")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}



/* =========================
   教材選択・カテゴリ表示
========================= */

function renderMenu() {
  applyFeatureVisibilityFlags();
  refreshDashboard();
  renderGameHomeHero();
  renderGrowthHome();
  renderHomeLearningCalendar();
  renderMaterialCategories();
  renderSyncNotice("checking");
  checkAppsScriptIntegration();
  updateSoundToggleUI();
  document.getElementById("adminQuickArea").classList.toggle("hidden", !isAdmin);
}

function getVisibleMaterials() {
  return Object.keys(TEST_CONFIG).filter(type => hasAccessToMaterial(type));
}

function hasAccessToMaterial(type) {
  if (isAdmin) return true;
  if (Array.isArray(allowedMaterials)) return allowedMaterials.includes(type);
  return true; // 従来方式の場合は、教材パスワードで制御
}

function renderMaterialCategories() {
  const area = document.getElementById("materialCategoryArea");
  const visible = getVisibleMaterials();
  const categoryOrder = ["toeic", "toefl", "highschool", "eiken", "classics", "teacher"];

  area.innerHTML = categoryOrder.map((categoryKey, index) => {
    const info = CATEGORY_INFO[categoryKey];
    const materials = visible.filter(type => TEST_CONFIG[type].category === categoryKey);
    let cards = materials.length
      ? materials.map(type => materialCardHtml(type)).join("")
      : `<div class="empty-category">現在利用できる教材はありません。</div>`;

    if (categoryKey === "toeic" && (isAdmin || !Array.isArray(allowedMaterials) || materials.length > 0)) {
      cards += `
        <div class="material-card-wrap utility-card-wrap">
          <button class="material-card accent-card" data-action="calendar">
            <span>計画</span>
            <strong>TOEIC S&amp;W 学習カレンダー</strong>
            <small>毎日の学習チェックを端末内に保存します。</small>
          </button>
        </div>
      `;
    }

    const openAttr = index === 0 || (materials.length && categoryKey === "highschool") ? "open" : "";
    return `
      <details class="category-section category-${info.theme}" ${openAttr}>
        <summary class="category-head">
          <div>
            <span class="category-title"><b class="category-icon">${escapeHtml(info.icon || "✨")}</b>${escapeHtml(info.label)}</span>
            <p>${escapeHtml(info.description)}</p>
          </div>
          <small class="category-tip">${materials.length}教材</small>
          <span class="accordion-marker" aria-hidden="true"></span>
        </summary>
        <div class="material-grid">${cards}</div>
      </details>
    `;
  }).join("");

  document.querySelectorAll(".material-card[data-material]").forEach(button => {
    button.addEventListener("click", () => openMaterial(button.dataset.material));
  });

  document.querySelectorAll(".material-progress-button[data-review-material]").forEach(button => {
    button.addEventListener("click", () => openSettings(button.dataset.reviewMaterial));
  });

  document.querySelectorAll("[data-action='calendar']").forEach(button => button.addEventListener("click", openCalendar));
  document.querySelectorAll("[data-action='history']").forEach(button => button.addEventListener("click", openHistoryScreen));
}


function getMaterialCharacterFile(type) {
  const featureIsOn = typeof isFeatureEnabled === "function" ? isFeatureEnabled : () => true;
  const treeOn = featureIsOn("learningTree");
  const zodiacOn = featureIsOn("zodiac");
  const treeTypes = ["speakingReview", "speakingReviewCloze", "phrasalVerbs", "vocab", "sokudokuVocab", "target1900Vocab", "polaris3"];
  const zodiacTypes = {
    speakingErrorCorrection: "zodiac-寅.svg",
    monitor: "zodiac-寅.svg",
    eikenConnectors: "zodiac-寅.svg",
    sentence: "zodiac-卯.svg",
    writingTheoryChapter4: "zodiac-卯.svg",
    writingTheoryMap: "zodiac-卯.svg",
    englishTheory: "zodiac-申.svg",
    statisticsQuestions: "zodiac-申.svg",
    presentationBuilderTasks: "zodiac-申.svg"
  };
  if (treeTypes.includes(type)) return treeOn ? "tree.svg" : "";
  if (zodiacTypes[type]) return zodiacOn ? zodiacTypes[type] : "";
  if (String(type || "").startsWith("classical")) return zodiacOn ? "zodiac-辰.svg" : "";
  if (treeOn) return "tree.svg";
  if (zodiacOn) return "zodiac-卯.svg";
  return "";
}

function materialCardHtml(type) {
  const config = TEST_CONFIG[type];
  const categoryLabel = CATEGORY_INFO[config.category]?.label || config.category;
  const history = getLocalHistory().filter(item => item.studentId === currentStudentId && item.testType === type);
  const correct = history.filter(item => item.correct).length;
  const total = history.length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const level = Math.max(1, Math.floor(correct / 20) + 1);
  const progress = Math.min(100, (correct % 20) * 5);
  const progressLabel = total ? `${accuracy}% / ${total}問` : "未学習";
  const characterFile = getMaterialCharacterFile(type);
  const characterHtml = characterFile
    ? `<img class="material-card-character" src="assets/characters/${escapeHtml(characterFile)}" alt="" loading="lazy" aria-hidden="true">`
    : "";
  return `
    <div class="material-card-wrap">
      <button class="material-card" data-material="${escapeHtml(type)}">
        <div class="material-card-main ${characterFile ? "" : "no-character"}">
          <div>
            <span class="material-tag">${escapeHtml(categoryLabel)}</span>
            <strong class="material-title">${escapeHtml(config.title)}</strong>
            <small>${escapeHtml(config.description || "")}</small>
            <div class="material-card-progress" aria-label="教材進捗">
              <b>Lv.${level}</b><i><u style="width:${progress}%"></u></i><em>${escapeHtml(progressLabel)}</em>
            </div>
          </div>
          ${characterHtml}
          <span class="material-card-arrow" aria-hidden="true">›</span>
        </div>
      </button>
    </div>
  `;
}

function isReviewDashboardSupported(type) {
  return Boolean(TEST_CONFIG[type] && TEST_CONFIG[type].type !== "writing");
}

function openMaterial(type, fromDirectLogin = false) {
  if (!currentStudentId) {
    showOnly("loginScreen");
    return;
  }

  if (!TEST_CONFIG[type]) {
    alert("教材設定が見つかりません。設定を確認してください。" + type);
    renderMenu();
    showOnly("menuScreen");
    return;
  }

  if (!hasAccessToMaterial(type)) {
    alert("この学習者コードでは、この教材は利用できません。管理者に確認してください。" );
    renderMenu();
    showOnly("menuScreen");
    return;
  }

  pendingMaterialType = type;

  // 管理者・学習者コード方式は教材パスワードを省略
  if (isAdmin || currentAccessCode) {
    openSettings(type);
    return;
  }

  // 従来方式だけ教材パスワードを使う
  const config = TEST_CONFIG[type];
  document.getElementById("materialPasswordTitle").textContent = `${config.title} のパスワード`;
  document.getElementById("materialPasswordInput").value = "";
  document.getElementById("materialPasswordMessage").textContent = "";
  showOnly("materialPasswordScreen");
}

function checkMaterialPassword() {
  const input = document.getElementById("materialPasswordInput").value.trim();
  const config = TEST_CONFIG[pendingMaterialType];
  if (!config) return;

  if (input === config.password || isAdmin) {
    document.getElementById("materialPasswordMessage").textContent = "";
    openSettings(pendingMaterialType);
  } else {
    document.getElementById("materialPasswordMessage").textContent = "教材パスワードが違います。";
  }
}

function applyThemeForMaterial(type) {
  const category = TEST_CONFIG[type]?.category || "highschool";
  document.body.classList.remove("theme-toeic", "theme-toefl", "theme-highschool", "theme-classics", "theme-eiken", "theme-teacher");

  // 教材ごとの見た目だけを切り替えるためのクラスです。
  // 問題データ・採点・二度押し回答・送信処理には触れません。
  [...document.body.classList]
    .filter(className => className.startsWith("material-"))
    .forEach(className => document.body.classList.remove(className));

  const materialClass = `material-${String(type || "").replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;
  document.body.classList.add(`theme-${CATEGORY_INFO[category]?.theme || category}`);
  if (type) document.body.classList.add(materialClass);
  if (type) document.body.dataset.currentMaterial = type;
}



/* =========================
   管理者：アクセスコード
========================= */

function openAccessManager() {
  if (!isAdmin) return;
  renderAccessMaterialCheckboxes();
  renderAccessFeatureCheckboxes(DEFAULT_FEATURE_FLAGS);
  document.getElementById("createAccessCodeMessage").textContent = "";
  showOnly("adminAccessScreen");
  loadAccessCodeList();
}

function renderAccessMaterialCheckboxes() {
  const area = document.getElementById("accessMaterialCheckboxes");
  const categoryOrder = ["toeic", "toefl", "highschool", "eiken", "classics", "teacher"];
  area.innerHTML = categoryOrder.map(categoryKey => {
    const info = CATEGORY_INFO[categoryKey];
    const items = Object.keys(TEST_CONFIG).filter(type => TEST_CONFIG[type].category === categoryKey);
    if (items.length === 0) return "";
    return `
      <div class="checkbox-category">
        <strong>${escapeHtml(info.label)}</strong>
        ${items.map(type => `
          <label class="material-check">
            <input type="checkbox" value="${escapeHtml(type)}">
            ${escapeHtml(TEST_CONFIG[type].title)}
          </label>
        `).join("")}
      </div>
    `;
  }).join("");
}

function renderAccessFeatureCheckboxes(flags = DEFAULT_FEATURE_FLAGS) {
  const area = document.getElementById("accessFeatureCheckboxes");
  if (!area) return;
  const normalized = normalizeFeatureFlags(flags);
  area.innerHTML = FEATURE_FLAG_DEFINITIONS.map(feature => `
    <label class="feature-toggle-card">
      <input type="checkbox" value="${escapeHtml(feature.key)}" ${normalized[feature.key] ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(feature.label)}</strong>
        <small>${escapeHtml(feature.description)}</small>
      </span>
    </label>
  `).join("");
}

function getAccessFeatureFlagsFromForm() {
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  document.querySelectorAll("#accessFeatureCheckboxes input[type='checkbox']").forEach(box => {
    flags[box.value] = Boolean(box.checked);
  });
  return normalizeFeatureFlags(flags);
}

function resetAccessFeatureCheckboxes() {
  renderAccessFeatureCheckboxes(DEFAULT_FEATURE_FLAGS);
}

function getRecordFeatureFlags(record = {}) {
  return normalizeFeatureFlags(record.featureFlags || record);
}

function accessFeatureSummaryHtml(flags) {
  const normalized = normalizeFeatureFlags(flags);
  return `<div class="feature-badge-list">${FEATURE_FLAG_DEFINITIONS.map(feature => `
    <span class="feature-badge ${normalized[feature.key] ? "on" : "off"}">${escapeHtml(feature.label)}：${normalized[feature.key] ? "ON" : "OFF"}</span>
  `).join("")}</div>`;
}

function accessFeatureToggleCellHtml(code, flags) {
  const normalized = normalizeFeatureFlags(flags);
  return `<div class="access-feature-mini-list">${FEATURE_FLAG_DEFINITIONS.map(feature => `
    <label class="mini-feature-check">
      <input type="checkbox" data-feature-toggle="${escapeHtml(code)}" data-feature-key="${escapeHtml(feature.key)}" ${normalized[feature.key] ? "checked" : ""}>
      ${escapeHtml(feature.label)}
    </label>
  `).join("")}</div>`;
}

async function createAccessCodeFromForm() {
  const msg = document.getElementById("createAccessCodeMessage");
  const studentId = document.getElementById("accessStudentIdInput").value.trim();
  const studentName = document.getElementById("accessStudentNameInput").value.trim();
  const memo = document.getElementById("accessMemoInput").value.trim();
  const allowed = [...document.querySelectorAll("#accessMaterialCheckboxes input[type='checkbox']:checked")].map(box => box.value);
  const flags = getAccessFeatureFlagsFromForm();

  if (!studentId) {
    msg.className = "error";
    msg.textContent = "学習者IDを入力してください。";
    return;
  }
  if (allowed.length === 0) {
    msg.className = "error";
    msg.textContent = "使用させる教材を1つ以上選択してください。";
    return;
  }

  try {
    msg.className = "muted";
    msg.textContent = "コードを発行しています...";
    const result = await apiGetJsonp("createAccessCode", {
      adminPassword: ADMIN_PASSWORD,
      studentId,
      studentName,
      memo,
      allowedMaterials: allowed,
      ...featureFlagParams(flags)
    });

    if (!result.ok) throw new Error(result.error || "コード発行に失敗しました。");

    msg.className = "correct";
    msg.innerHTML = `発行しました。学習者コード：<strong class="issued-code">${escapeHtml(result.code)}</strong>`;
    document.getElementById("accessStudentIdInput").value = "";
    document.getElementById("accessStudentNameInput").value = "";
    document.getElementById("accessMemoInput").value = "";
    document.querySelectorAll("#accessMaterialCheckboxes input[type='checkbox']").forEach(box => { box.checked = false; });
    resetAccessFeatureCheckboxes();
    loadAccessCodeList();
  } catch (error) {
    console.error(error);
    msg.className = "error";
    msg.textContent = error.message;
  }
}

async function loadAccessCodeList() {
  const area = document.getElementById("accessCodeListArea");
  area.innerHTML = "<p class='muted'>読み込み中...</p>";
  try {
    const result = await apiGetJsonp("listAccessCodes", { adminPassword: ADMIN_PASSWORD });
    if (!result.ok) throw new Error(result.error || "一覧の取得に失敗しました。");
    renderAccessCodeList(result.records || []);
  } catch (error) {
    console.error(error);
    area.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
  }
}

function renderAccessCodeList(records) {
  const area = document.getElementById("accessCodeListArea");
  if (records.length === 0) {
    area.innerHTML = "<p class='muted'>発行済みコードはまだありません。</p>";
    return;
  }

  area.innerHTML = `
    <table class="history-table compact-table access-code-table">
      <thead>
        <tr>
          <th>コード</th><th>ID</th><th>名前</th><th>許可教材</th><th>機能</th><th>状態</th><th>使用回数</th><th>最終使用</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(record => {
          const flags = getRecordFeatureFlags(record);
          return `
          <tr>
            <td><strong>${escapeHtml(record.code)}</strong></td>
            <td>${escapeHtml(record.studentId)}</td>
            <td>${escapeHtml(record.studentName)}</td>
            <td>${escapeHtml(materialNames(parseMaterialList(record.allowedMaterials)).join(" / "))}</td>
            <td>${accessFeatureToggleCellHtml(record.code, flags)}${accessFeatureSummaryHtml(flags)}</td>
            <td class="${record.active ? "correct" : "wrong"}">${record.active ? "有効" : "無効"}</td>
            <td>${escapeHtml(record.useCount ?? 0)}</td>
            <td>${escapeHtml(formatSheetDate(record.lastUsedAt))}</td>
            <td>
              <button class="small-button secondary-button" data-edit-code="${escapeHtml(record.code)}" data-materials="${escapeHtml(parseMaterialList(record.allowedMaterials).join(","))}">教材変更</button>
              <button class="small-button ${record.active ? "quit-button" : "secondary-button"}" data-code="${escapeHtml(record.code)}" data-active="${record.active ? "false" : "true"}">${record.active ? "無効化" : "有効化"}</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  area.querySelectorAll("button[data-code]").forEach(button => {
    button.addEventListener("click", () => updateAccessCodeActive(button.dataset.code, button.dataset.active === "true"));
  });
  area.querySelectorAll("button[data-edit-code]").forEach(button => {
    button.addEventListener("click", () => updateAccessCodeMaterials(button.dataset.editCode, button.dataset.materials || ""));
  });
  area.querySelectorAll("input[data-feature-toggle]").forEach(box => {
    box.addEventListener("change", () => updateAccessCodeFeaturesFromRow(box.dataset.featureToggle));
  });
}

async function updateAccessCodeActive(code, active) {
  try {
    await apiGetJsonp("updateAccessCode", { adminPassword: ADMIN_PASSWORD, code, active });
    loadAccessCodeList();
  } catch (error) {
    alert(error.message);
  }
}

async function updateAccessCodeFeaturesFromRow(code) {
  const boxes = [...document.querySelectorAll("input[data-feature-toggle]")].filter(box => box.dataset.featureToggle === code);
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  boxes.forEach(box => { flags[box.dataset.featureKey] = Boolean(box.checked); });
  boxes.forEach(box => { box.disabled = true; });
  try {
    await apiGetJsonp("updateAccessCode", { adminPassword: ADMIN_PASSWORD, code, ...featureFlagParams(flags) });
    loadAccessCodeList();
  } catch (error) {
    alert(error.message || "機能設定の変更に失敗しました。");
    boxes.forEach(box => { box.disabled = false; });
  }
}

async function updateAccessCodeMaterials(code, currentMaterialsText) {
  const allKeys = Object.keys(TEST_CONFIG).join(",");
  const input = prompt(`許可する教材キーをカンマ区切りで入力してください。\n\n利用可能キー：${allKeys}`, currentMaterialsText || "");
  if (input == null) return;
  const allowedMaterials = input.split(",").map(v => v.trim()).filter(Boolean);
  const invalid = allowedMaterials.filter(type => !TEST_CONFIG[type]);
  if (invalid.length) return alert(`存在しない教材キーがあります：${invalid.join(", ")}`);
  if (!allowedMaterials.length) return alert("教材を1つ以上指定してください。");
  try {
    await apiGetJsonp("updateAccessCode", { adminPassword: ADMIN_PASSWORD, code, allowedMaterials });
    loadAccessCodeList();
  } catch (error) {
    alert(error.message || "教材変更に失敗しました。Apps Script側の updateAccessCode が allowedMaterials に対応しているか確認してください。");
  }
}

function parseMaterialList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(/[,/]/).map(v => v.trim()).filter(Boolean);
  return [];
}

function materialNames(types) {
  return (types || []).map(type => TEST_CONFIG[type]?.title || type);
}

function formatSheetDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value);
}


/* =========================
   設定画面
========================= */

async function openSettings(type) {
  testType = type;
  reviewMode = false;
  const config = TEST_CONFIG[type];
  applyThemeForMaterial(type);

  if (config.type === "writing") {
    openWriting(type);
    return;
  }

  showOnly("settingScreen");
  document.getElementById("settingTitle").textContent = config.title;
  document.getElementById("settingDescription").textContent = config.description || "";
  document.getElementById("vocabReviewArea").classList.toggle("hidden", !config.review);
  document.getElementById("timeLimitSelect").value = String(config.defaultTime || 0);
  toggleCustomQuestionInput();

  const sourceQuestions = await ensureQuestionsLoaded(type);
  setupSectionSelect(sourceQuestions);
  updateMistakeCountInSettings();
  settingReviewListVisible = false;
  const listPanel = document.getElementById("settingReviewListPanel");
  if (listPanel) listPanel.classList.add("hidden");
  await renderSettingProgressDashboard(type);
}

async function ensureQuestionsLoaded(type) {
  if (loadedQuestions[type]) return loadedQuestions[type];

  const config = TEST_CONFIG[type];
  if (type === "polaris3") {
    loadedQuestions[type] = await loadPolaris3Questions(config);
  } else if (config.type === "sentence") {
    loadedQuestions[type] = await loadSentenceQuestions(config.files);
  } else if (config.type === "cloze") {
    loadedQuestions[type] = await loadClozeQuestions(config.path);
  } else if (config.type === "errorCorrection") {
    loadedQuestions[type] = await loadErrorCorrectionQuestions(config.path);
  } else if (config.type === "writing") {
    loadedQuestions[type] = await loadWritingTasks(config.path);
  } else if (Array.isArray(config.files) && config.files.length) {
    loadedQuestions[type] = await loadChoiceQuestionsFromFiles(config.files);
  } else {
    loadedQuestions[type] = await loadChoiceQuestions(config.path);
  }

  return loadedQuestions[type];
}

function setupSectionSelect(sourceQuestions) {
  const select = document.getElementById("sectionSelect");
  const sections = [...new Set(sourceQuestions.map(q => q.section))]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "ja", { numeric: true }));

  select.innerHTML = `<option value="all">すべてのセクション</option>`;
  sections.forEach(section => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = isNaN(Number(section)) ? section : `Section ${section}`;
    select.appendChild(option);
  });
}

function toggleCustomQuestionInput() {
  const select = document.getElementById("questionCountSelect");
  const input = document.getElementById("customQuestionCountInput");
  if (!select || !input) return;
  input.classList.toggle("hidden", select.value !== "custom");
}


function getConfiguredPracticeCount(total) {
  const select = document.getElementById("questionCountSelect");
  if (!select || select.value === "all") return total;
  if (select.value === "custom") {
    const input = document.getElementById("customQuestionCountInput");
    const customCount = Number(input?.value);
    return customCount && customCount > 0 ? Math.min(customCount, total) : Math.min(10, total);
  }
  const selected = Number(select.value);
  return selected > 0 ? Math.min(selected, total) : total;
}

function getSelectedSectionValue() {
  return document.getElementById("sectionSelect")?.value || "all";
}

function filterQuestionsBySelectedSection(sourceQuestions) {
  const selectedSection = getSelectedSectionValue();
  return selectedSection === "all"
    ? [...sourceQuestions]
    : sourceQuestions.filter(q => String(q.section) === String(selectedSection));
}

function filterStatusesBySelectedSection(statuses) {
  const selectedSection = getSelectedSectionValue();
  return selectedSection === "all"
    ? [...statuses]
    : statuses.filter(item => String(item.question.section) === String(selectedSection));
}

function orderQuestionsForMode(type, pool) {
  return TEST_CONFIG[type]?.keepOrder ? [...pool] : shuffle(pool);
}



/* =========================
   CSV読み込み
========================= */

async function loadChoiceQuestions(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。フォルダ名・ファイル名を確認してください。`);
    return [];
  }

  const text = await response.text();
  const rows = parseCSV(text);
  const header = (rows.shift() || []).map(cell => String(cell || "").trim());

  return rows.map(row => {
    const id = getCsvCell(row, header, ["id", "no", "number", "番号"], 0);
    const section = getCsvCell(row, header, ["section", "lesson", "unit", "part", "セクション", "レッスン", "単元"], 1);
    const word = getCsvCell(row, header, ["word", "term", "sentence", "stimulus", "語", "語句", "問題"], 2);

    // passage列があるCSVだけ本文として扱います。
    // word列を本文に流用すると、ポラリス3で設問が本文欄に出るため、ここでは代用しません。
    const passageNames = ["passage", "context", "body", "source", "text", "本文", "長文"];
    const hasExplicitPassageColumn = hasCsvHeader(header, passageNames);
    const passage = getCsvCell(row, header, passageNames, -1);

    // ポラリス3のCSVでは word列が設問、questionType列が Vocabulary/Factual です。
    // fallbackを9列目にすると questionType が設問として表示されるため、明示的なquestion列がない場合はword列を使います。
    const explicitQuestion = getCsvCell(row, header, ["question", "prompt", "item", "設問", "問い", "問題文"], -1);
    const question = explicitQuestion || word;

    const correctAnswer = getCsvCell(row, header, ["correctanswer", "correct", "answer", "key", "正解"], 3);
    const points = Number(getCsvCell(row, header, ["points", "point", "score", "配点"], 7)) || 1;
    const explanation = getCsvCell(row, header, ["explanation", "comment", "feedback", "解説", "説明"], 8) || "";
    const questionType = getCsvCell(row, header, ["questionType", "type", "kind", "形式", "問題形式"], -1) || "";
    const summaryText = getCsvCell(row, header, ["summary", "summaryText", "fullSummary", "summaryFullText", "要約", "サマリー", "要約全文"], -1) || "";

    const choices = [
      getCsvCell(row, header, ["choice1", "option1", "answer1", "a", "選択肢1"], 3),
      getCsvCell(row, header, ["choice2", "option2", "answer2", "distractor1", "wrong1", "b", "選択肢2"], 4),
      getCsvCell(row, header, ["choice3", "option3", "answer3", "distractor2", "wrong2", "c", "選択肢3"], 5),
      getCsvCell(row, header, ["choice4", "option4", "answer4", "distractor3", "wrong3", "d", "選択肢4"], 6)
    ].filter(Boolean);

    if (correctAnswer && !choices.includes(correctAnswer)) choices.unshift(correctAnswer);

    return {
      id,
      section,
      word: word || question || passage,
      passage,
      question,
      prompt: question || word,
      correctAnswer,
      choices,
      points,
      explanation,
      questionType,
      summaryText,
      summaryFullText: summaryText,
      hasExplicitPassageColumn,
      sourceFile: filePath
    };
  }).filter(q => q.id && q.section && (q.word || q.question || q.passage) && q.correctAnswer && q.choices.length > 0);
}

function normalizeCsvHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_\-－ー]/g, "");
}

function hasCsvHeader(header, names) {
  const normalizedHeader = header.map(normalizeCsvHeader);
  const normalizedNames = (Array.isArray(names) ? names : [names]).map(normalizeCsvHeader);
  return normalizedNames.some(name => normalizedHeader.includes(name));
}

function getCsvCell(row, header, names, fallbackIndex = -1) {
  const normalizedHeader = header.map(normalizeCsvHeader);
  const normalizedNames = (Array.isArray(names) ? names : [names]).map(normalizeCsvHeader);
  const headerIndex = normalizedNames
    .map(name => normalizedHeader.indexOf(name))
    .find(index => index >= 0);

  if (headerIndex >= 0 && row[headerIndex] !== undefined && String(row[headerIndex]).trim() !== "") {
    return row[headerIndex];
  }

  if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && row[fallbackIndex] !== undefined) {
    return row[fallbackIndex];
  }

  return "";
}

async function loadChoiceQuestionsFromFiles(files) {
  const all = [];
  for (const file of files) {
    const loaded = await loadChoiceQuestions(file);
    all.push(...loaded);
  }
  return all;
}

async function loadPolaris3Questions(config) {
  const files = Array.isArray(config.files) ? config.files : [];
  const manifest = await loadPolaris3Manifest(config.manifest);
  const all = [];

  for (const file of files) {
    const fileLessonKey = getPolarisLessonKey(file);
    const loaded = await loadChoiceQuestions(file);
    loaded.forEach(question => {
      const sectionLessonKey = getPolarisLessonKey(question.section) || fileLessonKey;
      const manifestEntry = getPolarisManifestEntry(manifest, question.section, sectionLessonKey, fileLessonKey, file);
      const embeddedPassage = question.hasExplicitPassageColumn
        ? (question.passage || "")
        : (looksLikePolarisQuestion(question.passage, question.question) ? "" : (question.passage || ""));

      // 各Lesson CSVの passage 列を最優先します。
      // manifest.csvの description/path は本文ではなく見出し・ファイル情報なので、本文として上書きしません。
      const passage = embeddedPassage || manifestEntry?.passage || "";
      const title = manifestEntry?.title || question.passageTitle || makePolarisLessonTitle(sectionLessonKey || question.section || fileLessonKey);

      all.push({
        ...question,
        section: question.section || title,
        passage,
        passageTitle: title,
        lessonKey: sectionLessonKey || fileLessonKey
      });
    });
  }

  enrichPolarisSummaryBlocks(all);
  return all;
}

function enrichPolarisSummaryBlocks(items) {
  const groups = new Map();
  items.forEach(item => {
    if (!isPolarisSummaryQuestion(item)) return;
    const key = `${item.lessonKey || item.section || ""}::${normalizeForCompare(item.passage || "")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  groups.forEach(group => {
    const explicitSummary = group
      .map(item => String(item.summaryFullText || item.summaryText || "").trim())
      .find(text => text.length > 0);
    const generatedSummary = group
      .map(item => String(item.question || item.prompt || item.word || "").trim())
      .filter(Boolean)
      .join("\n");
    const summaryText = explicitSummary || generatedSummary;
    group.forEach(item => { item.summaryFullText = summaryText; });
  });
}

function isPolarisSummaryQuestion(item) {
  const type = String(item?.questionType || "").toLowerCase();
  const id = String(item?.id || "").toUpperCase();
  return type.includes("summary") || /-S\d+/.test(id);
}

async function loadPolaris3Manifest(manifestPath) {
  const manifest = new Map();
  if (!manifestPath) return manifest;

  try {
    const response = await fetch(manifestPath);
    if (!response.ok) return manifest;

    const text = await response.text();
    const rows = parseCSV(text);
    const header = (rows.shift() || []).map(cell => String(cell || "").trim());

    rows.forEach(row => {
      const lesson = getCsvCell(row, header, ["lesson", "section", "unit", "id", "レッスン", "セクション"], 0);
      const path = getCsvCell(row, header, ["path", "file", "filename", "ファイル", "パス"], 1);
      const title = getCsvCell(row, header, ["title", "name", "label", "description", "desc", "見出し", "タイトル", "説明"], -1) || makePolarisLessonTitle(lesson);

      // description列やpath列は本文ではありません。
      // 本文列が明示されているmanifestだけ、補助本文として使います。
      const passage = getCsvCell(row, header, ["passage", "body", "text", "context", "本文", "長文"], -1);
      if (!lesson) return;

      [lesson, title, path, getPolarisLessonKey(lesson), getPolarisLessonKey(path)].filter(Boolean).forEach(key => {
        manifest.set(normalizePolarisKey(key), { title, passage });
      });
    });
  } catch (error) {
    console.warn("ポラリス3本文manifestを読み込めませんでした:", error);
  }

  return manifest;
}

function getPolarisManifestEntry(manifest, ...keys) {
  for (const key of keys) {
    const normalized = normalizePolarisKey(key);
    if (normalized && manifest.has(normalized)) return manifest.get(normalized);
  }
  return null;
}

function getPolarisLessonKey(value) {
  const text = String(value || "").trim();
  const match = text.match(/(?:polaris3[_\-\s]*)?lesson[_\-\s]*(\d+)|^\s*(\d+)\s*$/i);
  if (!match) return "";
  return `lesson${match[1] || match[2]}`;
}

function normalizePolarisKey(value) {
  const lessonKey = getPolarisLessonKey(value);
  if (lessonKey) return lessonKey;
  return String(value || "").trim().toLowerCase().replace(/[\s_\-－ー]/g, "");
}

function makePolarisLessonTitle(value) {
  const lessonKey = getPolarisLessonKey(value);
  if (!lessonKey) return String(value || "本文");
  return `Lesson ${lessonKey.replace("lesson", "")}`;
}

function looksLikePolarisQuestion(text, questionText = "") {
  const clean = String(text || "").trim();
  if (!clean) return true;
  if (questionText && normalizeForCompare(clean) === normalizeForCompare(questionText)) return true;
  return clean.length < 180 && /[?？]|according|which|what|why|author|main idea|closest in meaning|本文|選び/i.test(clean);
}

async function loadErrorCorrectionQuestions(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。フォルダ名・ファイル名を確認してください。`);
    return [];
  }

  const text = await response.text();
  const rows = parseCSV(text);
  const header = (rows.shift() || []).map(cell => String(cell || "").trim());
  const isCurrentReviewCsv =
    header.includes("sentence") &&
    header.includes("correctAnswer") &&
    header.includes("correctionPrompt") &&
    header.includes("clozeAnswer");

  return rows.map(row => {
    let prompt = "";
    let wrongSentence = "";
    let incorrectPhrase = "";
    let correctPhrase = "";
    let choices = [];
    let explanation = "";
    let points = 1;

    if (isCurrentReviewCsv) {
      // Current TOEIC error-correction CSV:
      // id, section, sentence, correctAnswer(=誤り), choice1-3, correctionPrompt,
      // clozeAnswer(=修正後), hint, explanation, points
      wrongSentence = row[2] || "";
      incorrectPhrase = row[3] || "";
      prompt = row[7] || `「${incorrectPhrase}」を、より自然なTOEIC S&W表現に直してください。`;
      correctPhrase = row[8] || "";
      choices = [row[4], row[5], row[6], incorrectPhrase];
      explanation = row[10] || "";
      points = Number(row[11]) || 1;
    } else {
      // Legacy format support:
      // id, section, prompt, wrongSentence, incorrectPhrase, correctPhrase,
      // correctedSentence, distractor1-3, explanation, points
      prompt = row[2] || row[3] || "";
      wrongSentence = row[3] || row[2] || "";
      incorrectPhrase = row[4] || row[3] || "";
      correctPhrase = row[5] || row[6] || "";
      choices = [row[4], row[7], row[8], row[9]];
      explanation = row[10] || row[9] || "";
      points = Number(row[11]) || 1;
    }

    const cleanChoices = [...new Set(
      choices
        .map(choice => String(choice || "").trim())
        .filter(Boolean)
        .filter(choice => normalizeForCompare(choice) !== normalizeForCompare(correctPhrase))
        .filter(choice => normalizeForCompare(choice) !== normalizeForCompare(prompt))
    )];

    if (incorrectPhrase && !cleanChoices.some(choice => normalizeForCompare(choice) === normalizeForCompare(incorrectPhrase))) {
      cleanChoices.unshift(incorrectPhrase);
    }

    return {
      id: row[0],
      section: row[1],
      prompt,
      wrongSentence,
      incorrectPhrase,
      correctPhrase,
      answer: correctPhrase,
      choices: cleanChoices,
      explanation,
      points
    };
  }).filter(q => q.id && q.section && q.wrongSentence && q.incorrectPhrase && q.correctPhrase && q.choices.length > 0);
}

async function loadSentenceQuestions(files) {
  const all = [];
  for (const file of files) {
    const response = await fetch(file);
    if (!response.ok) {
      console.warn(`読み込み失敗: ${file}`);
      continue;
    }
    const text = await response.text();
    const rows = parseCSV(text);
    rows.shift();
    const loaded = rows.map(row => ({
      id: row[0],
      section: row[1],
      answer: row[2],
      prompt: row[3] || "",
      hint: row[4] || "",
      explanation: row[5] || "",
      points: Number(row[6]) || 1
    })).filter(q => q.id && q.section && q.answer);
    all.push(...loaded);
  }
  return all;
}

async function loadClozeQuestions(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。フォルダ名・ファイル名を確認してください。`);
    return [];
  }

  const text = await response.text();
  const rows = parseCSV(text);
  rows.shift();

  return rows.map(row => ({
    id: row[0],
    section: row[1],
    prompt: row[2],
    answer: row[3],
    hint: row[4] || "",
    explanation: row[5] || "",
    points: Number(row[6]) || 1
  })).filter(q => q.id && q.section && q.prompt && q.answer);
}

async function loadWritingTasks(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。`);
    return [];
  }
  const text = await response.text();
  const rows = parseCSV(text);
  rows.shift();
  return rows.map(row => ({
    id: row[0],
    section: row[1],
    prompt: row[2],
    targetWords: row[3] || "120-150",
    memo: row[4] || ""
  })).filter(q => q.id && q.prompt);
}



/* =========================
   テスト開始
========================= */

async function startNormalQuiz() {
  bossBattleState = null;
  reviewMode = false;
  const sourceQuestions = await ensureQuestionsLoaded(testType);
  prepareQuiz(sourceQuestions);

  if (questions.length === 0) {
    alert("問題がありません。CSVファイルの場所や内容を確認してください。");
    return;
  }

  startQuizCommon();
}

async function startReviewQuiz() {
  bossBattleState = null;
  const config = TEST_CONFIG[testType];
  if (!config || !config.review) {
    alert("復習機能は単語テスト用です。");
    return;
  }

  reviewMode = true;
  const sourceQuestions = await ensureQuestionsLoaded(testType);
  const wrongIds = getWrongIds();
  questions = sourceQuestions.filter(q => wrongIds.includes(String(q.id)));

  if (questions.length === 0) {
    alert("保存された間違いがありません。");
    return;
  }

  questions = orderQuestionsForMode(testType, questions);
  startQuizCommon();
}

function prepareQuiz(sourceQuestions) {
  const countValue = document.getElementById("questionCountSelect").value;
  let pool = filterQuestionsBySelectedSection(sourceQuestions);

  // ポラリス3は読解本文の流れに沿って学習するため、通常演習ではランダム化しません。
  // 他教材は従来どおりランダム出題を維持します。
  pool = orderQuestionsForMode(testType, pool);

  if (countValue === "custom") {
    const customCount = Number(document.getElementById("customQuestionCountInput").value);
    if (!customCount || customCount < 1) {
      alert("問題数を1以上で入力してください。今回は10問にします。" );
      questions = pool.slice(0, 10);
      return;
    }
    questions = pool.slice(0, customCount);
    return;
  }

  const limit = getConfiguredPracticeCount(pool.length);
  questions = pool.slice(0, limit);
}

function startQuizCommon() {
  currentIndex = 0;
  score = 0;
  selectedChoice = "";
  answersLog = [];
  mistakes = [];
  errorCorrectionPhase = "identify";
  quizCorrectStreak = 0;
  bestCorrectStreak = 0;
  startTime = new Date();
  selectedTimeLimit = Number(document.getElementById("timeLimitSelect").value) || 0;
  selectedAutoNextDelay = Number(document.getElementById("autoNextDelaySelect")?.value ?? AUTO_NEXT_DELAY_MS);
  showOnly("quizScreen");
  showQuestion();
}


async function startBossQuiz() {
  if (typeof isFeatureEnabled === "function" && !isFeatureEnabled("boss")) {
    alert("この学習者コードではボス機能がOFFになっています。");
    return;
  }
  if (!testType || !TEST_CONFIG[testType]) return;
  const sourceQuestions = await ensureQuestionsLoaded(testType);
  const statuses = getLocalReviewStatuses(testType, sourceQuestions);
  const pool = statuses.filter(item => item.status === "review").map(item => item.question);
  if (!pool.length) {
    alert("ボス戦に使う間違い問題がありません。先に通常演習で弱点を見つけましょう。");
    return;
  }

  const milestone = Math.max(1, getBossMilestoneForType(testType));
  bossBattleState = {
    active: true,
    material: testType,
    milestone,
    total: Math.min(5, pool.length),
    correct: 0,
    maxHp: 100,
    hp: 100
  };
  reviewMode = true;
  questions = shuffle(pool).slice(0, bossBattleState.total);
  startQuizCommon();
}


/* =========================
   問題表示・タイマー
========================= */

function showQuestion() {
  clearQuestionTimer();
  clearAutoAdvanceTimer();
  selectedChoice = "";
  questionStartTime = new Date();

  document.getElementById("questionNumber").textContent = `問題 ${currentIndex + 1} / ${questions.length}`;
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").className = "";
  document.getElementById("nextButton").classList.add("hidden");
  document.getElementById("checkButton").disabled = false;
  document.getElementById("progressBar").style.width = `${Math.round((currentIndex / questions.length) * 100)}%`;

  if (TEST_CONFIG[testType].type === "choice") showChoiceQuestion();
  if (TEST_CONFIG[testType].type === "sentence") showSentenceQuestion();
  if (TEST_CONFIG[testType].type === "cloze") showClozeQuestion();
  if (TEST_CONFIG[testType].type === "errorCorrection") showErrorCorrectionQuestion();

  startQuestionTimer();
}

function startQuestionTimer() {
  const display = document.getElementById("timerDisplay");
  if (!selectedTimeLimit) {
    display.textContent = "制限なし";
    display.classList.remove("timer-warning");
    return;
  }
  remainingSeconds = selectedTimeLimit;
  updateTimerDisplay();
  timerId = setInterval(() => {
    remainingSeconds--;
    updateTimerDisplay();
    if (remainingSeconds <= 0) {
      clearQuestionTimer();
      handleTimeUp();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const display = document.getElementById("timerDisplay");
  display.textContent = `${remainingSeconds}秒`;
  display.classList.toggle("timer-warning", remainingSeconds <= 5);
}

function clearQuestionTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimerId) clearTimeout(autoAdvanceTimerId);
  autoAdvanceTimerId = null;
}

function handleTimeUp() {
  if (document.getElementById("checkButton").disabled) return;
  const q = questions[currentIndex];
  const configType = TEST_CONFIG[testType].type;
  const correctAnswer = (configType === "sentence" || configType === "cloze") ? q.answer : q.correctAnswer;
  const questionText = configType === "sentence" ? shuffle(splitSentence(q.answer)).join(" / ") : (q.prompt || q.word);
  const typedAnswer = document.getElementById("answerInput") ? document.getElementById("answerInput").value : "";

  processAnswer({
    id: q.id,
    section: q.section,
    question: questionText,
    userAnswer: typedAnswer || "時間切れ",
    correctAnswer,
    explanation: q.explanation || "",
    isCorrect: false,
    points: q.points || 1,
    timedOut: true
  });
}

function showChoiceQuestion() {
  const q = questions[currentIndex];
  document.getElementById("testTitle").textContent = reviewMode ? `${TEST_CONFIG[testType].title} 間違い復習` : TEST_CONFIG[testType].title;
  const area = document.getElementById("questionArea");
  area.innerHTML = "";

  const wordDiv = document.createElement("div");
  wordDiv.className = "words";

  if (testType === "monitor") {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | ${escapeHtml(q.section)}<br><span class="monitor-label">最も自然で正確な表現を選んでください。</span><br>"${escapeHtml(q.word)}"`;
  } else if (testType === "speakingReview") {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | ${escapeHtml(q.section)}<br>より自然な表現は？<br>"${escapeHtml(q.word)}"`;
  } else if (testType === "englishTheory") {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | ${escapeHtml(q.section)}<br>説明に合う概念を選んでください。<br>"${escapeHtml(q.word)}"`;
  } else if (testType === "eikenConnectors") {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | ${escapeHtml(q.section)}<br>空欄に最も適切な表現を選んでください。<br>"${escapeHtml(q.word)}"`;
  } else if (testType.startsWith("classical")) {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | ${escapeHtml(q.section)}<br>${escapeHtml(q.word)}`;
  } else if (testType === "polaris3") {
    const passage = q.passage || q.context || "";
    const passageTitle = q.passageTitle || q.section || "本文";
    const questionText = q.question || q.prompt || q.word;
    const isSummary = isPolarisSummaryQuestion(q);
    const summaryText = isSummary ? (q.summaryFullText || questionText) : "";
    wordDiv.className = "words polaris-question-wrap";
    wordDiv.innerHTML = `
      <details class="polaris-passage-card" open>
        <summary class="polaris-passage-summary">
          <span>本文</span>
          <strong>${escapeHtml(passageTitle)}</strong>
          <small>タップで本文を開閉できます</small>
        </summary>
        <div class="polaris-passage-body">${escapeHtml(passage || "本文データを読み込めませんでした。CSVの passage / 本文 列を確認してください。")}</div>
      </details>
      <div class="polaris-question-card ${isSummary ? "polaris-summary-card" : ""}">
        <span>No.${escapeHtml(q.id)} | ${escapeHtml(q.section)}${q.questionType ? " | " + escapeHtml(q.questionType) : ""}</span>
        ${isSummary ? `<div class="polaris-summary-label">Summary 全体</div><div class="polaris-summary-text">${escapeHtml(summaryText)}</div><div class="polaris-current-summary">今回答える文：${escapeHtml(questionText)}</div>` : `<div class="polaris-question-text">${escapeHtml(questionText)}</div>`}
      </div>
      <div class="double-press-hint">選択肢は1回目で選択、同じ選択肢をもう1回押すと回答します。</div>
    `;
  } else {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | Section ${escapeHtml(q.section)}<br>"${escapeHtml(q.word)}" の意味は？`;
  }

  area.appendChild(wordDiv);

  shuffle(q.choices).forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice-button";
    btn.textContent = choice;
    btn.addEventListener("click", () => {
      const sameChoiceTapped = selectedChoice === choice;
      selectedChoice = choice;
      document.querySelectorAll(".choice-button").forEach(b => b.classList.remove("selected", "ready-to-submit"));
      btn.classList.add("selected");
      if (sameChoiceTapped && !document.getElementById("checkButton").disabled) {
        checkAnswer();
      } else {
        btn.classList.add("ready-to-submit");
      }
    });
    area.appendChild(btn);
  });
}

function showSentenceQuestion() {
  const q = questions[currentIndex];
  document.getElementById("testTitle").textContent = TEST_CONFIG[testType].title;
  q.words = shuffle(splitSentence(q.answer));
  const hint = q.hint || createInitialHint(q.answer);
  const prompt = q.prompt ? `<div class="question-prompt">${escapeHtml(q.prompt)}</div>` : "";

  const tapOnly = testType === "speakingReview" || testType === "speakingErrorCorrection";
  document.getElementById("questionArea").innerHTML = `
    ${prompt}
    <div class="answer-support"><span>入力ヒント</span>${escapeHtml(hint)}</div>
    <div class="words" id="sentenceWords">${q.words.map(word => `<button type="button" class="word-chip">${escapeHtml(word)}</button>`).join("")}</div>
    <input type="text" id="answerInput" class="answer-input" placeholder="ヒント: ${escapeHtml(hint)}" autocomplete="off" ${tapOnly ? "readonly inputmode=\"none\"" : ""} />
    <button type="button" id="clearSentenceButton" class="secondary-button small-button">入力を消す</button>
  `;

  document.querySelectorAll("#sentenceWords .word-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const input = document.getElementById("answerInput");
      input.value = `${input.value.trim()} ${chip.textContent.trim()}`.trim();
      updateUsedWords();
      if (!input.readOnly) input.focus();
    });
  });
  document.getElementById("clearSentenceButton").addEventListener("click", () => {
    const input = document.getElementById("answerInput");
    input.value = "";
    updateUsedWords();
    if (!input.readOnly) input.focus();
  });
  document.getElementById("answerInput").addEventListener("input", updateUsedWords);
  if (!tapOnly) document.getElementById("answerInput").focus();
}

function showClozeQuestion() {
  const q = questions[currentIndex];
  document.getElementById("testTitle").textContent = TEST_CONFIG[testType].title;
  const hint = q.hint || createInitialHint(q.answer);
  const examples = extractLearningExamples(q.explanation || "", q.answer);
  const originalBlock = examples.wrong
    ? `<div class="source-expression"><span>直す前の表現</span><strong>${escapeHtml(examples.wrong)}</strong></div>`
    : `<div class="source-expression"><span>学習目標</span><strong>TOEIC Speakingでそのまま使える自然なチャンクを完成させる</strong></div>`;

  document.getElementById("questionArea").innerHTML = `
    <div class="question-prompt cloze-prompt">
      <div class="task-badge">${escapeHtml(q.section || "穴埋め")}</div>
      <p class="task-instruction">下の表現をより自然な英語に直すつもりで、空欄に入る表現を入力してください。</p>
      ${originalBlock}
      <div class="target-expression"><span>完成させる英文</span><strong>${escapeHtml(q.prompt)}</strong></div>
    </div>
    <button type="button" id="showClozeHintButton" class="secondary-button small-button cloze-hint-button">ヒントを見る</button>
    <div id="clozeHintBox" class="answer-support cloze-hint-box hidden"><span>入力ヒント</span>${escapeHtml(hint)}</div>
    <input type="text" id="answerInput" class="answer-input" placeholder="空欄に入る表現を入力" autocomplete="off" />
  `;

  document.getElementById("showClozeHintButton")?.addEventListener("click", () => {
    document.getElementById("clozeHintBox")?.classList.remove("hidden");
    document.getElementById("showClozeHintButton")?.classList.add("hidden");
    document.getElementById("answerInput")?.focus();
  });
  document.getElementById("answerInput").focus();
}

function extractLearningExamples(explanation, answer = "") {
  const text = String(explanation || "");
  const correctMatch = text.match(/正しい全文：(.+?)(?:\s*\/\s*誤答例：|$)/);
  const wrongMatch = text.match(/誤答例：(.+?)(?:\s*\/\s*|$)/);
  const wrong = cleanLearningExampleForDisplay(wrongMatch ? wrongMatch[1] : "", answer);
  return {
    correct: correctMatch ? correctMatch[1].trim() : "",
    wrong
  };
}

function cleanLearningExampleForDisplay(example, answer = "") {
  const text = String(example || "").trim();
  if (!text) return "";
  const normalizedExample = normalizeForCompare(text);
  const normalizedAnswer = normalizeForCompare(answer);

  // 説明欄に「誤答例：... / 進行中の動作は are discussing」のように
  // 正答の一部が含まれる場合、問題表示時に答えが見えてしまうため非表示にします。
  if (normalizedAnswer && (normalizedExample.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedExample))) {
    return "";
  }
  return text;
}

function createInitialHint(sentence) {
  return String(sentence).trim().split(/\s+/).map(word => {
    const cleanWord = word.replace(/[.,!?;:]/g, "");
    const firstLetter = cleanWord.replace(/^[“"']+/, "").charAt(0);
    const remainingSpaces = "_".repeat(Math.max(cleanWord.length - 1, 1));
    const punctuation = word.match(/[.,!?;:]$/);
    return punctuation ? `${firstLetter}${remainingSpaces}${punctuation[0]}` : `${firstLetter}${remainingSpaces}`;
  }).join("   ");
}

function updateUsedWords() {
  const inputWords = splitSentence(document.getElementById("answerInput").value).map(w => normalizeForCompare(w));
  document.querySelectorAll(".word-chip").forEach(chip => {
    const word = normalizeForCompare(chip.textContent);
    chip.classList.toggle("used", inputWords.includes(word));
  });
}


function showErrorCorrectionQuestion() {
  const q = questions[currentIndex];
  document.getElementById("testTitle").textContent = TEST_CONFIG[testType].title;
  errorCorrectionPhase = "identify";
  const area = document.getElementById("questionArea");
  area.innerHTML = `
    <div class="error-correction-card">
      <div class="task-badge">Step 1 / 誤り発見</div>
      <p class="task-instruction">不自然な表現を選んでください。同じ選択肢を2回押すと回答できます。</p>
      <div class="source-expression"><span>直す前の文</span><strong>${escapeHtml(q.wrongSentence)}</strong></div>
      <div class="error-choice-grid">
        ${q.choices.map(choice => `<button type="button" class="choice-button error-choice" data-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`).join("")}
      </div>
    </div>
  `;
  area.querySelectorAll(".error-choice").forEach(btn => {
    btn.addEventListener("click", () => {
      const choice = btn.dataset.choice;
      const sameChoiceTapped = selectedChoice === choice;
      selectedChoice = choice;
      area.querySelectorAll(".error-choice").forEach(b => b.classList.remove("selected", "ready-to-submit"));
      btn.classList.add("selected", "ready-to-submit");
      if (sameChoiceTapped && !document.getElementById("checkButton").disabled) checkAnswer();
    });
  });
}

function checkErrorCorrectionAnswer() {
  const q = questions[currentIndex];
  if (errorCorrectionPhase === "identify") {
    if (!selectedChoice) {
      alert("誤りだと思う表現を選んでください。");
      return;
    }
    const identified = normalizeForCompare(selectedChoice) === normalizeForCompare(q.incorrectPhrase);
    if (!identified) {
      saveWrongWord(q.id);
      processAnswer({
        id: q.id,
        section: q.section,
        question: q.wrongSentence,
        userAnswer: selectedChoice,
        correctAnswer: q.incorrectPhrase,
        explanation: q.explanation || "誤りの箇所を確認してから、正しい表現に直しましょう。",
        isCorrect: false,
        points: q.points || 1
      });
      return;
    }

    errorCorrectionPhase = "correct";
    selectedChoice = "";
    const hint = createInitialHint(q.correctPhrase || q.answer);
    q.words = shuffle(splitSentence(q.correctPhrase || q.answer));
    document.getElementById("feedback").className = "correct feedback-visible";
    document.getElementById("feedback").innerHTML = `<div class="feedback-card feedback-correct"><div class="feedback-icon">✅</div><div><strong>Step 1 clear</strong><p>次は正しい表現を語句タップで組み立てましょう。</p></div></div>`;
    triggerCorrectEffect({ streak: Math.max(1, quizCorrectStreak + 1), title: "Step 1 clear" });
    playFeedbackTone(true, 1);
    document.getElementById("questionArea").innerHTML = `
      <div class="error-correction-card">
        <div class="task-badge">Step 2 / 修正</div>
        <div class="source-expression"><span>誤り</span><strong>${escapeHtml(q.incorrectPhrase)}</strong></div>
        <div class="target-expression"><span>正しい表現</span><strong>${escapeHtml(hint)}</strong></div>
        <div class="words" id="sentenceWords">${q.words.map(word => `<button type="button" class="word-chip">${escapeHtml(word)}</button>`).join("")}</div>
        <input type="text" id="answerInput" class="answer-input" readonly inputmode="none" placeholder="語句をタップして完成" autocomplete="off" />
        <button type="button" id="clearSentenceButton" class="secondary-button small-button">入力を消す</button>
      </div>
    `;
    document.querySelectorAll("#sentenceWords .word-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const input = document.getElementById("answerInput");
        input.value = `${input.value.trim()} ${chip.textContent.trim()}`.trim();
        updateUsedWords();
      });
    });
    document.getElementById("clearSentenceButton").addEventListener("click", () => {
      const input = document.getElementById("answerInput");
      input.value = "";
      updateUsedWords();
    });
    return;
  }

  const userAnswer = document.getElementById("answerInput")?.value || "";
  const correctAnswer = q.correctPhrase || q.answer;
  const isCorrect = normalizeSentence(userAnswer) === normalizeSentence(correctAnswer);
  if (isCorrect) removeWrongWord(q.id);
  else saveWrongWord(q.id);
  processAnswer({
    id: q.id,
    section: q.section,
    question: q.wrongSentence,
    userAnswer,
    correctAnswer,
    explanation: q.explanation || "誤りを発見した後、正しいチャンクとして言い直せることが目標です。",
    isCorrect,
    points: q.points || 1
  });
}



/* =========================
   解答判定
========================= */

function checkAnswer() {
  if (TEST_CONFIG[testType].type === "choice") checkChoiceAnswer();
  if (TEST_CONFIG[testType].type === "sentence") checkSentenceAnswer();
  if (TEST_CONFIG[testType].type === "cloze") checkClozeAnswer();
  if (TEST_CONFIG[testType].type === "errorCorrection") checkErrorCorrectionAnswer();
}

function checkChoiceAnswer() {
  const q = questions[currentIndex];
  if (!selectedChoice) {
    alert("選択肢を選んでください。");
    return;
  }

  const isCorrect = selectedChoice === q.correctAnswer;
  if (TEST_CONFIG[testType].review) {
    if (isCorrect && reviewMode) removeWrongWord(q.id);
    if (!isCorrect) saveWrongWord(q.id);
  }

  processAnswer({
    id: q.id,
    section: q.section,
    question: q.question || q.prompt || q.word,
    userAnswer: selectedChoice,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || "",
    isCorrect,
    points: q.points || 1
  });
}

function checkSentenceAnswer() {
  const q = questions[currentIndex];
  const userAnswer = document.getElementById("answerInput").value;
  const isCorrect = normalizeSentence(userAnswer) === normalizeSentence(q.answer);

  processAnswer({
    id: q.id,
    section: q.section,
    question: q.prompt || q.words.join(" / "),
    userAnswer,
    correctAnswer: q.answer,
    explanation: q.explanation || "",
    isCorrect,
    points: q.points || 1
  });
}

function checkClozeAnswer() {
  const q = questions[currentIndex];
  const userAnswer = document.getElementById("answerInput").value;
  const wordCheck = createWordLevelFeedback(userAnswer, q.answer);
  const isCorrect = normalizeSentence(userAnswer) === normalizeSentence(q.answer);

  processAnswer({
    id: q.id,
    section: q.section,
    question: q.prompt,
    userAnswer,
    correctAnswer: q.answer,
    explanation: q.explanation || "",
    isCorrect,
    points: q.points || 1,
    wordCheck
  });
}

function createWordLevelFeedback(userAnswer, correctAnswer) {
  const userWords = splitSentence(userAnswer);
  const correctWords = splitSentence(correctAnswer);
  const maxLength = Math.max(userWords.length, correctWords.length);
  const items = [];

  for (let index = 0; index < maxLength; index++) {
    const expected = correctWords[index] || "";
    const actual = userWords[index] || "";
    const isCorrect = expected && actual && normalizeForCompare(actual) === normalizeForCompare(expected);
    items.push({
      index: index + 1,
      expected,
      actual,
      status: isCorrect ? "correct" : actual ? "wrong" : "missing"
    });
  }

  const correctCount = items.filter(item => item.status === "correct").length;
  return {
    correctCount,
    total: correctWords.length,
    items
  };
}

function renderWordLevelFeedback(wordCheck) {
  if (!wordCheck || !Array.isArray(wordCheck.items) || wordCheck.items.length === 0) return "";
  const rows = wordCheck.items.map(item => {
    const label = item.status === "correct" ? "○" : item.status === "missing" ? "未入力" : "×";
    const actual = item.actual || "—";
    const expected = item.expected || "—";
    return `
      <div class="word-level-row word-level-${escapeHtml(item.status)}">
        <span class="word-level-mark">${escapeHtml(label)}</span>
        <span class="word-level-actual">${escapeHtml(actual)}</span>
        <span class="word-level-arrow">→</span>
        <span class="word-level-expected">${escapeHtml(expected)}</span>
      </div>`;
  }).join("");

  return `
    <div class="word-level-feedback">
      <strong>語ごとの確認：${wordCheck.correctCount} / ${wordCheck.total}語</strong>
      <small>左が入力、右が正しい語です。</small>
      <div class="word-level-grid">${rows}</div>
    </div>`;
}

function processAnswer(data) {
  clearQuestionTimer();
  const now = new Date();
  const responseSeconds = questionStartTime ? Math.max(0, Math.round((now - questionStartTime) / 1000)) : 0;
  const feedback = document.getElementById("feedback");

  if (data.isCorrect) {
    score += data.points;
    quizCorrectStreak += 1;
    bestCorrectStreak = Math.max(bestCorrectStreak, quizCorrectStreak);
    const praise = getCorrectPraise();
    feedback.className = "correct feedback-visible";
    feedback.innerHTML = `
      <div class="feedback-card feedback-correct">
        <div class="feedback-icon">${praise.icon}</div>
        <div>
          <strong>${escapeHtml(praise.title)}</strong>
          <p>${escapeHtml(praise.message)}</p>
          <div class="feedback-stats"><span>${quizCorrectStreak}連続</span><span>Best ${bestCorrectStreak}</span><span>+${data.points || 1} XP</span></div>
        </div>
      </div>
    `;
    if (quizCorrectStreak >= 3) feedback.innerHTML += getComboMessageHtml(quizCorrectStreak);
    triggerCorrectEffect({ streak: quizCorrectStreak, title: praise.title });
    playFeedbackTone(true, quizCorrectStreak);
  } else {
    quizCorrectStreak = 0;
    playFeedbackTone(false, 0);
    feedback.className = "wrong feedback-visible";
    feedback.innerHTML = `
      <div class="feedback-card feedback-wrong">
        <div class="feedback-icon">${data.timedOut ? "⏰" : "💡"}</div>
        <div>
          <strong>${data.timedOut ? "時間切れ" : "あと少し"}</strong>
          <p>正解：${escapeHtml(data.correctAnswer)}</p>
        </div>
      </div>
    `;
    mistakes.push(data);
    lastMistakeQuestions = questions.filter(q => mistakes.some(m => String(m.id) === String(q.id)));
  }

  if (bossBattleState?.active) {
    updateBossBattleAfterAnswer(Boolean(data.isCorrect), feedback);
  }

  if (data.wordCheck) {
    feedback.innerHTML += renderWordLevelFeedback(data.wordCheck);
  }

  if (data.explanation) {
    feedback.innerHTML += `<div class="explanation-box">解説：${escapeHtml(data.explanation)}</div>`;
  }

  const record = {
    date: now.toLocaleString("ja-JP"),
    dateKey: getDateKey(now),
    accessCode: currentAccessCode,
    studentId: currentStudentId,
    studentName: currentStudentName,
    category: TEST_CONFIG[testType].category,
    material: TEST_CONFIG[testType].title,
    testType,
    mode: bossBattleState?.active ? "ボス戦" : (reviewMode ? "復習" : "通常"),
    questionId: data.id,
    section: data.section,
    question: data.question,
    userAnswer: data.userAnswer,
    correctAnswer: data.correctAnswer,
    result: data.isCorrect ? "正解" : "不正解",
    correct: data.isCorrect,
    responseTime: responseSeconds,
    responseTimeSec: responseSeconds,
    timeLimit: selectedTimeLimit || "制限なし",
    timedOut: Boolean(data.timedOut),
    explanation: data.explanation || "",
    points: data.points || 1,
    isCorrect: data.isCorrect,
    wordCorrectCount: data.wordCheck?.correctCount ?? "",
    wordTotal: data.wordCheck?.total ?? ""
  };

  answersLog.push(record);
  appendLocalHistory(record);
  if (!USE_LOCAL_ONLY && USE_PER_QUESTION_SYNC) {
    sendAnswerRecordToSpreadsheet(record);
  }

  document.getElementById("checkButton").disabled = true;
  const delay = Number(selectedAutoNextDelay) || 0;
  const nextButton = document.getElementById("nextButton");
  nextButton.textContent = delay > 0
    ? `次の問題へ（${(delay / 1000).toFixed(1)}秒後に自動で進みます）`
    : "次の問題へ";
  nextButton.classList.remove("hidden");
  document.getElementById("progressBar").style.width = `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`;

  clearAutoAdvanceTimer();
  if (delay > 0) {
    autoAdvanceTimerId = setTimeout(() => {
      nextQuestion();
    }, data.isCorrect ? delay : delay + 900);
  }
}

function getCorrectPraise() {
  const praises = [
    { icon: "🎉", title: "Great!", message: "その表現はそのままSpeakingで使えます。" },
    { icon: "⚡", title: "Nice output!", message: "チャンクとして素早く出せる形に近づいています。" },
    { icon: "🌟", title: "Excellent!", message: "正確さと自然さの両方を積み上げられています。" },
    { icon: "🔥", title: "Keep going!", message: "この調子で使える表現を増やしましょう。" }
  ];
  return praises[currentIndex % praises.length];
}

function triggerCorrectEffect(options = {}) {
  const streak = Number(options.streak) || 1;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const layer = document.createElement("div");
  layer.className = `celebration-layer ${streak >= 3 ? "combo-layer" : ""} ${streak >= 7 ? "super-combo-layer" : ""}`;

  const badge = document.createElement("div");
  badge.className = "celebration-badge";
  badge.innerHTML = `<strong>${streak >= 3 ? `${streak}連続正解！` : escapeHtml(options.title || "正解！")}</strong><span>${streak >= 3 ? "集中が続いています" : "使える知識が1つ増えました"}</span>`;
  layer.appendChild(badge);

  const marks = streak >= 5 ? ["★", "✦", "✓", "+1", "●", "◆", "✨"] : ["★", "✦", "✓", "+1", "●"];
  const count = reduceMotion ? 8 : (streak >= 5 ? 46 : 30);
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.textContent = marks[i % marks.length];
    piece.style.left = `${6 + Math.random() * 88}%`;
    piece.style.setProperty("--start-y", `${4 + Math.random() * 22}%`);
    piece.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
    piece.style.animationDelay = `${Math.random() * 0.22}s`;
    piece.style.animationDuration = `${0.95 + Math.random() * 0.55}s`;
    layer.appendChild(piece);
  }
  document.body.classList.add("correct-flash");
  if (streak >= 3) document.body.classList.add("combo-flash");
  document.body.appendChild(layer);
  setTimeout(() => document.body.classList.remove("correct-flash", "combo-flash"), streak >= 3 ? 1200 : 850);
  setTimeout(() => layer.remove(), reduceMotion ? 900 : 1550);
}

function playFeedbackTone(isCorrect, streak = 0) {
  if (!isSoundEnabled()) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const notes = isCorrect ? (streak >= 5 ? [523, 659, 784] : [523, 659]) : [220];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = isCorrect ? "sine" : "triangle";
      gain.gain.setValueAtTime(0.001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(isCorrect ? 0.09 : 0.045, now + index * 0.08 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.18);
    });
    setTimeout(() => ctx.close && ctx.close(), 600);
  } catch (error) {
    // 音が鳴らなくても学習機能は止めない
  }
}

function nextQuestion() {
  clearAutoAdvanceTimer();
  currentIndex++;
  if (currentIndex < questions.length) showQuestion();
  else showResult(false);
}

function quitQuiz() {
  clearAutoAdvanceTimer();
  if (confirm("途中で終了して、結果画面に進みますか？")) showResult(true);
}


function updateBossBattleAfterAnswer(isCorrect, feedback) {
  if (!bossBattleState?.active || !feedback) return;
  if (isCorrect) {
    bossBattleState.correct += 1;
    const damage = Math.ceil(bossBattleState.maxHp / Math.max(1, bossBattleState.total));
    bossBattleState.hp = Math.max(0, bossBattleState.hp - damage);
  }
  const hpPercent = Math.max(0, Math.round((bossBattleState.hp / bossBattleState.maxHp) * 100));
  feedback.innerHTML += `
    <div class="boss-feedback-card ${isCorrect ? "hit" : "guard"}">
      <div class="boss-mini-character">👾</div>
      <div>
        <strong>${isCorrect ? "ボスにダメージ！" : "ボスが耐えた..."}</strong>
        <p>Boss HP ${hpPercent}% / ${bossBattleState.correct}問正解</p>
        <div class="boss-hp-bar"><i style="width:${hpPercent}%"></i></div>
      </div>
    </div>`;
}


/* =========================
   結果表示・送信
========================= */

async function showResult(isQuit) {
  clearQuestionTimer();
  const endTime = new Date();
  const answeredCount = answersLog.length;
  const totalSeconds = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const accuracy = answeredCount ? Math.round((answersLog.filter(a => a.correct).length / answeredCount) * 100) : 0;

  updateStreak();
  showOnly("resultScreen");
  document.getElementById("motivationMessage").innerHTML = USE_LOCAL_ONLY
    ? "<strong>端末内に記録しています...</strong><br>解答履歴はこのブラウザの localStorage に保存されます。"
    : "<strong>記録しています...</strong><br>解答履歴は端末内に保存し、Apps Scriptへは1問ずつ軽く送信します。";
  document.getElementById("scoreDisplay").textContent = "";
  document.getElementById("dateDisplay").textContent = "";
  document.getElementById("timeDisplay").textContent = "";
  document.getElementById("sendStatusDisplay").textContent = USE_LOCAL_ONLY ? "端末内保存：保存中" : "端末内保存＋1問ごと送信：確認中";
  document.getElementById("mistakeArea").innerHTML = "";

  const sendStatus = await sendResultsToSpreadsheet({ isQuit, endTime, answeredCount, totalSeconds, accuracy });

  const correctCount = answersLog.filter(a => a.correct).length;
  document.getElementById("motivationMessage").innerHTML = getMotivationMessage(accuracy, answeredCount);
  renderBossResultIfNeeded(isQuit);
  document.getElementById("scoreDisplay").innerHTML = `
    <span class="result-card-label">${isQuit ? "途中終了" : "Complete"}</span>
    <strong><b>${correctCount}</b> / ${answeredCount}</strong>
    <small>正答率 ${accuracy}%・Best ${bestCorrectStreak}連続</small>
  `;
  document.getElementById("dateDisplay").innerHTML = `<span class="result-card-label">回答日時</span><strong>${escapeHtml(endTime.toLocaleString("ja-JP"))}</strong>`;
  document.getElementById("timeDisplay").innerHTML = `<span class="result-card-label">学習時間</span><strong>${minutes}分 ${seconds}秒</strong>`;
  document.getElementById("sendStatusDisplay").innerHTML = `<span class="result-card-label">保存状態</span><strong>${escapeHtml(sendStatus)}</strong>`;
  const retryButton = document.getElementById("retryMistakesButton");
  if (retryButton) retryButton.classList.toggle("hidden", lastMistakeQuestions.length === 0);
  showMistakes();
}

function getMotivationMessage(accuracy, answeredCount) {
  if (answeredCount === 0) return "<strong>今日は準備だけでもOKです。</strong><br>次は1問だけ始めてみましょう。";
  if (accuracy >= 90) return "<strong>すばらしい安定感です。</strong><br>次は制限時間を少し短くすると、さらに実戦力が上がります。";
  if (accuracy >= 70) return "<strong>かなり良いペースです。</strong><br>ミスした問題だけをもう一度解くと定着しやすくなります。";
  return "<strong>復習の価値が高い回です。</strong><br>今日はミスを見つけられたこと自体が成果です。";
}

function showMistakes() {
  const area = document.getElementById("mistakeArea");
  if (mistakes.length === 0) {
    area.innerHTML = "<p class='correct'>ミスはありません。</p>";
    return;
  }

  area.innerHTML = `
    <div class="mistake-list">
      <h3>今回ミスした問題</h3>
      ${mistakes.map(m => `
        <div class="mistake-item">
          <strong>問題：</strong>${escapeHtml(m.question)}<br>
          <strong>あなたの答え：</strong>${escapeHtml(m.userAnswer)}<br>
          <strong>正解：</strong>${escapeHtml(m.correctAnswer)}<br>
          ${m.explanation ? `<strong>解説：</strong>${escapeHtml(m.explanation)}` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

async function sendAnswerRecordToSpreadsheet(record) {
  if (USE_LOCAL_ONLY || !GAS_WEB_APP_URL) return false;
  try {
    await apiPostNoCors({ action: "appendAnswerRecord", ...record });
    return true;
  } catch (error) {
    console.warn("1問ごとの送信に失敗しました。端末内履歴は保持されています。", error);
    return false;
  }
}

async function sendResultsToSpreadsheet(resultInfo) {
  if (USE_LOCAL_ONLY || !GAS_WEB_APP_URL) return "端末内保存：完了（localStorage）";

  const payload = {
    action: USE_PER_QUESTION_SYNC ? "submitQuizSummary" : "submitQuizResult",
    accessCode: currentAccessCode,
    studentId: currentStudentId,
    studentName: currentStudentName,
    category: TEST_CONFIG[testType].category,
    material: TEST_CONFIG[testType].title,
    testType,
    mode: reviewMode ? "復習" : "通常",
    status: resultInfo.isQuit ? "途中終了" : "完了",
    score,
    totalQuestions: questions.length,
    answeredCount: resultInfo.answeredCount,
    accuracy: resultInfo.accuracy,
    totalSeconds: resultInfo.totalSeconds,
    startTime: startTime.toLocaleString("ja-JP"),
    endTime: resultInfo.endTime.toLocaleString("ja-JP"),
    answers: USE_PER_QUESTION_SYNC ? [] : answersLog
  };

  try {
    await apiPostNoCors(payload);
    return USE_PER_QUESTION_SYNC ? "端末内保存＋1問ごと送信：完了" : "端末内保存＋まとめ送信：完了";
  } catch (error) {
    console.error("端末内保存エラー:", error);
    return "端末内保存：失敗";
  }
}


function renderBossResultIfNeeded(isQuit) {
  if (typeof isFeatureEnabled === "function" && !isFeatureEnabled("boss")) return;
  if (!bossBattleState?.active) return;
  const cleared = !isQuit && bossBattleState.correct >= bossBattleState.total && bossBattleState.hp <= 0;
  const motivation = document.getElementById("motivationMessage");
  if (!motivation) return;
  if (cleared) {
    setBossClearedMilestone(bossBattleState.material, bossBattleState.milestone);
  }
  motivation.innerHTML += `
    <div class="boss-result-card ${cleared ? "cleared" : "retry"}">
      <strong>${cleared ? "Boss Clear!" : "Boss Retry"}</strong>
      <p>${cleared ? "間違い問題を全問突破しました。次の50問で新しいボスが出現します。" : "今回は討伐失敗です。間違えた問題をもう一度復習すると、次はHPを削り切れます。"}</p>
    </div>`;
}


/* =========================
   Writing提出
========================= */

async function openWriting(type) {
  testType = type;
  const config = TEST_CONFIG[type];
  applyThemeForMaterial(type);
  showOnly("writingScreen");
  document.getElementById("writingTitle").textContent = config.title;
  document.getElementById("writingDescription").textContent = config.description || "";
  document.getElementById("writingText").value = "";
  document.getElementById("writingSubmitMessage").textContent = "";
  updateWritingWordCount();
  writingStartTime = new Date();

  writingTasks = await ensureQuestionsLoaded(type);
  const select = document.getElementById("writingTaskSelect");
  select.innerHTML = writingTasks.map(task => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.section)}：${escapeHtml(task.id)}</option>`).join("");
  renderSelectedWritingTask();
}

function renderSelectedWritingTask() {
  const id = document.getElementById("writingTaskSelect")?.value;
  const task = writingTasks.find(t => t.id === id) || writingTasks[0];
  const area = document.getElementById("writingPrompt");
  if (!task) {
    area.innerHTML = "<p class='error'>Writing課題がありません。</p>";
    return;
  }
  area.innerHTML = `
    <h3>課題 ${escapeHtml(task.id)}</h3>
    <p>${escapeHtml(task.prompt)}</p>
    <p class="muted">目安語数：${escapeHtml(task.targetWords)} words</p>
    ${task.memo ? `<p class="muted">${escapeHtml(task.memo)}</p>` : ""}
  `;
}

function updateWritingWordCount() {
  const text = document.getElementById("writingText")?.value || "";
  document.getElementById("writingWordCount").textContent = countEnglishWords(text);
}

async function submitWriting() {
  const msg = document.getElementById("writingSubmitMessage");
  const text = document.getElementById("writingText").value.trim();
  const taskId = document.getElementById("writingTaskSelect").value;
  const task = writingTasks.find(t => t.id === taskId);

  if (!text) {
    msg.className = "error";
    msg.textContent = "Writing本文を入力してください。";
    return;
  }

  const timeSpent = writingStartTime ? Math.round((new Date() - writingStartTime) / 1000) : 0;
  const payload = {
    action: "submitWriting",
    date: new Date().toLocaleString("ja-JP"),
    dateKey: getDateKey(new Date()),
    accessCode: currentAccessCode,
    studentId: currentStudentId,
    studentName: currentStudentName,
    material: TEST_CONFIG[testType].title,
    taskId,
    prompt: task?.prompt || "",
    writingText: text,
    wordCount: countEnglishWords(text),
    timeSpent
  };

  try {
    msg.className = "muted";
    msg.textContent = "端末内に保存しています...";
    appendLocalWriting(payload);
    if (!USE_LOCAL_ONLY) await apiPostNoCors(payload);
    msg.className = "correct";
    msg.textContent = "端末内への保存が完了しました。";
  } catch (error) {
    console.error(error);
    msg.className = "error";
    msg.textContent = "保存に失敗しました。ブラウザの保存容量や設定を確認してください。";
  }
}



/* =========================
   解答履歴
========================= */

function appendLocalHistory(record) {
  const history = getLocalHistory();
  history.push(record);
  localStorage.setItem(STORAGE_KEYS.answerHistory, JSON.stringify(history));
}

function appendLocalWriting(record) {
  const history = getLocalWritingHistory();
  history.push(record);
  localStorage.setItem(STORAGE_KEYS.writingHistory, JSON.stringify(history));
}

function getLocalWritingHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.writingHistory)) || [];
  } catch {
    return [];
  }
}

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.answerHistory)) || [];
  } catch {
    return [];
  }
}

function openHistoryScreen() {
  if (!isAdmin) {
    alert("管理者のみ閲覧できます。" );
    return;
  }
  showOnly("historyScreen");
  renderHistory();
}

function renderHistory() {
  const query = (document.getElementById("historySearchInput")?.value || "").toLowerCase();
  const history = getLocalHistory().filter(item => {
    const text = `${item.studentId} ${item.studentName} ${item.accessCode} ${item.material} ${item.question} ${item.userAnswer} ${item.correctAnswer}`.toLowerCase();
    return text.includes(query);
  }).reverse();

  renderHistorySummary(history);

  const area = document.getElementById("historyTableArea");
  if (history.length === 0) {
    area.innerHTML = "<p class='muted'>履歴がありません。</p>";
    return;
  }

  area.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>回答日時</th><th>コード</th><th>学習者</th><th>教材</th><th>ID</th><th>問題</th><th>回答</th><th>正解</th><th>正誤</th><th>秒</th>
        </tr>
      </thead>
      <tbody>
        ${history.map(item => `
          <tr>
            <td>${escapeHtml(item.date)}</td>
            <td>${escapeHtml(item.accessCode || "")}</td>
            <td>${escapeHtml(item.studentName ? `${item.studentId} ${item.studentName}` : item.studentId)}</td>
            <td>${escapeHtml(item.material)}</td>
            <td>${escapeHtml(item.questionId)}</td>
            <td>${escapeHtml(item.question)}</td>
            <td>${escapeHtml(item.userAnswer)}</td>
            <td>${escapeHtml(item.correctAnswer)}</td>
            <td class="${item.correct ? "correct" : "wrong"}">${escapeHtml(item.result)}</td>
            <td>${escapeHtml(item.responseTime)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderHistorySummary(history) {
  const total = history.length;
  const correct = history.filter(h => h.correct).length;
  const students = new Set(history.map(h => h.studentId)).size;
  const accuracy = total ? Math.round((correct / total) * 100) + "%" : "-";

  document.getElementById("historySummary").innerHTML = `
    <div class="stat-card"><span>履歴件数</span><strong>${total}件</strong></div>
    <div class="stat-card"><span>学習者数</span><strong>${students}人</strong></div>
    <div class="stat-card"><span>正答率</span><strong>${accuracy}</strong></div>
  `;
}

function exportHistoryCSV() {
  const history = getLocalHistory();
  if (history.length === 0) {
    alert("出力する履歴がありません。" );
    return;
  }

  const headers = ["date", "accessCode", "studentId", "studentName", "category", "material", "questionId", "question", "userAnswer", "correctAnswer", "result", "responseTime", "mode", "section", "timeLimit", "timedOut", "explanation"];
  const csv = [headers.join(",")]
    .concat(history.map(item => headers.map(header => csvEscape(item[header])).join(",")))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `answer_history_${getDateKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  if (!isAdmin) return;
  if (!confirm("この端末内の解答履歴をすべて削除しますか？この操作は元に戻せません。")) return;
  localStorage.removeItem(STORAGE_KEYS.answerHistory);
  renderHistory();
  refreshDashboard();
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}



/* =========================
   間違い復習
========================= */

function saveWrongWord(id) {
  const key = getWrongKey();
  const wrongIds = getWrongIds();
  if (!wrongIds.includes(String(id))) wrongIds.push(String(id));
  localStorage.setItem(key, JSON.stringify(wrongIds));
  updateMistakeCountInSettings();
}

function removeWrongWord(id) {
  const key = getWrongKey();
  const wrongIds = getWrongIds().filter(wrongId => wrongId !== String(id));
  localStorage.setItem(key, JSON.stringify(wrongIds));
  updateMistakeCountInSettings();
}

function getWrongIds() {
  try {
    return JSON.parse(localStorage.getItem(getWrongKey())) || [];
  } catch {
    return [];
  }
}

function getWrongKey(type = testType) {
  return `${STORAGE_KEYS.legacyWrongPrefix}_${type}_${currentStudentId || "unknown"}`;
}

function clearStoredMistakes() {
  if (!confirm("この学習者の単語間違い履歴を削除しますか？")) return;
  localStorage.removeItem(getWrongKey());
  updateMistakeCountInSettings();
  alert("間違い履歴を削除しました。" );
}





/* =========================
   ホーム画面：お知らせ・Apps Script確認
========================= */

function renderSyncNotice(status = "checking", details = "") {
  const banner = document.getElementById("syncNoticeBanner");
  const statusText = document.getElementById("appsScriptStatusText");
  if (!banner || !statusText) return;
  banner.classList.remove("notice-ok", "notice-warn", "notice-local");
  if (USE_LOCAL_ONLY) {
    banner.classList.add("notice-local");
    statusText.textContent = "現在はlocalStorage保存のみです。スプレッドシート送信を使う場合は USE_LOCAL_ONLY=false にしてください。";
    return;
  }
  if (status === "ok") {
    banner.classList.add("notice-ok");
    statusText.textContent = details || "Apps Scriptは appendAnswerRecord / submitQuizSummary に対応しています。";
    return;
  }
  if (status === "warn") {
    banner.classList.add("notice-warn");
    statusText.textContent = details || "Apps Scriptの最新反映を確認できませんでした。Webアプリを新しいバージョンで再デプロイしてください。";
    return;
  }
  statusText.textContent = "Apps Scriptの反映状況を確認中です。";
}

async function checkAppsScriptIntegration() {
  if (USE_LOCAL_ONLY || !GAS_WEB_APP_URL) {
    renderSyncNotice("warn", "GAS_WEB_APP_URLが未設定、またはlocalStorage保存のみの設定です。");
    return;
  }
  try {
    const result = await apiGetJsonp("status");
    const features = Array.isArray(result?.features) ? result.features : [];
    const hasPerQuestion = features.includes("appendAnswerRecord") || features.includes("quizAnswer");
    const hasSummary = features.includes("submitQuizSummary") || features.includes("quizSummary");
    if (result?.ok && hasPerQuestion && hasSummary) {
      renderSyncNotice("ok", "反映確認OK：1問ごとの送信と結果概要の保存に対応しています。");
    } else if (result?.ok) {
      renderSyncNotice("warn", "GASは応答していますが、1問ごと送信のfeaturesが確認できません。最新Apps Scriptを再デプロイしてください。");
    } else {
      renderSyncNotice("warn", result?.error || "GASのstatus応答が不正です。");
    }
  } catch (error) {
    renderSyncNotice("warn", "この画面からApps Scriptへ接続確認できませんでした。デプロイURL・公開範囲・新バージョン反映を確認してください。");
  }
}

function getComboMessageHtml(streak) {
  if (streak >= 10) return `<div class="combo-message super"><strong>${streak}連続正解！</strong><span>かなり強い集中が続いています。ここで一度深呼吸して、正確さを維持しましょう。</span></div>`;
  if (streak >= 5) return `<div class="combo-message"><strong>${streak}連続正解！</strong><span>知識の根が一気に伸びています。次の1問も落ち着いていきましょう。</span></div>`;
  return `<div class="combo-message light"><strong>${streak}連続正解</strong><span>よい流れです。使える知識として定着し始めています。</span></div>`;
}



/* =========================
   ホーム画面：知識の根
========================= */

function getCurrentStudentHistory() {
  return getLocalHistory().filter(item => item.studentId === currentStudentId);
}

function getGrowthStage(correctCount) {
  if (correctCount >= 500) return 5;
  if (correctCount >= 250) return 4;
  if (correctCount >= 100) return 3;
  if (correctCount >= 30) return 2;
  if (correctCount >= 1) return 1;
  return 0;
}

function getZodiacInfo(date = new Date()) {
  const zodiacs = [
    { key: "子", name: "ねずみ", icon: "🐭", trait: "すばやく確認" },
    { key: "丑", name: "うし", icon: "🐮", trait: "ゆっくり確実" },
    { key: "寅", name: "とら", icon: "🐯", trait: "挑戦する力" },
    { key: "卯", name: "うさぎ", icon: "🐰", trait: "テンポよく進む" },
    { key: "辰", name: "たつ", icon: "🐲", trait: "大きく伸びる" },
    { key: "巳", name: "へび", icon: "🐍", trait: "細部を見る" },
    { key: "午", name: "うま", icon: "🐴", trait: "走り切る集中" },
    { key: "未", name: "ひつじ", icon: "🐏", trait: "やさしく継続" },
    { key: "申", name: "さる", icon: "🐵", trait: "工夫して覚える" },
    { key: "酉", name: "とり", icon: "🐤", trait: "声に出す練習" },
    { key: "戌", name: "いぬ", icon: "🐶", trait: "復習を守る" },
    { key: "亥", name: "いのしし", icon: "🐗", trait: "一気に突破" }
  ];
  const dayNumber = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
  return zodiacs[((dayNumber % zodiacs.length) + zodiacs.length) % zodiacs.length];
}

function getDailyZodiacLevelInfo(todayCorrectCount) {
  const count = Math.max(0, Number(todayCorrectCount || 0));
  const thresholds = [0, 3, 10, 20, 30];
  let level = 1;

  for (let i = 1; i < thresholds.length; i++) {
    if (count >= thresholds[i]) level = i + 1;
  }

  const currentBase = thresholds[level - 1] || 0;
  const nextTarget = thresholds[level] || null;
  const remaining = nextTarget ? Math.max(0, nextTarget - count) : 0;
  const progress = nextTarget
    ? Math.min(100, Math.max(count > 0 ? 8 : 0, Math.round(((count - currentBase) / Math.max(1, nextTarget - currentBase)) * 100)))
    : 100;

  return {
    level,
    nextTarget,
    remaining,
    progress,
    isMaxLevel: !nextTarget
  };
}

function getDailyZodiacLevel(todayCorrectCount) {
  return getDailyZodiacLevelInfo(todayCorrectCount).level;
}

function getTreeLevelInfo(correctCount) {
  const count = Math.max(0, Number(correctCount || 0));
  const thresholds = [0, 5, 15, 30, 60, 100, 160, 250, 380, 550, 750, 1000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (count >= thresholds[i]) level = i + 1;
  }
  const currentBase = thresholds[level - 1] || 0;
  const nextTarget = thresholds[level] || null;
  const remaining = nextTarget ? Math.max(0, nextTarget - count) : 0;
  const progress = nextTarget
    ? Math.min(100, Math.max(count > 0 ? 6 : 0, Math.round(((count - currentBase) / Math.max(1, nextTarget - currentBase)) * 100)))
    : 100;
  return {
    level,
    maxLevel: thresholds.length,
    nextTarget,
    remaining,
    progress,
    isMaxLevel: !nextTarget,
    maxTarget: thresholds[thresholds.length - 1]
  };
}

function getTreeLevel(correctCount) {
  return getTreeLevelInfo(correctCount).level;
}

function renderGrowthHome() {
  const area = document.getElementById("growthHomeArea");
  if (!area || !currentStudentId) return;
  const featureIsOn = typeof isFeatureEnabled === "function" ? isFeatureEnabled : () => true;
  const showTree = featureIsOn("learningTree");
  const showZodiac = featureIsOn("zodiac");
  if (!showTree && !showZodiac) {
    area.innerHTML = "";
    area.classList.add("hidden");
    return;
  }
  area.classList.remove("hidden");

  const history = getCurrentStudentHistory();
  const todayKey = getDateKey(new Date());
  const todayHistory = history.filter(item => item.dateKey === todayKey);
  const todayCorrect = todayHistory.filter(item => item.correct).length;
  const correctCount = history.filter(item => item.correct).length;
  const total = history.length;
  const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
  const days = new Set(history.map(item => item.dateKey).filter(Boolean)).size;
  const stage = getGrowthStage(correctCount);
  const treeLevelInfo = getTreeLevelInfo(correctCount);
  const treeLevel = treeLevelInfo.level;
  const remaining = treeLevelInfo.remaining;
  const rootPercent = treeLevelInfo.progress;
  const zodiac = getZodiacInfo();
  const zodiacLevelInfo = getDailyZodiacLevelInfo(todayCorrect);
  const zodiacLevel = zodiacLevelInfo.level;
  const zodiacNextText = zodiacLevelInfo.isMaxLevel
    ? "本日の最高Lv.達成"
    : `次のLv.まであと ${zodiacLevelInfo.remaining}問`;
  const streakInfo = getProtectedStreakInfo();
  const bonusProgress = Math.min(6, Math.max(0, Number(streakInfo.count || 0) % 6 || (streakInfo.count >= 6 ? 6 : streakInfo.count)));
  const revivalTickets = getRevivalTicketCount();
  const expBoosts = Math.floor(correctCount / 100);
  const hintTickets = Math.floor(total / 30);
  const characterMood = todayCorrect >= 10 ? "great" : todayCorrect >= 3 ? "happy" : "calm";
  const titleText = showTree && showZodiac ? "通算の木と本日の十二支" : showTree ? "通算の木" : "本日の十二支";
  const bodyText = showTree && showZodiac
    ? "通算では木が育ち、日替わりでは十二支キャラが育ちます。継続・復習・正解の積み重ねを、画面上で見える化します。"
    : showTree
      ? "通算の正解数に合わせて、学習の木が育ちます。"
      : "今日の正解数に合わせて、日替わり十二支キャラが育ちます。";
  const badgeText = showTree ? `木 Lv.${treeLevel} / Max ${treeLevelInfo.maxLevel}` : `${zodiac.key} Lv.${zodiacLevel}`;

  const treePanel = showTree ? `
      <article class="growth-tree-panel">
        <div class="panel-label">通算</div>
        <div class="plant-visual plant-stage-${stage}" style="--root-progress:${rootPercent}%;" aria-label="通算学習の木">
          <div class="plant-sky">
            <div class="plant-stem"></div>
            <div class="plant-leaf leaf-left"></div>
            <div class="plant-leaf leaf-right"></div>
            <div class="plant-bloom"></div>
          </div>
          <div class="plant-soil">
            <span class="root root-a"></span>
            <span class="root root-b"></span>
            <span class="root root-c"></span>
          </div>
        </div>
        <p class="growth-next">${treeLevelInfo.isMaxLevel ? `最大レベル達成：${treeLevelInfo.maxTarget}正解到達` : `次の成長まであと <strong>${remaining}</strong> 正解`}</p>
      </article>` : "";

  const zodiacPanel = showZodiac ? `
      <article class="daily-zodiac-panel zodiac-${characterMood}">
        <div class="panel-label">日替わり十二支</div>
        <div class="zodiac-character" aria-hidden="true">
          <span class="zodiac-face">${zodiac.icon}</span>
          <span class="zodiac-spark">✦</span>
        </div>
        <h4>${zodiac.key}：${zodiac.name} Lv.${zodiacLevel}</h4>
        <p>${escapeHtml(zodiac.trait)}の日です。今日の正解数で、表情とレベルが変わります。</p>
        <div class="zodiac-level-meta">
          <span>今日の正解 ${todayCorrect}問</span>
          <strong>${escapeHtml(zodiacNextText)}</strong>
        </div>
        <div class="zodiac-exp" aria-label="十二支の次レベルまでの進捗"><i style="width:${zodiacLevelInfo.progress}%"></i></div>
        <small>${zodiacLevelInfo.isMaxLevel ? "明日また新しい十二支を育てましょう。" : `Lv.${zodiacLevel + 1} 目標：${zodiacLevelInfo.nextTarget}問`}</small>
      </article>` : "";

  area.innerHTML = `
    <div class="growth-dashboard-head">
      <div>
        <span class="panel-label">Learning Growth</span>
        <h3>${titleText}</h3>
        <p>${bodyText}</p>
      </div>
      <div class="growth-level-badge">${badgeText}</div>
    </div>

    <div class="growth-dashboard-grid ${showTree && showZodiac ? "" : "single-growth-panel"}">
      ${treePanel}
      ${zodiacPanel}
    </div>

    <div class="growth-stats quest-growth-stats">
      <span><strong>${correctCount}</strong>正解</span>
      <span><strong>${accuracy || "-"}</strong>${accuracy ? "%" : ""}正答率</span>
      <span><strong>${days}</strong>学習日</span>
      <span><strong>${streakInfo.count || 0}</strong>連続日数</span>
    </div>

    <div class="quest-reward-row">
      <section class="login-bonus-card ${streakInfo.protected ? "protected" : ""}">
        <div>
          <span class="panel-label">Login Bonus</span>
          <strong>${bonusProgress}/6日</strong>
          <p>${streakInfo.protected ? "復活チケットで連続記録を守れます。" : "6日連続で問題を解くと、復活チケットを1枚獲得します。"}</p>
        </div>
        <div class="bonus-dots">${Array.from({ length: 6 }, (_, i) => `<i class="${i < bonusProgress ? "active" : ""}"></i>`).join("")}</div>
      </section>

      <section class="item-card">
        <span class="panel-label">Items</span>
        <div class="item-list">
          <span>🎟️ 復活チケット × ${revivalTickets}</span>
          <span>✨ 経験値2倍 × ${expBoosts}</span>
          <span>💡 ヒントチケット × ${hintTickets}</span>
        </div>
      </section>
    </div>`;
}

function renderHomeLearningCalendar() {
  const area = document.getElementById("learningCalendarHomeArea");
  if (!area || !currentStudentId) return;
  const history = getCurrentStudentHistory();
  const byDate = new Map();
  history.forEach(item => {
    const key = item.dateKey || getDateKey(item.date || new Date());
    if (!byDate.has(key)) byDate.set(key, { total: 0, correct: 0 });
    const entry = byDate.get(key);
    entry.total += 1;
    if (item.correct) entry.correct += 1;
  });
  const days = [];
  const today = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const entry = byDate.get(key) || { total: 0, correct: 0 };
    days.push({ key, day: d.getDate(), weekday: "日月火水木金土"[d.getDay()], ...entry });
  }
  const streak = calculateHistoryStreak(byDate);
  const activeDays = days.filter(day => day.total > 0).length;
  area.innerHTML = `
    <div class="calendar-copy">
      <span class="panel-label">Learning Calendar</span>
      <h3>${streak}日連続で学習中</h3>
      <p>連続して学習できた日をカレンダーで見える化します。1問だけでも記録が残れば、学習の根は切れません。</p>
    </div>
    <div class="mini-calendar-grid" aria-label="直近21日の学習状況">
      ${days.map(day => `<div class="mini-day ${day.total ? "active" : ""} ${day.correct >= 5 ? "strong" : ""}" title="${day.key}: ${day.total}問">
        <span>${day.weekday}</span><strong>${day.day}</strong><small>${day.total ? `${day.total}問` : ""}</small>
      </div>`).join("")}
    </div>
    <div class="calendar-motivation"><strong>${activeDays}</strong> / 21日 学習済み　<span>今日も1問で継続達成です。</span></div>`;
}

function calculateHistoryStreak(byDate) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const entry = byDate.get(key);
    if (entry && entry.total > 0) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

function renderReviewPlant(mastered, needReview, unlearned, plantId = "localReviewPlant", messageId = "localReviewPlantMessage") {
  const stage = getGrowthStage(mastered);
  const plant = document.getElementById(plantId);
  if (plant) {
    plant.className = `plant-visual plant-stage-${stage}`;
    plant.style.setProperty("--root-progress", `${Math.min(100, mastered)}%`);
  }
  const message = mastered === 0
    ? "最初の正解が、根を伸ばすスタートになります。"
    : needReview > mastered
      ? "要復習が多い教材です。根を整える復習から始めましょう。"
      : `この教材では ${mastered} 問分の知識が根づいています。`;
  setText(messageId, message);
}



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



/* =========================
   カレンダー
========================= */

async function loadCalendarData() {
  const response = await fetch("data/calendar/toeic_calendar.json");
  if (!response.ok) {
    alert("カレンダーデータを読み込めませんでした。data/calendar/toeic_calendar.json を確認してください。" );
    return;
  }
  toeicCalendar = await response.json();
}

async function openCalendar() {
  if (toeicCalendar.length === 0) await loadCalendarData();
  showOnly("calendarScreen");
  renderCalendar();
}

function renderCalendar() {
  const area = document.getElementById("calendarArea");
  area.innerHTML = "";

  toeicCalendar.forEach((day, dayIndex) => {
    const card = document.createElement("div");
    card.className = "calendar-card";
    const taskHtml = day.tasks.map((task, taskIndex) => {
      const key = `toeicCalendar_${currentStudentId}_${dayIndex}_${taskIndex}`;
      const checked = localStorage.getItem(key) === "true" ? "checked" : "";
      return `<label class="calendar-task"><input type="checkbox" data-key="${key}" ${checked}>${escapeHtml(task)}</label>`;
    }).join("");

    card.innerHTML = `<h3>${escapeHtml(day.date)}</h3>${taskHtml}<p class="calendar-comment">${escapeHtml(day.comment)}</p>`;
    area.appendChild(card);
  });

  document.querySelectorAll("#calendarArea input[type='checkbox']").forEach(box => {
    box.addEventListener("change", function () {
      localStorage.setItem(this.dataset.key, this.checked);
    });
  });
}

function resetCalendarChecks() {
  if (!confirm("この学習者のカレンダーチェックをすべてリセットしますか？")) return;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(`toeicCalendar_${currentStudentId}_`)) localStorage.removeItem(key);
  });
  renderCalendar();
}



/* =========================
   ダッシュボード・連続学習
========================= */

function refreshDashboard() {
  const role = isAdmin ? "管理者" : "学習者";
  const namePart = currentStudentName ? `（${currentStudentName}）` : "";
  const codePart = currentAccessCode ? ` / コード：${currentAccessCode}` : "";
  const allowedPart = Array.isArray(allowedMaterials) ? ` / 利用可能教材：${allowedMaterials.length}件` : "";
  document.getElementById("studentStatus").textContent = `${role}：${currentStudentId}${namePart}${codePart}${allowedPart}`;

  const today = getDateKey(new Date());
  const history = getLocalHistory().filter(h => h.studentId === currentStudentId && h.dateKey === today);
  const correct = history.filter(h => h.correct).length;
  const accuracy = history.length ? `${Math.round((correct / history.length) * 100)}%` : "-";

  document.getElementById("todayCountDisplay").textContent = `${history.length}問`;
  document.getElementById("todayAccuracyDisplay").textContent = accuracy;
  document.getElementById("streakDisplay").textContent = `${getProtectedStreakInfo().count}日`;
}

function getStreakKey() {
  return `${STORAGE_KEYS.streakPrefix}_${currentStudentId || "unknown"}`;
}

function updateStreak() {
  const today = getDateKey(new Date());
  const info = getStreakInfo();
  const yesterday = getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const twoDaysAgo = getDateKey(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));

  if (info.lastDate === today) {
    awardRevivalTicketsIfNeeded(info.count);
    return;
  }

  let count = 1;
  let usedRevivalTicket = false;
  if (info.lastDate === yesterday) {
    count = info.count + 1;
  } else if (info.lastDate === twoDaysAgo && getRevivalTicketCount() > 0) {
    // 1日だけ空いた場合、復活チケットを自動使用して連続学習を守る
    count = info.count + 1;
    usedRevivalTicket = true;
    setRevivalTicketCount(getRevivalTicketCount() - 1);
  }

  localStorage.setItem(getStreakKey(), JSON.stringify({ lastDate: today, count, usedRevivalTicket }));
  awardRevivalTicketsIfNeeded(count);
}

function getStreakInfo() {
  try {
    return JSON.parse(localStorage.getItem(getStreakKey())) || JSON.parse(localStorage.getItem(STORAGE_KEYS.streak)) || { lastDate: "", count: 0 };
  } catch {
    return { lastDate: "", count: 0 };
  }
}

function getProtectedStreakInfo() {
  const info = getStreakInfo();
  const today = getDateKey(new Date());
  const yesterday = getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const tickets = getRevivalTicketCount();
  if (info.lastDate === today || info.lastDate === yesterday) return { ...info, protected: false, tickets };
  if (tickets > 0) return { ...info, protected: true, tickets };
  return { ...info, protected: false, tickets };
}

function getQuestItemKey(name) {
  return `learningTool_item_${name}_${currentStudentId || "unknown"}`;
}

function getRevivalTicketCount() {
  return Math.max(0, Number(localStorage.getItem(getQuestItemKey("revivalTicket")) || 0));
}

function setRevivalTicketCount(count) {
  localStorage.setItem(getQuestItemKey("revivalTicket"), String(Math.max(0, Number(count) || 0)));
}

function getAwardedStreakMilestone() {
  return Math.max(0, Number(localStorage.getItem(getQuestItemKey("streakMilestone")) || 0));
}

function setAwardedStreakMilestone(milestone) {
  localStorage.setItem(getQuestItemKey("streakMilestone"), String(Math.max(0, Number(milestone) || 0)));
}

function awardRevivalTicketsIfNeeded(streakCount) {
  const milestone = Math.floor(Number(streakCount || 0) / 6);
  const awarded = getAwardedStreakMilestone();
  if (milestone > awarded) {
    setRevivalTicketCount(getRevivalTicketCount() + (milestone - awarded));
    setAwardedStreakMilestone(milestone);
  }
}


function handleQuizKeyboard(event) {
  const active = document.activeElement;
  const isTyping = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) && !active.readOnly;
  if (isTyping) return;
  if (document.getElementById("quizScreen")?.classList.contains("hidden")) return;

  const checkButton = document.getElementById("checkButton");
  const nextButton = document.getElementById("nextButton");
  if (event.key === "Enter") {
    event.preventDefault();
    if (!nextButton.classList.contains("hidden")) nextQuestion();
    else if (!checkButton.disabled) checkAnswer();
  }
  if (/^[1-9]$/.test(event.key) && TEST_CONFIG[testType]?.type === "choice") {
    const index = Number(event.key) - 1;
    const choices = [...document.querySelectorAll(".choice-button")];
    if (choices[index]) choices[index].click();
  }
}



/* =========================
   共通関数
========================= */

function resetQuizState() {
  clearQuestionTimer();
  clearAutoAdvanceTimer();
  currentIndex = 0;
  score = 0;
  selectedChoice = "";
  answersLog = [];
  mistakes = [];
  errorCorrectionPhase = "identify";
  quizCorrectStreak = 0;
  bestCorrectStreak = 0;
  bossBattleState = null;
  questions = [];
  document.getElementById("feedback").textContent = "";
  document.getElementById("questionArea").innerHTML = "";
}

function showOnly(id) {
  [
    "loginScreen", "studentScreen", "menuScreen", "reviewDashboardScreen", "adminAccessScreen", "materialPasswordScreen", "calendarScreen",
    "settingScreen", "writingScreen", "quizScreen", "resultScreen", "historyScreen"
  ].forEach(screen => {
    const element = document.getElementById(screen);
    if (element) element.classList.add("hidden");
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
  document.body.classList.toggle("local-review-active", id === "reviewDashboardScreen");
}

function splitSentence(text) {
  return String(text).replace(/[.,!?;:]/g, "").replace(/[“”]/g, '"').replace(/[’‘]/g, "'").trim().split(/\s+/).filter(Boolean);
}

function normalizeSentence(text) {
  return String(text).replace(/[.,!?;:]/g, "").replace(/[“”]/g, '"').replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeForCompare(text) {
  return String(text).replace(/[.,!?;:]/g, "").replace(/[“”]/g, '"').replace(/[’‘]/g, "'").trim().toLowerCase();
}

function shuffle(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function escapeHtml(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
}

function countEnglishWords(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}


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

