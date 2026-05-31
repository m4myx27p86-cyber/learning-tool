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
