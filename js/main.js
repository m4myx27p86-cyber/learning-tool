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

