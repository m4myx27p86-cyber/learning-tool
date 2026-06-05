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
