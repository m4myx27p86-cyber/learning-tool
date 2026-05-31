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

