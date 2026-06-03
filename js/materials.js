/* =========================
   教材選択・カテゴリ表示
========================= */

function renderMenu() {
  refreshDashboard();
  renderGameHomeHero();
  renderGrowthHome();
  renderHomeLearningCalendar();
  renderMaterialCategories();
  renderSyncNotice("checking");
  checkAppsScriptIntegration();
  updateSoundToggleUI();
  document.getElementById("adminQuickArea").classList.toggle("hidden", !isAdmin);
}

function getVisibleMaterials() {
  return Object.keys(TEST_CONFIG).filter(type => hasAccessToMaterial(type));
}

function hasAccessToMaterial(type) {
  if (isAdmin) return true;
  if (Array.isArray(allowedMaterials)) return allowedMaterials.includes(type);
  return true; // 従来方式の場合は、教材パスワードで制御
}

function renderMaterialCategories() {
  const area = document.getElementById("materialCategoryArea");
  const visible = getVisibleMaterials();
  const categoryOrder = ["toeic", "toefl", "highschool", "eiken", "classics", "teacher"];

  area.innerHTML = categoryOrder.map((categoryKey, index) => {
    const info = CATEGORY_INFO[categoryKey];
    const materials = visible.filter(type => TEST_CONFIG[type].category === categoryKey);
    let cards = materials.length
      ? materials.map(type => materialCardHtml(type)).join("")
      : `<div class="empty-category">現在利用できる教材はありません。</div>`;

    if (categoryKey === "toeic" && (isAdmin || !Array.isArray(allowedMaterials) || materials.length > 0)) {
      cards += `
        <div class="material-card-wrap utility-card-wrap">
          <button class="material-card accent-card" data-action="calendar">
            <span>計画</span>
            <strong>TOEIC S&amp;W 学習カレンダー</strong>
            <small>毎日の学習チェックを端末内に保存します。</small>
          </button>
        </div>
      `;
    }

    const openAttr = index === 0 || (materials.length && categoryKey === "highschool") ? "open" : "";
    return `
      <details class="category-section category-${info.theme}" ${openAttr}>
        <summary class="category-head">
          <div>
            <span class="category-title"><b class="category-icon">${escapeHtml(info.icon || "✨")}</b>${escapeHtml(info.label)}</span>
            <p>${escapeHtml(info.description)}</p>
          </div>
          <small class="category-tip">${materials.length}教材</small>
          <span class="accordion-marker" aria-hidden="true"></span>
        </summary>
        <div class="material-grid">${cards}</div>
      </details>
    `;
  }).join("");

  document.querySelectorAll(".material-card[data-material]").forEach(button => {
    button.addEventListener("click", () => openMaterial(button.dataset.material));
  });

  document.querySelectorAll(".material-progress-button[data-review-material]").forEach(button => {
    button.addEventListener("click", () => openSettings(button.dataset.reviewMaterial));
  });

  document.querySelectorAll("[data-action='calendar']").forEach(button => button.addEventListener("click", openCalendar));
  document.querySelectorAll("[data-action='history']").forEach(button => button.addEventListener("click", openHistoryScreen));
}


function getMaterialCharacterFile(type) {
  if (["speakingReview", "speakingReviewCloze", "phrasalVerbs"].includes(type)) return "tree.svg";
  if (["speakingErrorCorrection", "monitor", "eikenConnectors"].includes(type)) return "zodiac-寅.svg";
  if (["vocab", "sokudokuVocab", "target1900Vocab", "polaris3"].includes(type)) return "tree.svg";
  if (["sentence", "writingTheoryChapter4", "writingTheoryMap"].includes(type)) return "zodiac-卯.svg";
  if (["englishTheory", "statisticsQuestions", "presentationBuilderTasks"].includes(type)) return "zodiac-申.svg";
  if (String(type || "").startsWith("classical")) return "zodiac-辰.svg";
  return "tree.svg";
}

