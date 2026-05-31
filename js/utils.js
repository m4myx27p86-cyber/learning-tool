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
