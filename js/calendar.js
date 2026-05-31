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

