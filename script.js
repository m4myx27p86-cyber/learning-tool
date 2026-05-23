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

const STORAGE_KEYS = {
  sessionStudent: "learningTool_sessionStudent",
  sessionName: "learningTool_sessionName",
  sessionAccessCode: "learningTool_sessionAccessCode",
  allowedMaterials: "learningTool_allowedMaterials",
  answerHistory: "learningTool_answerHistory",
  streak: "learningTool_streak"
};

const SENTENCE_FILES = [
  "data/sentence_order/sentence_order_1_100.csv",
  "data/sentence_order/sentence_order_101_200.csv"
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
    category: "highschool",
    type: "choice",
    password: "1790",
    defaultTime: 30,
    path: "data/eiken/eiken_connectors.csv",
    description: "英検準一級Writingで使いやすい接続詞・因果表現を英文穴埋めで確認します。"
  },
  eikenWriting: {
    title: "英検準一級 Writing 提出",
    category: "highschool",
    type: "writing",
    password: "1791",
    defaultTime: 0,
    path: "data/eiken/eiken_writing_tasks.csv",
    description: "英検準一級Writingの答案を提出します。採点は行わず、Google Sheetsに保存します。"
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
  englishTheory: {
    title: "英語教育理論",
    category: "teacher",
    type: "choice",
    password: "3303",
    defaultTime: 30,
    path: "data/english_theory/chapter3_theory.csv",
    description: "SLA Chapter 3 の重要概念を四択で確認します。"
  },
  classicalWords: {
    title: "古典単語",
    category: "classics",
    type: "choice",
    password: "1110",
    defaultTime: 15,
    path: "data/classics/classical_words.csv",
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
let timerId = null;
let remainingSeconds = 0;
let autoAdvanceTimerId = null;
let toeicCalendar = [];
let writingTasks = [];
let writingStartTime = null;

/* =========================
   初期化・イベント登録
========================= */

document.addEventListener("DOMContentLoaded", () => {
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

  safeAddEvent("questionCountSelect", "change", toggleCustomQuestionInput);
  safeAddEvent("startButton", "click", startNormalQuiz);
  safeAddEvent("reviewButton", "click", startReviewQuiz);
  safeAddEvent("clearStoredMistakesButton", "click", clearStoredMistakes);
  safeAddEvent("backToMenuButton", "click", () => { renderMenu(); showOnly("menuScreen"); });

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
  safeAddEvent("resultMenuButton", "click", () => {
    resetQuizState();
    renderMenu();
    showOnly("menuScreen");
  });
  safeAddEvent("logoutButton", "click", logout);

  restoreSession();
});

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
    headers: { "Content-Type": "application/json" },
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
}

function restoreSession() {
  const student = localStorage.getItem(STORAGE_KEYS.sessionStudent);
  if (!student) return;
  currentStudentId = student;
  currentStudentName = localStorage.getItem(STORAGE_KEYS.sessionName) || "";
  currentAccessCode = localStorage.getItem(STORAGE_KEYS.sessionAccessCode) || "";
  try { allowedMaterials = JSON.parse(localStorage.getItem(STORAGE_KEYS.allowedMaterials)); } catch { allowedMaterials = null; }
  isAdmin = currentStudentId === ADMIN_PASSWORD;
}

function logout() {
  currentStudentId = "";
  currentStudentName = "";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = false;
  localStorage.removeItem(STORAGE_KEYS.sessionStudent);
  localStorage.removeItem(STORAGE_KEYS.sessionName);
  localStorage.removeItem(STORAGE_KEYS.sessionAccessCode);
  localStorage.removeItem(STORAGE_KEYS.allowedMaterials);
  document.getElementById("passwordInput").value = "";
  document.getElementById("studentLoginInput").value = "";
  showOnly("loginScreen");
}

function togglePasswordField(id, checked) {
  const field = document.getElementById(id);
  if (field) field.type = checked ? "text" : "password";
}

/* =========================
   教材選択・カテゴリ表示
========================= */

function renderMenu() {
  refreshDashboard();
  renderMaterialCategories();
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
  const categoryOrder = ["toeic", "toefl", "highschool", "classics", "teacher"];

  area.innerHTML = categoryOrder.map(categoryKey => {
    const info = CATEGORY_INFO[categoryKey];
    const materials = visible.filter(type => TEST_CONFIG[type].category === categoryKey);
    let cards = materials.length
      ? materials.map(type => materialCardHtml(type)).join("")
      : `<div class="empty-category">現在利用できる教材はありません。</div>`;

    if (categoryKey === "toeic" && (isAdmin || !Array.isArray(allowedMaterials) || materials.length > 0)) {
      cards += `
        <button class="material-card accent-card" data-action="calendar">
          <span>計画</span>
          <strong>TOEIC S&W 学習カレンダー</strong>
          <small>毎日の学習チェック</small>
        </button>
      `;
    }

    return `
      <section class="category-section category-${info.theme}">
        <div class="category-head">
          <div>
            <span class="category-title"><b class="category-icon">${escapeHtml(info.icon || "✨")}</b>${escapeHtml(info.label)}</span>
            <p>${escapeHtml(info.description)}</p>
          </div>
          <small class="category-tip">今日の1問が次の自信につながります</small>
        </div>
        <div class="material-grid">${cards}</div>
      </section>
    `;
  }).join("");

  document.querySelectorAll(".material-card[data-material]").forEach(button => {
    button.addEventListener("click", () => openMaterial(button.dataset.material));
  });

  document.querySelectorAll("[data-action='calendar']").forEach(button => button.addEventListener("click", openCalendar));
  document.querySelectorAll("[data-action='history']").forEach(button => button.addEventListener("click", openHistoryScreen));
}

function materialCardHtml(type) {
  const config = TEST_CONFIG[type];
  const categoryLabel = CATEGORY_INFO[config.category]?.label || config.category;
  return `
    <button class="material-card" data-material="${escapeHtml(type)}">
      <span>${escapeHtml(categoryLabel)}</span>
      <strong>${escapeHtml(config.title)}</strong>
      <small>${escapeHtml(config.description || "")}</small>
    </button>
  `;
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
  document.body.classList.add(`theme-${CATEGORY_INFO[category]?.theme || category}`);
}

/* =========================
   管理者：アクセスコード
========================= */

function openAccessManager() {
  if (!isAdmin) return;
  renderAccessMaterialCheckboxes();
  document.getElementById("createAccessCodeMessage").textContent = "";
  showOnly("adminAccessScreen");
  loadAccessCodeList();
}

function renderAccessMaterialCheckboxes() {
  const area = document.getElementById("accessMaterialCheckboxes");
  const categoryOrder = ["toeic", "toefl", "highschool", "classics", "teacher"];
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

async function createAccessCodeFromForm() {
  const msg = document.getElementById("createAccessCodeMessage");
  const studentId = document.getElementById("accessStudentIdInput").value.trim();
  const studentName = document.getElementById("accessStudentNameInput").value.trim();
  const memo = document.getElementById("accessMemoInput").value.trim();
  const allowed = [...document.querySelectorAll("#accessMaterialCheckboxes input[type='checkbox']:checked")].map(box => box.value);

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
      allowedMaterials: allowed
    });

    if (!result.ok) throw new Error(result.error || "コード発行に失敗しました。");

    msg.className = "correct";
    msg.innerHTML = `発行しました。学習者コード：<strong class="issued-code">${escapeHtml(result.code)}</strong>`;
    document.getElementById("accessStudentIdInput").value = "";
    document.getElementById("accessStudentNameInput").value = "";
    document.getElementById("accessMemoInput").value = "";
    document.querySelectorAll("#accessMaterialCheckboxes input[type='checkbox']").forEach(box => { box.checked = false; });
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
    <table class="history-table compact-table">
      <thead>
        <tr>
          <th>コード</th><th>ID</th><th>名前</th><th>許可教材</th><th>状態</th><th>使用回数</th><th>最終使用</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(record => `
          <tr>
            <td><strong>${escapeHtml(record.code)}</strong></td>
            <td>${escapeHtml(record.studentId)}</td>
            <td>${escapeHtml(record.studentName)}</td>
            <td>${escapeHtml(materialNames(record.allowedMaterials).join(" / "))}</td>
            <td class="${record.active ? "correct" : "wrong"}">${record.active ? "有効" : "無効"}</td>
            <td>${escapeHtml(record.useCount ?? 0)}</td>
            <td>${escapeHtml(formatSheetDate(record.lastUsedAt))}</td>
            <td><button class="small-button ${record.active ? "quit-button" : "secondary-button"}" data-code="${escapeHtml(record.code)}" data-active="${record.active ? "false" : "true"}">${record.active ? "無効化" : "有効化"}</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  area.querySelectorAll("button[data-code]").forEach(button => {
    button.addEventListener("click", () => updateAccessCodeActive(button.dataset.code, button.dataset.active === "true"));
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
}

async function ensureQuestionsLoaded(type) {
  if (loadedQuestions[type]) return loadedQuestions[type];

  const config = TEST_CONFIG[type];
  if (config.type === "sentence") {
    loadedQuestions[type] = await loadSentenceQuestions(config.files);
  } else if (config.type === "cloze") {
    loadedQuestions[type] = await loadClozeQuestions(config.path);
  } else if (config.type === "writing") {
    loadedQuestions[type] = await loadWritingTasks(config.path);
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
  rows.shift();

  return rows.map(row => ({
    id: row[0],
    section: row[1],
    word: row[2],
    correctAnswer: row[3],
    choices: [row[3], row[4], row[5], row[6]].filter(Boolean),
    points: Number(row[7]) || 1,
    explanation: row[8] || ""
  })).filter(q => q.id && q.section && q.word && q.correctAnswer && q.choices.length > 0);
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

  questions = shuffle(questions);
  startQuizCommon();
}

function prepareQuiz(sourceQuestions) {
  const selectedSection = document.getElementById("sectionSelect").value;
  const countValue = document.getElementById("questionCountSelect").value;

  let pool = selectedSection === "all"
    ? [...sourceQuestions]
    : sourceQuestions.filter(q => q.section === selectedSection);

  pool = shuffle(pool);

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

  if (countValue !== "all") pool = pool.slice(0, Number(countValue));
  questions = pool;
}

function startQuizCommon() {
  currentIndex = 0;
  score = 0;
  selectedChoice = "";
  answersLog = [];
  mistakes = [];
  startTime = new Date();
  selectedTimeLimit = Number(document.getElementById("timeLimitSelect").value) || 0;
  showOnly("quizScreen");
  showQuestion();
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
  } else {
    wordDiv.innerHTML = `No.${escapeHtml(q.id)} | Section ${escapeHtml(q.section)}<br>"${escapeHtml(q.word)}" の意味は？`;
  }

  area.appendChild(wordDiv);

  shuffle(q.choices).forEach(choice => {
    const btn = document.createElement("button");
    btn.className = "choice-button";
    btn.textContent = choice;
    btn.addEventListener("click", () => {
      selectedChoice = choice;
      document.querySelectorAll(".choice-button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
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

  document.getElementById("questionArea").innerHTML = `
    ${prompt}
    <div class="answer-support"><span>入力ヒント</span>${escapeHtml(hint)}</div>
    <div class="words" id="sentenceWords">${q.words.map(word => `<button type="button" class="word-chip">${escapeHtml(word)}</button>`).join("")}</div>
    <input type="text" id="answerInput" class="answer-input" placeholder="ヒント: ${escapeHtml(hint)}" autocomplete="off" />
    <button type="button" id="clearSentenceButton" class="secondary-button small-button">入力を消す</button>
  `;

  document.querySelectorAll("#sentenceWords .word-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const input = document.getElementById("answerInput");
      input.value = `${input.value.trim()} ${chip.textContent.trim()}`.trim();
      updateUsedWords();
      input.focus();
    });
  });
  document.getElementById("clearSentenceButton").addEventListener("click", () => {
    const input = document.getElementById("answerInput");
    input.value = "";
    updateUsedWords();
    input.focus();
  });
  document.getElementById("answerInput").addEventListener("input", updateUsedWords);
  document.getElementById("answerInput").focus();
}

function showClozeQuestion() {
  const q = questions[currentIndex];
  document.getElementById("testTitle").textContent = TEST_CONFIG[testType].title;
  const hint = q.hint || createInitialHint(q.answer);

  document.getElementById("questionArea").innerHTML = `
    <div class="question-prompt cloze-prompt">${escapeHtml(q.prompt)}</div>
    <div class="answer-support"><span>入力ヒント</span>${escapeHtml(hint)}</div>
    <input type="text" id="answerInput" class="answer-input" placeholder="空欄に入る表現を入力：${escapeHtml(hint)}" autocomplete="off" />
  `;

  document.getElementById("answerInput").focus();
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

/* =========================
   解答判定
========================= */

function checkAnswer() {
  if (TEST_CONFIG[testType].type === "choice") checkChoiceAnswer();
  if (TEST_CONFIG[testType].type === "sentence") checkSentenceAnswer();
  if (TEST_CONFIG[testType].type === "cloze") checkClozeAnswer();
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
    question: q.word,
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
  const isCorrect = normalizeSentence(userAnswer) === normalizeSentence(q.answer);

  processAnswer({
    id: q.id,
    section: q.section,
    question: q.prompt,
    userAnswer,
    correctAnswer: q.answer,
    explanation: q.explanation || "",
    isCorrect,
    points: q.points || 1
  });
}

function processAnswer(data) {
  clearQuestionTimer();
  const now = new Date();
  const responseSeconds = questionStartTime ? Math.max(0, Math.round((now - questionStartTime) / 1000)) : 0;

  if (data.isCorrect) {
    score += data.points;
    document.getElementById("feedback").textContent = "✅ 正解！";
    document.getElementById("feedback").className = "correct";
  } else {
    document.getElementById("feedback").innerHTML = `${data.timedOut ? "⏰ 時間切れ。" : "❌ 不正解。"}<br>正解：${escapeHtml(data.correctAnswer)}`;
    document.getElementById("feedback").className = "wrong";
    mistakes.push(data);
  }

  if (data.explanation) {
    document.getElementById("feedback").innerHTML += `<br><span class="explanation">解説：${escapeHtml(data.explanation)}</span>`;
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
    mode: reviewMode ? "復習" : "通常",
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
    isCorrect: data.isCorrect
  };

  answersLog.push(record);
  appendLocalHistory(record);

  document.getElementById("checkButton").disabled = true;
  document.getElementById("nextButton").textContent = "次の問題へ（自動で進みます）";
  document.getElementById("nextButton").classList.remove("hidden");
  document.getElementById("progressBar").style.width = `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`;

  clearAutoAdvanceTimer();
  autoAdvanceTimerId = setTimeout(() => {
    nextQuestion();
  }, data.isCorrect ? AUTO_NEXT_DELAY_MS : AUTO_NEXT_DELAY_MS + 900);
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
  document.getElementById("motivationMessage").innerHTML = "<strong>解答データを送信しています...</strong><br>送信後に結果を表示します。";
  document.getElementById("scoreDisplay").textContent = "";
  document.getElementById("dateDisplay").textContent = "";
  document.getElementById("timeDisplay").textContent = "";
  document.getElementById("sendStatusDisplay").textContent = "スプレッドシート送信：送信中";
  document.getElementById("mistakeArea").innerHTML = "";

  const sendStatus = await sendResultsToSpreadsheet({ isQuit, endTime, answeredCount, totalSeconds, accuracy });

  document.getElementById("motivationMessage").innerHTML = getMotivationMessage(accuracy, answeredCount);
  document.getElementById("scoreDisplay").textContent = isQuit ? `途中終了：${answeredCount}問中 ${score}点` : `テスト終了：${answeredCount}問中 ${score}点`;
  document.getElementById("dateDisplay").textContent = `回答日時：${endTime.toLocaleString("ja-JP")}`;
  document.getElementById("timeDisplay").textContent = `合計解答時間：${minutes}分 ${seconds}秒`;
  document.getElementById("sendStatusDisplay").textContent = sendStatus;
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

async function sendResultsToSpreadsheet(resultInfo) {
  if (!GAS_WEB_APP_URL) return "スプレッドシート送信：未設定（現在は端末内履歴に保存）";

  const payload = {
    action: "submitQuizResult",
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
    answers: answersLog
  };

  try {
    await apiPostNoCors(payload);
    return "スプレッドシート送信：完了";
  } catch (error) {
    console.error("スプレッドシート送信エラー:", error);
    return "スプレッドシート送信：失敗";
  }
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
    msg.textContent = "提出中です...";
    await apiPostNoCors(payload);
    msg.className = "correct";
    msg.textContent = "提出が完了しました。";
  } catch (error) {
    console.error(error);
    msg.className = "error";
    msg.textContent = "提出に失敗しました。通信状況とApps Scriptを確認してください。";
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
  if (!confirm("この端末内の解答履歴をすべて削除しますか？スプレッドシートに送信済みのデータは削除されません。")) return;
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

function getWrongKey() {
  return `wrongWords_${testType}_${currentStudentId || "unknown"}`;
}

function clearStoredMistakes() {
  if (!confirm("この学習者の単語間違い履歴を削除しますか？")) return;
  localStorage.removeItem(getWrongKey());
  updateMistakeCountInSettings();
  alert("間違い履歴を削除しました。" );
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
  document.getElementById("streakDisplay").textContent = `${getStreakInfo().count}日`;
}

function updateStreak() {
  const today = getDateKey(new Date());
  const info = getStreakInfo();
  const yesterday = getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (info.lastDate === today) return;
  const count = info.lastDate === yesterday ? info.count + 1 : 1;
  localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify({ lastDate: today, count }));
}

function getStreakInfo() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.streak)) || { lastDate: "", count: 0 };
  } catch {
    return { lastDate: "", count: 0 };
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
  questions = [];
  document.getElementById("feedback").textContent = "";
  document.getElementById("questionArea").innerHTML = "";
}

function showOnly(id) {
  [
    "loginScreen", "studentScreen", "menuScreen", "adminAccessScreen", "materialPasswordScreen", "calendarScreen",
    "settingScreen", "writingScreen", "quizScreen", "resultScreen", "historyScreen"
  ].forEach(screen => {
    const element = document.getElementById(screen);
    if (element) element.classList.add("hidden");
  });

  const target = document.getElementById(id);
  if (target) target.classList.remove("hidden");
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
