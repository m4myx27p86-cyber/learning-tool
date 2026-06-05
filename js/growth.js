/* =========================
   ホーム画面：知識の根
========================= */

function getCurrentStudentHistory() {
  return getLocalHistory().filter(item => item.studentId === currentStudentId);
}

function getGrowthStage(correctCount) {
  if (correctCount >= 500) return 5;
  if (correctCount >= 250) return 4;
  if (correctCount >= 100) return 3;
  if (correctCount >= 30) return 2;
  if (correctCount >= 1) return 1;
  return 0;
}

function getZodiacInfo(date = new Date()) {
  const zodiacs = [
    { key: "子", name: "ねずみ", icon: "🐭", trait: "すばやく確認" },
    { key: "丑", name: "うし", icon: "🐮", trait: "ゆっくり確実" },
    { key: "寅", name: "とら", icon: "🐯", trait: "挑戦する力" },
    { key: "卯", name: "うさぎ", icon: "🐰", trait: "テンポよく進む" },
    { key: "辰", name: "たつ", icon: "🐲", trait: "大きく伸びる" },
    { key: "巳", name: "へび", icon: "🐍", trait: "細部を見る" },
    { key: "午", name: "うま", icon: "🐴", trait: "走り切る集中" },
    { key: "未", name: "ひつじ", icon: "🐏", trait: "やさしく継続" },
    { key: "申", name: "さる", icon: "🐵", trait: "工夫して覚える" },
    { key: "酉", name: "とり", icon: "🐤", trait: "声に出す練習" },
    { key: "戌", name: "いぬ", icon: "🐶", trait: "復習を守る" },
    { key: "亥", name: "いのしし", icon: "🐗", trait: "一気に突破" }
  ];
  const dayNumber = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86400000);
  return zodiacs[((dayNumber % zodiacs.length) + zodiacs.length) % zodiacs.length];
}

function getDailyZodiacLevelInfo(todayCorrectCount) {
  const count = Math.max(0, Number(todayCorrectCount || 0));
  const thresholds = [0, 3, 10, 20, 30];
  let level = 1;

  for (let i = 1; i < thresholds.length; i++) {
    if (count >= thresholds[i]) level = i + 1;
  }

  const currentBase = thresholds[level - 1] || 0;
  const nextTarget = thresholds[level] || null;
  const remaining = nextTarget ? Math.max(0, nextTarget - count) : 0;
  const progress = nextTarget
    ? Math.min(100, Math.max(count > 0 ? 8 : 0, Math.round(((count - currentBase) / Math.max(1, nextTarget - currentBase)) * 100)))
    : 100;

  return {
    level,
    nextTarget,
    remaining,
    progress,
    isMaxLevel: !nextTarget
  };
}

function getDailyZodiacLevel(todayCorrectCount) {
  return getDailyZodiacLevelInfo(todayCorrectCount).level;
}

function getTreeLevelInfo(correctCount) {
  const count = Math.max(0, Number(correctCount || 0));
  const thresholds = [0, 5, 15, 30, 60, 100, 160, 250, 380, 550, 750, 1000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (count >= thresholds[i]) level = i + 1;
  }
  const currentBase = thresholds[level - 1] || 0;
  const nextTarget = thresholds[level] || null;
  const remaining = nextTarget ? Math.max(0, nextTarget - count) : 0;
  const progress = nextTarget
    ? Math.min(100, Math.max(count > 0 ? 6 : 0, Math.round(((count - currentBase) / Math.max(1, nextTarget - currentBase)) * 100)))
    : 100;
  return {
    level,
    maxLevel: thresholds.length,
    nextTarget,
    remaining,
    progress,
    isMaxLevel: !nextTarget,
    maxTarget: thresholds[thresholds.length - 1]
  };
}

function getTreeLevel(correctCount) {
  return getTreeLevelInfo(correctCount).level;
}

