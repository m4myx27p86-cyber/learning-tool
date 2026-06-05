/* =========================
   ログイン
========================= */

function getTodayPassword() {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, "0") + String(now.getDate()).padStart(2, "0");
}

async function checkLogin() {
  const input = document.getElementById("passwordInput").value.trim();
  const message = document.getElementById("loginMessage");
  if (message) message.textContent = "";

  if (!input) {
    if (message) message.textContent = "パスワードまたは学習者コードを入力してください。";
    return;
  }

  if (input === ADMIN_PASSWORD) {
    loginAsAdmin();
    return;
  }

  // 従来方式：当日4桁 → 学習者番号入力画面
  if (input === getTodayPassword()) {
    currentStudentId = "";
    currentStudentName = "";
    currentAccessCode = "";
    allowedMaterials = null;
    setFeatureFlags(DEFAULT_FEATURE_FLAGS);
    isAdmin = false;
    if (message) message.textContent = "";
    showOnly("studentScreen");
    return;
  }

  // 新方式：管理者が発行した学習者コードを照合
  try {
    if (message) message.textContent = "学習者コードを確認しています...";
    const result = await apiGetJsonp("validateAccessCode", { code: input });
    if (!result || !result.valid) {
      if (message) message.textContent = result?.error || "この学習者コードは使えません。";
      return;
    }
    loginWithAccessCode(result);
  } catch (error) {
    console.error(error);
    if (message) message.textContent = "学習者コードの確認に失敗しました。Apps Scriptのデプロイを確認してください。";
  }
}

function loginAsAdmin() {
  currentStudentId = ADMIN_PASSWORD;
  currentStudentName = "管理者";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = true;
  setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  saveSession();
  document.getElementById("loginMessage").textContent = "";
  renderMenu();
  showOnly("menuScreen");
}

function loginWithAccessCode(result) {
  currentStudentId = result.studentId || "";
  currentStudentName = result.studentName || "";
  currentAccessCode = result.code || "";
  allowedMaterials = Array.isArray(result.allowedMaterials) ? result.allowedMaterials : [];
  isAdmin = false;
  setFeatureFlags(result.featureFlags || result);
  saveSession();

  if (allowedMaterials.length === 1) {
    openMaterial(allowedMaterials[0], true);
    return;
  }

  renderMenu();
  showOnly("menuScreen");
}

function checkStudentLogin() {
  const input = document.getElementById("studentLoginInput").value.trim();
  const message = document.getElementById("studentLoginMessage");

  if (!/^\d{4}$/.test(input)) {
    if (message) message.textContent = "4桁の数字を入力してください。";
    return;
  }

  if (input === ADMIN_PASSWORD) {
    loginAsAdmin();
    return;
  }

  currentStudentId = input;
  currentStudentName = "";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = false;
  setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  saveSession();
  if (message) message.textContent = "";
  renderMenu();
  showOnly("menuScreen");
}

function saveSession() {
  localStorage.setItem(STORAGE_KEYS.sessionStudent, currentStudentId);
  localStorage.setItem(STORAGE_KEYS.sessionName, currentStudentName || "");
  localStorage.setItem(STORAGE_KEYS.sessionAccessCode, currentAccessCode || "");
  localStorage.setItem(STORAGE_KEYS.allowedMaterials, JSON.stringify(allowedMaterials));
  localStorage.setItem(STORAGE_KEYS.featureFlags, JSON.stringify(normalizeFeatureFlags(featureFlags)));
}

function restoreSession() {
  const student = localStorage.getItem(STORAGE_KEYS.sessionStudent);
  if (!student) return;
  currentStudentId = student;
  currentStudentName = localStorage.getItem(STORAGE_KEYS.sessionName) || "";
  currentAccessCode = localStorage.getItem(STORAGE_KEYS.sessionAccessCode) || "";
  try { allowedMaterials = JSON.parse(localStorage.getItem(STORAGE_KEYS.allowedMaterials)); } catch { allowedMaterials = null; }
  try { featureFlags = normalizeFeatureFlags(JSON.parse(localStorage.getItem(STORAGE_KEYS.featureFlags) || "{}")); } catch { featureFlags = { ...DEFAULT_FEATURE_FLAGS }; }
  isAdmin = currentStudentId === ADMIN_PASSWORD;
  applyFeatureVisibilityFlags();
}

function logout() {
  currentStudentId = "";
  currentStudentName = "";
  currentAccessCode = "";
  allowedMaterials = null;
  isAdmin = false;
  setFeatureFlags(DEFAULT_FEATURE_FLAGS);
  localStorage.removeItem(STORAGE_KEYS.sessionStudent);
  localStorage.removeItem(STORAGE_KEYS.sessionName);
  localStorage.removeItem(STORAGE_KEYS.sessionAccessCode);
  localStorage.removeItem(STORAGE_KEYS.allowedMaterials);
  localStorage.removeItem(STORAGE_KEYS.featureFlags);
  document.getElementById("passwordInput").value = "";
  document.getElementById("studentLoginInput").value = "";
  showOnly("loginScreen");
}

function togglePasswordField(id, checked) {
  const field = document.getElementById(id);
  if (field) field.type = checked ? "text" : "password";
}

