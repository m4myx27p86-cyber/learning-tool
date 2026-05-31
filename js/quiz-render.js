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