function renderGrowthHome() {
  const area = document.getElementById("growthHomeArea");
  if (!area || !currentStudentId) return;
  const featureIsOn = typeof isFeatureEnabled === "function" ? isFeatureEnabled : () => true;
  const showTree = featureIsOn("learningTree");
  const showZodiac = featureIsOn("zodiac");
  if (!showTree && !showZodiac) {
    area.innerHTML = "";
    area.classList.add("hidden");
    return;
  }
  area.classList.remove("hidden");

  const history = getCurrentStudentHistory();
  const todayKey = getDateKey(new Date());
  const todayHistory = history.filter(item => item.dateKey === todayKey);
  const todayCorrect = todayHistory.filter(item => item.correct).length;
  const correctCount = history.filter(item => item.correct).length;
  const total = history.length;
  const accuracy = total ? Math.round((correctCount / total) * 100) : 0;
  const days = new Set(history.map(item => item.dateKey).filter(Boolean)).size;
  const stage = getGrowthStage(correctCount);
  const treeLevelInfo = getTreeLevelInfo(correctCount);
  const treeLevel = treeLevelInfo.level;
  const remaining = treeLevelInfo.remaining;
  const rootPercent = treeLevelInfo.progress;
  const zodiac = getZodiacInfo();
  const zodiacLevelInfo = getDailyZodiacLevelInfo(todayCorrect);
  const zodiacLevel = zodiacLevelInfo.level;
  const zodiacNextText = zodiacLevelInfo.isMaxLevel
    ? "本日の最高Lv.達成"
    : `次のLv.まであと ${zodiacLevelInfo.remaining}問`;
  const streakInfo = getProtectedStreakInfo();
  const bonusProgress = Math.min(6, Math.max(0, Number(streakInfo.count || 0) % 6 || (streakInfo.count >= 6 ? 6 : streakInfo.count)));
  const revivalTickets = getRevivalTicketCount();
  const expBoosts = Math.floor(correctCount / 100);
  const hintTickets = Math.floor(total / 30);
  const characterMood = todayCorrect >= 10 ? "great" : todayCorrect >= 3 ? "happy" : "calm";
  const titleText = showTree && showZodiac ? "通算の木と本日の十二支" : showTree ? "通算の木" : "本日の十二支";
  const bodyText = showTree && showZodiac
    ? "通算では木が育ち、日替わりでは十二支キャラが育ちます。継続・復習・正解の積み重ねを、画面上で見える化します。"
    : showTree
      ? "通算の正解数に合わせて、学習の木が育ちます。"
      : "今日の正解数に合わせて、日替わり十二支キャラが育ちます。";
  const badgeText = showTree ? `木 Lv.${treeLevel} / Max ${treeLevelInfo.maxLevel}` : `${zodiac.key} Lv.${zodiacLevel}`;

  const treePanel = showTree ? `
      <article class="growth-tree-panel">
        <div class="panel-label">通算</div>
        <div class="plant-visual plant-stage-${stage}" style="--root-progress:${rootPercent}%;" aria-label="通算学習の木">
          <div class="plant-sky">
            <div class="plant-stem"></div>
            <div class="plant-leaf leaf-left"></div>
            <div class="plant-leaf leaf-right"></div>
            <div class="plant-bloom"></div>
          </div>
          <div class="plant-soil">
            <span class="root root-a"></span>
            <span class="root root-b"></span>
            <span class="root root-c"></span>
          </div>
        </div>
        <p class="growth-next">${treeLevelInfo.isMaxLevel ? `最大レベル達成：${treeLevelInfo.maxTarget}正解到達` : `次の成長まであと <strong>${remaining}</strong> 正解`}</p>
      </article>` : "";

  const zodiacPanel = showZodiac ? `
      <article class="daily-zodiac-panel zodiac-${characterMood}">
        <div class="panel-label">日替わり十二支</div>
        <div class="zodiac-character" aria-hidden="true">
          <span class="zodiac-face">${zodiac.icon}</span>
          <span class="zodiac-spark">✦</span>
        </div>
        <h4>${zodiac.key}：${zodiac.name} Lv.${zodiacLevel}</h4>
        <p>${escapeHtml(zodiac.trait)}の日です。今日の正解数で、表情とレベルが変わります。</p>
        <div class="zodiac-level-meta">
          <span>今日の正解 ${todayCorrect}問</span>
          <strong>${escapeHtml(zodiacNextText)}</strong>
        </div>
        <div class="zodiac-exp" aria-label="十二支の次レベルまでの進捗"><i style="width:${zodiacLevelInfo.progress}%"></i></div>
        <small>${zodiacLevelInfo.isMaxLevel ? "明日また新しい十二支を育てましょう。" : `Lv.${zodiacLevel + 1} 目標：${zodiacLevelInfo.nextTarget}問`}</small>
      </article>` : "";

  area.innerHTML = `
    <div class="growth-dashboard-head">
      <div>
        <span class="panel-label">Learning Growth</span>
        <h3>${titleText}</h3>
        <p>${bodyText}</p>
      </div>
      <div class="growth-level-badge">${badgeText}</div>
    </div>

    <div class="growth-dashboard-grid ${showTree && showZodiac ? "" : "single-growth-panel"}">
      ${treePanel}
      ${zodiacPanel}
    </div>

    <div class="growth-stats quest-growth-stats">
      <span><strong>${correctCount}</strong>正解</span>
      <span><strong>${accuracy || "-"}</strong>${accuracy ? "%" : ""}正答率</span>
      <span><strong>${days}</strong>学習日</span>
      <span><strong>${streakInfo.count || 0}</strong>連続日数</span>
    </div>

    <div class="quest-reward-row">
      <section class="login-bonus-card ${streakInfo.protected ? "protected" : ""}">
        <div>
          <span class="panel-label">Login Bonus</span>
          <strong>${bonusProgress}/6日</strong>
          <p>${streakInfo.protected ? "復活チケットで連続記録を守れます。" : "6日連続で問題を解くと、復活チケットを1枚獲得します。"}</p>
        </div>
        <div class="bonus-dots">${Array.from({ length: 6 }, (_, i) => `<i class="${i < bonusProgress ? "active" : ""}"></i>`).join("")}</div>
      </section>

      <section class="item-card">
        <span class="panel-label">Items</span>
        <div class="item-list">
          <span>🎟️ 復活チケット × ${revivalTickets}</span>
          <span>✨ 経験値2倍 × ${expBoosts}</span>
          <span>💡 ヒントチケット × ${hintTickets}</span>
        </div>
      </section>
    </div>`;
}

