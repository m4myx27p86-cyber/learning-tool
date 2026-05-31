/* =========================
   音声設定・ゲーム型ホーム
========================= */

function initSoundToggle() {
  if (localStorage.getItem(STORAGE_KEYS.soundEnabled) === null) {
    localStorage.setItem(STORAGE_KEYS.soundEnabled, "true");
  }
  updateSoundToggleUI();
}

function isSoundEnabled() {
  return localStorage.getItem(STORAGE_KEYS.soundEnabled) !== "false";
}

function toggleSoundSetting() {
  localStorage.setItem(STORAGE_KEYS.soundEnabled, String(!isSoundEnabled()));
  updateSoundToggleUI();
}

function updateSoundToggleUI() {
  const button = document.getElementById("soundToggleButton");
  if (!button) return;
  const enabled = isSoundEnabled();
  button.textContent = enabled ? "音声：ON" : "音声：OFF";
  button.setAttribute("aria-pressed", String(enabled));
  button.classList.toggle("sound-off", !enabled);
}

function renderGameHomeHero() {
  const area = document.getElementById("gameHomeHero");
  if (!area || !currentStudentId) return;
  const history = getCurrentStudentHistory();
  const todayKey = getDateKey(new Date());
  const today = history.filter(item => item.dateKey === todayKey);
  const correct = history.filter(item => item.correct).length;
  const total = history.length;
  const level = Math.max(1, Math.floor(correct / 25) + 1);
  const nextNeed = 25 - (correct % 25 || 25);
  const rank = level >= 8 ? "Master Learner" : level >= 4 ? "Quest Learner" : "New Adventurer";
  const xpPercent = Math.min(100, (correct % 25) * 4);

  area.innerHTML = `
    <div class="game-hero-copy">
      <span class="panel-label">AI Learning Tool</span>
      <h3>今日のLearning Quest</h3>
      <p>このホームは、ゲームのような達成感を足しながら、点数だけでなく「使える知識」「復習」「継続」を見える化するためのオリジナル設計です。</p>
      <div class="hero-action-row">
        <button id="heroMaterialButton" type="button">教材へ</button>
        <span class="hero-rank">Lv.${level} / ${escapeHtml(rank)}</span>
      </div>
    </div>
    <div class="quest-status-card">
      <span>Today</span>
      <strong>${today.length}問</strong>
      <small>次のレベルまで ${nextNeed} 正解</small>
      <div class="quest-xp"><i style="width:${xpPercent}%"></i></div>
      <p>${total ? `累計 ${total}問・正解 ${correct}問` : "まずは1問から始められます。"}</p>
    </div>`;

  document.getElementById("heroMaterialButton")?.addEventListener("click", () => {
    document.getElementById("materialShelf")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

