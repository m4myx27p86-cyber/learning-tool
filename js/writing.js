/* =========================
   Writing提出
========================= */

async function openWriting(type) {
  testType = type;
  const config = TEST_CONFIG[type];
  applyThemeForMaterial(type);
  showOnly("writingScreen");
  document.getElementById("writingTitle").textContent = config.title;
  document.getElementById("writingDescription").textContent = config.description || "";
  document.getElementById("writingText").value = "";
  document.getElementById("writingSubmitMessage").textContent = "";
  updateWritingWordCount();
  writingStartTime = new Date();

  writingTasks = await ensureQuestionsLoaded(type);
  const select = document.getElementById("writingTaskSelect");
  select.innerHTML = writingTasks.map(task => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.section)}：${escapeHtml(task.id)}</option>`).join("");
  renderSelectedWritingTask();
}

function renderSelectedWritingTask() {
  const id = document.getElementById("writingTaskSelect")?.value;
  const task = writingTasks.find(t => t.id === id) || writingTasks[0];
  const area = document.getElementById("writingPrompt");
  if (!task) {
    area.innerHTML = "<p class='error'>Writing課題がありません。</p>";
    return;
  }
  area.innerHTML = `
    <h3>課題 ${escapeHtml(task.id)}</h3>
    <p>${escapeHtml(task.prompt)}</p>
    <p class="muted">目安語数：${escapeHtml(task.targetWords)} words</p>
    ${task.memo ? `<p class="muted">${escapeHtml(task.memo)}</p>` : ""}
  `;
}

function updateWritingWordCount() {
  const text = document.getElementById("writingText")?.value || "";
  document.getElementById("writingWordCount").textContent = countEnglishWords(text);
}

async function submitWriting() {
  const msg = document.getElementById("writingSubmitMessage");
  const text = document.getElementById("writingText").value.trim();
  const taskId = document.getElementById("writingTaskSelect").value;
  const task = writingTasks.find(t => t.id === taskId);

  if (!text) {
    msg.className = "error";
    msg.textContent = "Writing本文を入力してください。";
    return;
  }

  const timeSpent = writingStartTime ? Math.round((new Date() - writingStartTime) / 1000) : 0;
  const payload = {
    action: "submitWriting",
    date: new Date().toLocaleString("ja-JP"),
    dateKey: getDateKey(new Date()),
    accessCode: currentAccessCode,
    studentId: currentStudentId,
    studentName: currentStudentName,
    material: TEST_CONFIG[testType].title,
    taskId,
    prompt: task?.prompt || "",
    writingText: text,
    wordCount: countEnglishWords(text),
    timeSpent
  };

  try {
    msg.className = "muted";
    msg.textContent = "端末内に保存しています...";
    appendLocalWriting(payload);
    if (!USE_LOCAL_ONLY) await apiPostNoCors(payload);
    msg.className = "correct";
    msg.textContent = "端末内への保存が完了しました。";
  } catch (error) {
    console.error(error);
    msg.className = "error";
    msg.textContent = "保存に失敗しました。ブラウザの保存容量や設定を確認してください。";
  }
}

