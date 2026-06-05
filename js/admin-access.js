/* =========================
   管理者：アクセスコード
========================= */

function openAccessManager() {
  if (!isAdmin) return;
  renderAccessMaterialCheckboxes();
  renderAccessFeatureCheckboxes(DEFAULT_FEATURE_FLAGS);
  document.getElementById("createAccessCodeMessage").textContent = "";
  showOnly("adminAccessScreen");
  loadAccessCodeList();
}

function renderAccessMaterialCheckboxes() {
  const area = document.getElementById("accessMaterialCheckboxes");
  const categoryOrder = ["toeic", "toefl", "highschool", "eiken", "classics", "teacher"];
  area.innerHTML = categoryOrder.map(categoryKey => {
    const info = CATEGORY_INFO[categoryKey];
    const items = Object.keys(TEST_CONFIG).filter(type => TEST_CONFIG[type].category === categoryKey);
    if (items.length === 0) return "";
    return `
      <div class="checkbox-category">
        <strong>${escapeHtml(info.label)}</strong>
        ${items.map(type => `
          <label class="material-check">
            <input type="checkbox" value="${escapeHtml(type)}">
            ${escapeHtml(TEST_CONFIG[type].title)}
          </label>
        `).join("")}
      </div>
    `;
  }).join("");
}

function renderAccessFeatureCheckboxes(flags = DEFAULT_FEATURE_FLAGS) {
  const area = document.getElementById("accessFeatureCheckboxes");
  if (!area) return;
  const normalized = normalizeFeatureFlags(flags);
  area.innerHTML = FEATURE_FLAG_DEFINITIONS.map(feature => `
    <label class="feature-toggle-card">
      <input type="checkbox" value="${escapeHtml(feature.key)}" ${normalized[feature.key] ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(feature.label)}</strong>
        <small>${escapeHtml(feature.description)}</small>
      </span>
    </label>
  `).join("");
}

function getAccessFeatureFlagsFromForm() {
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  document.querySelectorAll("#accessFeatureCheckboxes input[type='checkbox']").forEach(box => {
    flags[box.value] = Boolean(box.checked);
  });
  return normalizeFeatureFlags(flags);
}

function resetAccessFeatureCheckboxes() {
  renderAccessFeatureCheckboxes(DEFAULT_FEATURE_FLAGS);
}

function getRecordFeatureFlags(record = {}) {
  return normalizeFeatureFlags(record.featureFlags || record);
}

function accessFeatureSummaryHtml(flags) {
  const normalized = normalizeFeatureFlags(flags);
  return `<div class="feature-badge-list">${FEATURE_FLAG_DEFINITIONS.map(feature => `
    <span class="feature-badge ${normalized[feature.key] ? "on" : "off"}">${escapeHtml(feature.label)}：${normalized[feature.key] ? "ON" : "OFF"}</span>
  `).join("")}</div>`;
}

function accessFeatureToggleCellHtml(code, flags) {
  const normalized = normalizeFeatureFlags(flags);
  return `<div class="access-feature-mini-list">${FEATURE_FLAG_DEFINITIONS.map(feature => `
    <label class="mini-feature-check">
      <input type="checkbox" data-feature-toggle="${escapeHtml(code)}" data-feature-key="${escapeHtml(feature.key)}" ${normalized[feature.key] ? "checked" : ""}>
      ${escapeHtml(feature.label)}
    </label>
  `).join("")}</div>`;
}

async function createAccessCodeFromForm() {
  const msg = document.getElementById("createAccessCodeMessage");
  const studentId = document.getElementById("accessStudentIdInput").value.trim();
  const studentName = document.getElementById("accessStudentNameInput").value.trim();
  const memo = document.getElementById("accessMemoInput").value.trim();
  const allowed = [...document.querySelectorAll("#accessMaterialCheckboxes input[type='checkbox']:checked")].map(box => box.value);
  const flags = getAccessFeatureFlagsFromForm();

  if (!studentId) {
    msg.className = "error";
    msg.textContent = "学習者IDを入力してください。";
    return;
  }
  if (allowed.length === 0) {
    msg.className = "error";
    msg.textContent = "使用させる教材を1つ以上選択してください。";
    return;
  }

  try {
    msg.className = "muted";
    msg.textContent = "コードを発行しています...";
    const result = await apiGetJsonp("createAccessCode", {
      adminPassword: ADMIN_PASSWORD,
      studentId,
      studentName,
      memo,
      allowedMaterials: allowed,
      ...featureFlagParams(flags)
    });

    if (!result.ok) throw new Error(result.error || "コード発行に失敗しました。");

    msg.className = "correct";
    msg.innerHTML = `発行しました。学習者コード：<strong class="issued-code">${escapeHtml(result.code)}</strong>`;
    document.getElementById("accessStudentIdInput").value = "";
    document.getElementById("accessStudentNameInput").value = "";
    document.getElementById("accessMemoInput").value = "";
    document.querySelectorAll("#accessMaterialCheckboxes input[type='checkbox']").forEach(box => { box.checked = false; });
    resetAccessFeatureCheckboxes();
    loadAccessCodeList();
  } catch (error) {
    console.error(error);
    msg.className = "error";
    msg.textContent = error.message;
  }
}

