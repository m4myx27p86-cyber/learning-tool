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

