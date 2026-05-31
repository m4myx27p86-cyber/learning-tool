/* =========================
   設定画面
========================= */

async function openSettings(type) {
  testType = type;
  reviewMode = false;
  const config = TEST_CONFIG[type];
  applyThemeForMaterial(type);

  if (config.type === "writing") {
    openWriting(type);
    return;
  }

  showOnly("settingScreen");
  document.getElementById("settingTitle").textContent = config.title;
  document.getElementById("settingDescription").textContent = config.description || "";
  document.getElementById("vocabReviewArea").classList.toggle("hidden", !config.review);
  document.getElementById("timeLimitSelect").value = String(config.defaultTime || 0);
  toggleCustomQuestionInput();

  const sourceQuestions = await ensureQuestionsLoaded(type);
  setupSectionSelect(sourceQuestions);
  updateMistakeCountInSettings();
  settingReviewListVisible = false;
  const listPanel = document.getElementById("settingReviewListPanel");
  if (listPanel) listPanel.classList.add("hidden");
  await renderSettingProgressDashboard(type);
}

async function ensureQuestionsLoaded(type) {
  if (loadedQuestions[type]) return loadedQuestions[type];

  const config = TEST_CONFIG[type];
  if (type === "polaris3") {
    loadedQuestions[type] = await loadPolaris3Questions(config);
  } else if (config.type === "sentence") {
    loadedQuestions[type] = await loadSentenceQuestions(config.files);
  } else if (config.type === "cloze") {
    loadedQuestions[type] = await loadClozeQuestions(config.path);
  } else if (config.type === "errorCorrection") {
    loadedQuestions[type] = await loadErrorCorrectionQuestions(config.path);
  } else if (config.type === "writing") {
    loadedQuestions[type] = await loadWritingTasks(config.path);
  } else if (Array.isArray(config.files) && config.files.length) {
    loadedQuestions[type] = await loadChoiceQuestionsFromFiles(config.files);
  } else {
    loadedQuestions[type] = await loadChoiceQuestions(config.path);
  }

  return loadedQuestions[type];
}

function setupSectionSelect(sourceQuestions) {
  const select = document.getElementById("sectionSelect");
  const sections = [...new Set(sourceQuestions.map(q => q.section))]
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), "ja", { numeric: true }));

  select.innerHTML = `<option value="all">すべてのセクション</option>`;
  sections.forEach(section => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = isNaN(Number(section)) ? section : `Section ${section}`;
    select.appendChild(option);
  });
}

function toggleCustomQuestionInput() {
  const select = document.getElementById("questionCountSelect");
  const input = document.getElementById("customQuestionCountInput");
  if (!select || !input) return;
  input.classList.toggle("hidden", select.value !== "custom");
}


function getConfiguredPracticeCount(total) {
  const select = document.getElementById("questionCountSelect");
  if (!select || select.value === "all") return total;
  if (select.value === "custom") {
    const input = document.getElementById("customQuestionCountInput");
    const customCount = Number(input?.value);
    return customCount && customCount > 0 ? Math.min(customCount, total) : Math.min(10, total);
  }
  const selected = Number(select.value);
  return selected > 0 ? Math.min(selected, total) : total;
}

function getSelectedSectionValue() {
  return document.getElementById("sectionSelect")?.value || "all";
}

function filterQuestionsBySelectedSection(sourceQuestions) {
  const selectedSection = getSelectedSectionValue();
  return selectedSection === "all"
    ? [...sourceQuestions]
    : sourceQuestions.filter(q => String(q.section) === String(selectedSection));
}

function filterStatusesBySelectedSection(statuses) {
  const selectedSection = getSelectedSectionValue();
  return selectedSection === "all"
    ? [...statuses]
    : statuses.filter(item => String(item.question.section) === String(selectedSection));
}

function orderQuestionsForMode(type, pool) {
  return TEST_CONFIG[type]?.keepOrder ? [...pool] : shuffle(pool);
}