async function loadAccessCodeList() {
  const area = document.getElementById("accessCodeListArea");
  area.innerHTML = "<p class='muted'>読み込み中...</p>";
  try {
    const result = await apiGetJsonp("listAccessCodes", { adminPassword: ADMIN_PASSWORD });
    if (!result.ok) throw new Error(result.error || "一覧の取得に失敗しました。");
    renderAccessCodeList(result.records || []);
  } catch (error) {
    console.error(error);
    area.innerHTML = `<p class="error">${escapeHtml(error.message)}</p>`;
  }
}

function renderAccessCodeList(records) {
  const area = document.getElementById("accessCodeListArea");
  if (records.length === 0) {
    area.innerHTML = "<p class='muted'>発行済みコードはまだありません。</p>";
    return;
  }

  area.innerHTML = `
    <table class="history-table compact-table access-code-table">
      <thead>
        <tr>
          <th>コード</th><th>ID</th><th>名前</th><th>許可教材</th><th>機能</th><th>状態</th><th>使用回数</th><th>最終使用</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(record => {
          const flags = getRecordFeatureFlags(record);
          return `
          <tr>
            <td><strong>${escapeHtml(record.code)}</strong></td>
            <td>${escapeHtml(record.studentId)}</td>
            <td>${escapeHtml(record.studentName)}</td>
            <td>${escapeHtml(materialNames(parseMaterialList(record.allowedMaterials)).join(" / "))}</td>
            <td>${accessFeatureToggleCellHtml(record.code, flags)}${accessFeatureSummaryHtml(flags)}</td>
            <td class="${record.active ? "correct" : "wrong"}">${record.active ? "有効" : "無効"}</td>
            <td>${escapeHtml(record.useCount ?? 0)}</td>
            <td>${escapeHtml(formatSheetDate(record.lastUsedAt))}</td>
            <td>
              <button class="small-button secondary-button" data-edit-code="${escapeHtml(record.code)}" data-materials="${escapeHtml(parseMaterialList(record.allowedMaterials).join(","))}">教材変更</button>
              <button class="small-button ${record.active ? "quit-button" : "secondary-button"}" data-code="${escapeHtml(record.code)}" data-active="${record.active ? "false" : "true"}">${record.active ? "無効化" : "有効化"}</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  `;

  area.querySelectorAll("button[data-code]").forEach(button => {
    button.addEventListener("click", () => updateAccessCodeActive(button.dataset.code, button.dataset.active === "true"));
  });
  area.querySelectorAll("button[data-edit-code]").forEach(button => {
    button.addEventListener("click", () => updateAccessCodeMaterials(button.dataset.editCode, button.dataset.materials || ""));
  });
  area.querySelectorAll("input[data-feature-toggle]").forEach(box => {
    box.addEventListener("change", () => updateAccessCodeFeaturesFromRow(box.dataset.featureToggle));
  });
}

async function updateAccessCodeActive(code, active) {
  try {
    await apiGetJsonp("updateAccessCode", { adminPassword: ADMIN_PASSWORD, code, active });
    loadAccessCodeList();
  } catch (error) {
    alert(error.message);
  }
}

async function updateAccessCodeFeaturesFromRow(code) {
  const boxes = [...document.querySelectorAll("input[data-feature-toggle]")].filter(box => box.dataset.featureToggle === code);
  const flags = { ...DEFAULT_FEATURE_FLAGS };
  boxes.forEach(box => { flags[box.dataset.featureKey] = Boolean(box.checked); });
  boxes.forEach(box => { box.disabled = true; });
  try {
    await apiGetJsonp("updateAccessCode", { adminPassword: ADMIN_PASSWORD, code, ...featureFlagParams(flags) });
    loadAccessCodeList();
  } catch (error) {
    alert(error.message || "機能設定の変更に失敗しました。");
    boxes.forEach(box => { box.disabled = false; });
  }
}

async function updateAccessCodeMaterials(code, currentMaterialsText) {
  const allKeys = Object.keys(TEST_CONFIG).join(",");
  const input = prompt(`許可する教材キーをカンマ区切りで入力してください。\n\n利用可能キー：${allKeys}`, currentMaterialsText || "");
  if (input == null) return;
  const allowedMaterials = input.split(",").map(v => v.trim()).filter(Boolean);
  const invalid = allowedMaterials.filter(type => !TEST_CONFIG[type]);
  if (invalid.length) return alert(`存在しない教材キーがあります：${invalid.join(", ")}`);
  if (!allowedMaterials.length) return alert("教材を1つ以上指定してください。");
  try {
    await apiGetJsonp("updateAccessCode", { adminPassword: ADMIN_PASSWORD, code, allowedMaterials });
    loadAccessCodeList();
  } catch (error) {
    alert(error.message || "教材変更に失敗しました。Apps Script側の updateAccessCode が allowedMaterials に対応しているか確認してください。");
  }
}

function parseMaterialList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(/[,/]/).map(v => v.trim()).filter(Boolean);
  return [];
}

function materialNames(types) {
  return (types || []).map(type => TEST_CONFIG[type]?.title || type);
}

function formatSheetDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value);
}