function materialCardHtml(type) {
  const config = TEST_CONFIG[type];
  const categoryLabel = CATEGORY_INFO[config.category]?.label || config.category;
  const history = getLocalHistory().filter(item => item.studentId === currentStudentId && item.testType === type);
  const correct = history.filter(item => item.correct).length;
  const total = history.length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const level = Math.max(1, Math.floor(correct / 20) + 1);
  const progress = Math.min(100, (correct % 20) * 5);
  const progressLabel = total ? `${accuracy}% / ${total}問` : "未学習";
  const characterFile = getMaterialCharacterFile(type);
  return `
    <div class="material-card-wrap">
      <button class="material-card" data-material="${escapeHtml(type)}">
        <div class="material-card-main">
          <div>
            <span class="material-tag">${escapeHtml(categoryLabel)}</span>
            <strong class="material-title">${escapeHtml(config.title)}</strong>
            <small>${escapeHtml(config.description || "")}</small>
            <div class="material-card-progress" aria-label="教材進捗">
              <b>Lv.${level}</b><i><u style="width:${progress}%"></u></i><em>${escapeHtml(progressLabel)}</em>
            </div>
          </div>
          <img class="material-card-character" src="assets/characters/${escapeHtml(characterFile)}" alt="" loading="lazy" aria-hidden="true">
          <span class="material-card-arrow" aria-hidden="true">›</span>
        </div>
      </button>
    </div>
  `;
}

function isReviewDashboardSupported(type) {
  return Boolean(TEST_CONFIG[type] && TEST_CONFIG[type].type !== "writing");
}

function openMaterial(type, fromDirectLogin = false) {
  if (!currentStudentId) {
    showOnly("loginScreen");
    return;
  }

  if (!TEST_CONFIG[type]) {
    alert("教材設定が見つかりません。設定を確認してください。" + type);
    renderMenu();
    showOnly("menuScreen");
    return;
  }

  if (!hasAccessToMaterial(type)) {
    alert("この学習者コードでは、この教材は利用できません。管理者に確認してください。" );
    renderMenu();
    showOnly("menuScreen");
    return;
  }

  pendingMaterialType = type;

  // 管理者・学習者コード方式は教材パスワードを省略
  if (isAdmin || currentAccessCode) {
    openSettings(type);
    return;
  }

  // 従来方式だけ教材パスワードを使う
  const config = TEST_CONFIG[type];
  document.getElementById("materialPasswordTitle").textContent = `${config.title} のパスワード`;
  document.getElementById("materialPasswordInput").value = "";
  document.getElementById("materialPasswordMessage").textContent = "";
  showOnly("materialPasswordScreen");
}

function checkMaterialPassword() {
  const input = document.getElementById("materialPasswordInput").value.trim();
  const config = TEST_CONFIG[pendingMaterialType];
  if (!config) return;

  if (input === config.password || isAdmin) {
    document.getElementById("materialPasswordMessage").textContent = "";
    openSettings(pendingMaterialType);
  } else {
    document.getElementById("materialPasswordMessage").textContent = "教材パスワードが違います。";
  }
}

function applyThemeForMaterial(type) {
  const category = TEST_CONFIG[type]?.category || "highschool";
  document.body.classList.remove("theme-toeic", "theme-toefl", "theme-highschool", "theme-classics", "theme-eiken", "theme-teacher");

  // 教材ごとの見た目だけを切り替えるためのクラスです。
  // 問題データ・採点・二度押し回答・送信処理には触れません。
  [...document.body.classList]
    .filter(className => className.startsWith("material-"))
    .forEach(className => document.body.classList.remove(className));

  const materialClass = `material-${String(type || "").replace(/[^a-z0-9_-]/gi, "-").toLowerCase()}`;
  document.body.classList.add(`theme-${CATEGORY_INFO[category]?.theme || category}`);
  if (type) document.body.classList.add(materialClass);
  if (type) document.body.dataset.currentMaterial = type;
}

