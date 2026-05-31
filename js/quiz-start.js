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