function renderHomeLearningCalendar() {
  const area = document.getElementById("learningCalendarHomeArea");
  if (!area || !currentStudentId) return;
  const history = getCurrentStudentHistory();
  const byDate = new Map();
  history.forEach(item => {
    const key = item.dateKey || getDateKey(item.date || new Date());
    if (!byDate.has(key)) byDate.set(key, { total: 0, correct: 0 });
    const entry = byDate.get(key);
    entry.total += 1;
    if (item.correct) entry.correct += 1;
  });
  const days = [];
  const today = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const entry = byDate.get(key) || { total: 0, correct: 0 };
    days.push({ key, day: d.getDate(), weekday: "日月火水木金土"[d.getDay()], ...entry });
  }
  const streak = calculateHistoryStreak(byDate);
  const activeDays = days.filter(day => day.total > 0).length;
  area.innerHTML = `
    <div class="calendar-copy">
      <span class="panel-label">Learning Calendar</span>
      <h3>${streak}日連続で学習中</h3>
      <p>連続して学習できた日をカレンダーで見える化します。1問だけでも記録が残れば、学習の根は切れません。</p>
    </div>
    <div class="mini-calendar-grid" aria-label="直近21日の学習状況">
      ${days.map(day => `<div class="mini-day ${day.total ? "active" : ""} ${day.correct >= 5 ? "strong" : ""}" title="${day.key}: ${day.total}問">
        <span>${day.weekday}</span><strong>${day.day}</strong><small>${day.total ? `${day.total}問` : ""}</small>
      </div>`).join("")}
    </div>
    <div class="calendar-motivation"><strong>${activeDays}</strong> / 21日 学習済み　<span>今日も1問で継続達成です。</span></div>`;
}

function calculateHistoryStreak(byDate) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const entry = byDate.get(key);
    if (entry && entry.total > 0) streak += 1;
    else if (i === 0) continue;
    else break;
  }
  return streak;
}

function renderReviewPlant(mastered, needReview, unlearned, plantId = "localReviewPlant", messageId = "localReviewPlantMessage") {
  const stage = getGrowthStage(mastered);
  const plant = document.getElementById(plantId);
  if (plant) {
    plant.className = `plant-visual plant-stage-${stage}`;
    plant.style.setProperty("--root-progress", `${Math.min(100, mastered)}%`);
  }
  const message = mastered === 0
    ? "最初の正解が、根を伸ばすスタートになります。"
    : needReview > mastered
      ? "要復習が多い教材です。根を整える復習から始めましょう。"
      : `この教材では ${mastered} 問分の知識が根づいています。`;
  setText(messageId, message);
}

