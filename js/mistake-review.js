/* =========================
   間違い復習
========================= */

function saveWrongWord(id) {
  const key = getWrongKey();
  const wrongIds = getWrongIds();
  if (!wrongIds.includes(String(id))) wrongIds.push(String(id));
  localStorage.setItem(key, JSON.stringify(wrongIds));
  updateMistakeCountInSettings();
}

function removeWrongWord(id) {
  const key = getWrongKey();
  const wrongIds = getWrongIds().filter(wrongId => wrongId !== String(id));
  localStorage.setItem(key, JSON.stringify(wrongIds));
  updateMistakeCountInSettings();
}

function getWrongIds() {
  try {
    return JSON.parse(localStorage.getItem(getWrongKey())) || [];
  } catch {
    return [];
  }
}

function getWrongKey(type = testType) {
  return `${STORAGE_KEYS.legacyWrongPrefix}_${type}_${currentStudentId || "unknown"}`;
}

function clearStoredMistakes() {
  if (!confirm("この学習者の単語間違い履歴を削除しますか？")) return;
  localStorage.removeItem(getWrongKey());
  updateMistakeCountInSettings();
  alert("間違い履歴を削除しました。" );
}



