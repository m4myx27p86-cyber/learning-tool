/* =========================
   Consecutive login days
========================= */

function getLoginStreakKey() {
  return `learningTool_loginStreak_${currentStudentId || "unknown"}`;
}

function getLoginDayKey(date = new Date()) {
  return getDateKey(date);
}

function getLoginStreakInfo() {
  try {
    const fallback = { lastDate: "", count: 0, days: [] };
    const info = JSON.parse(localStorage.getItem(getLoginStreakKey())) || fallback;
    return {
      lastDate: info.lastDate || "",
      count: Math.max(0, Number(info.count) || 0),
      days: Array.isArray(info.days) ? info.days.filter(Boolean) : []
    };
  } catch {
    return { lastDate: "", count: 0, days: [] };
  }
}

function saveLoginStreakInfo(info) {
  const uniqueDays = [...new Set(info.days || [])].sort();
  localStorage.setItem(getLoginStreakKey(), JSON.stringify({
    lastDate: info.lastDate || "",
    count: Math.max(0, Number(info.count) || 0),
    days: uniqueDays.slice(-120)
  }));
}

function updateLoginStreak() {
  const today = getLoginDayKey();
  const yesterday = getLoginDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const info = getLoginStreakInfo();
  const days = [...new Set([...(info.days || []), today])].sort();

  if (info.lastDate === today) {
    saveLoginStreakInfo({ ...info, days });
    return getLoginStreakInfo();
  }

  const count = info.lastDate === yesterday ? info.count + 1 : 1;
  saveLoginStreakInfo({ lastDate: today, count, days });
  return getLoginStreakInfo();
}

function openCalendar() {
  updateLoginStreak();
  showOnly("calendarScreen");
  renderCalendar();
}

function renderCalendar() {
  const area = document.getElementById("calendarArea");
  if (!area) return;

  const info = updateLoginStreak();
  const daysSet = new Set(info.days || []);
  const learningStreak = typeof getProtectedStreakInfo === "function" ? getProtectedStreakInfo() : { count: 0, tickets: 0 };
  const recentDays = [];
  const today = new Date();

  for (let i = 20; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = getLoginDayKey(date);
    recentDays.push({
      key,
      day: date.getDate(),
      loggedIn: daysSet.has(key)
    });
  }

  const loggedInRecent = recentDays.filter(day => day.loggedIn).length;
  area.innerHTML = `
    <section class="login-streak-hero">
      <span class="panel-label">Login Streak</span>
      <h3>${info.count} days in a row</h3>
      <p>Open the app once a day to keep your login streak alive.</p>
      <div class="login-streak-stats">
        <article><strong>${loggedInRecent}</strong><span>login days / 21</span></article>
        <article><strong>${learningStreak.count || 0}</strong><span>learning streak</span></article>
        <article><strong>${learningStreak.tickets || 0}</strong><span>revival tickets</span></article>
      </div>
    </section>
    <section class="login-streak-grid" aria-label="Recent login days">
      ${recentDays.map(day => `
        <div class="login-streak-day ${day.loggedIn ? "active" : ""}" title="${escapeHtml(day.key)}">
          <span>${escapeHtml(day.key.slice(5))}</span>
          <strong>${day.day}</strong>
        </div>
      `).join("")}
    </section>
    <p class="calendar-comment">Today is already counted when this screen opens. Quiz completion still controls the learning streak and review progress.</p>
  `;
}

function resetCalendarChecks() {
  if (!confirm("Reset this learner's login streak display?")) return;
  localStorage.removeItem(getLoginStreakKey());
  updateLoginStreak();
  renderCalendar();
}
