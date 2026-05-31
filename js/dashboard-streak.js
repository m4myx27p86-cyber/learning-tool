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

