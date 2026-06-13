/* =========================================================
   Learning Tool GAS API
   - AccessCodes 管理
   - WritingSubmissions 保存
   - QuizResults / QuizSessions 保存
   - 1問ごとの即時保存 submitQuizAnswer に対応
   - 学習者ごとの個別ログシート Learner_<studentId> を自動作成
   - JSONP対応：GitHub Pagesから学習者コード照合・一覧取得を可能にする
========================================================= */

const ADMIN_PASSWORD = "9999";

// スタンドアロンApps Scriptで使う場合は、スプレッドシートIDを入れてください。
// スプレッドシートに紐づいたApps Scriptなら空欄のままでOKです。
const SPREADSHEET_ID = "1IVYdFKi7vMxQin0VJz9t404YaHVXocO83qT5cY4VypA";

const SHEET_NAMES = {
  accessCodes: "AccessCodes",
  writing: "WritingSubmissions",
  quiz: "QuizResults",          // 1問ごとの解答ログ
  quizSessions: "QuizSessions"  // テスト1回ごとの概要ログ
};

const STUDENT_SHEET_PREFIX = "Learner_";

const ACCESS_HEADERS = [
  "code",
  "studentId",
  "studentName",
  "allowedMaterials",
  "active",
  "createdAt",
  "lastUsedAt",
  "useCount",
  "memo",
  "learningTreeEnabled",
  "zodiacEnabled",
  "bossEnabled"
];

const WRITING_HEADERS = [
  "timestamp",
  "accessCode",
  "studentId",
  "studentName",
  "material",
  "taskId",
  "prompt",
  "writingText",
  "wordCount",
  "timeSpent"
];

const QUIZ_HEADERS = [
  "timestamp",
  "answerId",
  "sessionId",
  "accessCode",
  "studentId",
  "studentName",
  "category",
  "material",
  "testType",
  "mode",
  "status",
  "score",
  "totalQuestions",
  "answeredCount",
  "totalSeconds",
  "questionId",
  "section",
  "prompt",
  "userAnswer",
  "correctAnswer",
  "isCorrect",
  "points",
  "explanation",
  "responseTimeSec",
  "timedOut",
  "source"
];

const QUIZ_SESSION_HEADERS = [
  "timestamp",
  "sessionId",
  "accessCode",
  "studentId",
  "studentName",
  "category",
  "material",
  "testType",
  "mode",
  "status",
  "score",
  "totalQuestions",
  "answeredCount",
  "accuracy",
  "totalSeconds",
  "startTime",
  "endTime",
  "source"
];

// 学習者ごとの個別シートは、QuizとWritingを同じ形式で追跡できるようにする。
const STUDENT_LOG_HEADERS = [
  "timestamp",
  "recordType",
  "answerId",
  "sessionId",
  "accessCode",
  "studentId",
  "studentName",
  "category",
  "material",
  "testType",
  "mode",
  "status",
  "score",
  "totalQuestions",
  "answeredCount",
  "accuracy",
  "totalSeconds",
  "questionId",
  "section",
  "prompt",
  "userAnswer",
  "correctAnswer",
  "isCorrect",
  "points",
  "explanation",
  "responseTimeSec",
  "timedOut",
  "taskId",
  "writingText",
  "wordCount",
  "timeSpent",
  "source"
];

/* =========================
   Entry points
========================= */

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = p.action || "status";
    let result;

    if (action === "status") {
      result = {
        ok: true,
        app: "Learning Tool API",
        message: "GAS is running.",
        features: ["accessCodes", "accessFeatureFlags", "writing", "quizResult", "quizSummary", "quizAnswer", "appendAnswerRecord", "studentSheets"],
        time: new Date()
      };
    } else if (action === "createAccessCode") {
      result = createAccessCode(p);
    } else if (action === "validateAccessCode") {
      result = validateAccessCode(p, true);
    } else if (action === "listAccessCodes") {
      result = listAccessCodes(p);
    } else if (action === "updateAccessCode") {
      result = updateAccessCode(p);
    } else if (action === "updateAccessMaterials") {
      result = updateAccessMaterials(p);
    } else if (action === "setupSheets") {
      result = setupSheets(p);
    } else {
      result = { ok: false, error: "Unknown GET action: " + action };
    }

    return outputResponse(result, p.callback);
  } catch (err) {
    return outputResponse({ ok: false, error: String(err && err.message ? err.message : err) }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const data = JSON.parse(raw);
    const action = data.action || "submitQuizResult";

    if (action === "createAccessCode") return jsonResponse(createAccessCode(data));
    if (action === "validateAccessCode") return jsonResponse(validateAccessCode(data, true));
    if (action === "listAccessCodes") return jsonResponse(listAccessCodes(data));
    if (action === "updateAccessCode") return jsonResponse(updateAccessCode(data));
    if (action === "updateAccessMaterials") return jsonResponse(updateAccessMaterials(data));
    if (action === "submitWriting") return jsonResponse(submitWriting(data));

    // 現在の script.js との互換：
    // - appendAnswerRecord: 1問ごとの即時保存
    // - submitQuizSummary: 最後の概要だけ保存
    if (action === "appendAnswerRecord") return jsonResponse(submitQuizAnswer(data));
    if (action === "submitQuizAnswer") return jsonResponse(submitQuizAnswer(data));
    if (action === "submitQuizSummary") return jsonResponse(submitQuizResult({ ...data, skipAnswerRows: true }));
    if (action === "submitQuizResult") return jsonResponse(submitQuizResult(data));
    if (action === "setupSheets") return jsonResponse(setupSheets(data));

    return jsonResponse({ ok: false, error: "Unknown POST action: " + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* =========================
   Access code functions
========================= */

function createAccessCode(data) {
  assertAdmin(data);
  const sheet = getOrCreateSheet(SHEET_NAMES.accessCodes, ACCESS_HEADERS);

  const code = String(data.code || generateUniqueCode()).trim().toUpperCase();
  const studentId = String(data.studentId || "").trim();
  const studentName = String(data.studentName || "").trim();
  const allowedMaterials = normalizeAllowedMaterials(data.allowedMaterials);
  const memo = String(data.memo || "").trim();
  const featureFlags = normalizeFeatureFlags(data);

  if (!studentId) throw new Error("studentId が必要です。");
  if (!allowedMaterials) throw new Error("allowedMaterials が必要です。");
  if (findAccessCodeRow(code)) throw new Error("このコードはすでに存在します: " + code);

  appendObjectRows(sheet, ACCESS_HEADERS, [{
    code,
    studentId,
    studentName,
    allowedMaterials,
    active: true,
    createdAt: new Date(),
    lastUsedAt: "",
    useCount: 0,
    memo,
    learningTreeEnabled: featureFlags.learningTree,
    zodiacEnabled: featureFlags.zodiac,
    bossEnabled: featureFlags.boss
  }]);
  getOrCreateStudentLogSheet(studentId, studentName);

  return { ok: true, code, studentId, studentName, allowedMaterials: parseAllowedMaterials(allowedMaterials), featureFlags };
}

function validateAccessCode(data, updateUsage) {
  const code = String(data.code || "").trim().toUpperCase();
  if (!code) throw new Error("code が必要です。");

  const found = findAccessCodeRow(code);
  if (!found) return { ok: false, valid: false, error: "この学習者コードは存在しません。" };

  const row = found.row;
  if (!isActiveValue(row[4])) return { ok: false, valid: false, error: "この学習者コードは現在無効です。" };

  const studentId = String(row[1] || "");
  const studentName = String(row[2] || "");
  const allowedMaterials = parseAllowedMaterials(row[3]);
  const featureFlags = getFeatureFlagsFromRow(row, getHeaders(found.sheet));

  if (updateUsage) {
    const currentUseCount = Number(row[7]) || 0;
    found.sheet.getRange(found.rowIndex, 7).setValue(new Date());
    found.sheet.getRange(found.rowIndex, 8).setValue(currentUseCount + 1);
    getOrCreateStudentLogSheet(studentId, studentName);
  }

  return { ok: true, valid: true, code, studentId, studentName, allowedMaterials, featureFlags };
}

function listAccessCodes(data) {
  assertAdmin(data);
  const sheet = getOrCreateSheet(SHEET_NAMES.accessCodes, ACCESS_HEADERS);
  const values = sheet.getDataRange().getValues();
  const headers = getHeaders(sheet);
  const records = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    records.push({
      code: String(row[0] || ""),
      studentId: String(row[1] || ""),
      studentName: String(row[2] || ""),
      allowedMaterials: parseAllowedMaterials(row[3]),
      active: isActiveValue(row[4]),
      createdAt: serializeDate(row[5]),
      lastUsedAt: serializeDate(row[6]),
      useCount: Number(row[7]) || 0,
      memo: String(row[8] || ""),
      featureFlags: getFeatureFlagsFromRow(row, headers)
    });
  }

  return { ok: true, records };
}

function updateAccessCode(data) {
  assertAdmin(data);
  const code = String(data.code || "").trim().toUpperCase();
  if (!code) throw new Error("code が必要です。");

  const found = findAccessCodeRow(code);
  if (!found) throw new Error("対象コードが見つかりません: " + code);

  const rowIndex = found.rowIndex;
  const sheet = found.sheet;
  if (data.studentId !== undefined) sheet.getRange(rowIndex, 2).setValue(String(data.studentId || "").trim());
  if (data.studentName !== undefined) sheet.getRange(rowIndex, 3).setValue(String(data.studentName || "").trim());
  if (data.allowedMaterials !== undefined) sheet.getRange(rowIndex, 4).setValue(normalizeAllowedMaterials(data.allowedMaterials));
  if (data.active !== undefined) sheet.getRange(rowIndex, 5).setValue(toBoolean(data.active));
  if (data.memo !== undefined) sheet.getRange(rowIndex, 9).setValue(String(data.memo || "").trim());
  if (hasFeatureFlagUpdate(data)) {
    const featureFlags = normalizeFeatureFlags(data);
    setAccessHeaderValue(sheet, rowIndex, "learningTreeEnabled", featureFlags.learningTree);
    setAccessHeaderValue(sheet, rowIndex, "zodiacEnabled", featureFlags.zodiac);
    setAccessHeaderValue(sheet, rowIndex, "bossEnabled", featureFlags.boss);
  }

  const refreshed = findAccessCodeRow(code);
  if (refreshed) getOrCreateStudentLogSheet(String(refreshed.row[1] || ""), String(refreshed.row[2] || ""));

  return { ok: true, code };
}

// 発行済みコードの教材だけを変更する互換用関数です。
// 既存の updateAccessCode と同じ AccessCodes シートの allowedMaterials 列だけを更新します。
function updateAccessMaterials(data) {
  assertAdmin(data);
  const code = String(data.code || "").trim().toUpperCase();
  if (!code) throw new Error("code が必要です。");

  const allowedMaterials = normalizeAllowedMaterials(data.allowedMaterials);
  if (!allowedMaterials) throw new Error("allowedMaterials が必要です。");

  const found = findAccessCodeRow(code);
  if (!found) throw new Error("対象コードが見つかりません: " + code);

  found.sheet.getRange(found.rowIndex, 4).setValue(allowedMaterials);
  return { ok: true, code, allowedMaterials: parseAllowedMaterials(allowedMaterials) };
}

/* =========================
   Writing submission
========================= */

function submitWriting(data) {
  return withScriptLock(() => {
    const identity = resolveStudentIdentity(data);
    const sheet = getOrCreateSheet(SHEET_NAMES.writing, WRITING_HEADERS);
    const writingText = String(data.writingText || "");
    const wordCount = data.wordCount !== undefined ? Number(data.wordCount) || 0 : countEnglishWords(writingText);
    const timestamp = new Date();

    const writingRow = {
      timestamp,
      accessCode: identity.accessCode,
      studentId: identity.studentId,
      studentName: identity.studentName,
      material: String(data.material || ""),
      taskId: String(data.taskId || ""),
      prompt: String(data.prompt || ""),
      writingText,
      wordCount,
      timeSpent: Number(data.timeSpent) || 0
    };
    appendObjectRows(sheet, WRITING_HEADERS, [writingRow]);

    const studentSheet = getOrCreateStudentLogSheet(identity.studentId, identity.studentName);
    appendObjectRows(studentSheet, STUDENT_LOG_HEADERS, [{
      timestamp,
      recordType: "writing",
      answerId: String(data.answerId || data.submissionId || Utilities.getUuid()),
      sessionId: String(data.sessionId || ""),
      accessCode: identity.accessCode,
      studentId: identity.studentId,
      studentName: identity.studentName,
      category: String(data.category || "writing"),
      material: String(data.material || ""),
      testType: String(data.testType || "writing"),
      mode: String(data.mode || "writing"),
      taskId: String(data.taskId || ""),
      prompt: String(data.prompt || ""),
      writingText,
      wordCount,
      timeSpent: Number(data.timeSpent) || 0,
      source: "submitWriting"
    }]);

    return { ok: true, message: "Writing submission saved.", wordCount, studentSheet: studentSheet.getName() };
  });
}

/* =========================
   Quiz answer / result
========================= */

// 1問回答するたびに呼び出す想定の関数です。
// フロント側 payload 例：{ action:"submitQuizAnswer", accessCode, studentId, material, answer:{...} }
function submitQuizAnswer(data) {
  return withScriptLock(() => {
    const identity = resolveStudentIdentity(data);
    const answer = data.answer && typeof data.answer === "object" ? data.answer : data;
    const row = buildQuizAnswerRow(data, answer, identity, "submitQuizAnswer");

    const quizSheet = getOrCreateSheet(SHEET_NAMES.quiz, QUIZ_HEADERS);
    appendObjectRows(quizSheet, QUIZ_HEADERS, [row]);

    const studentSheet = getOrCreateStudentLogSheet(identity.studentId, identity.studentName);
    appendObjectRows(studentSheet, STUDENT_LOG_HEADERS, [toStudentLogRow(row, "quiz")]);

    return { ok: true, savedRows: 1, answerId: row.answerId, studentSheet: studentSheet.getName() };
  });
}

function submitQuizResult(data) {
  return withScriptLock(() => {
    const identity = resolveStudentIdentity(data);
    const answers = Array.isArray(data.answers) ? data.answers : [];
    const sessionId = String(data.sessionId || data.quizSessionId || Utilities.getUuid());
    const timestamp = new Date();
    const answeredCount = Number(data.answeredCount) || answers.length || 0;
    const totalQuestions = Number(data.totalQuestions) || answers.length || 0;
    const score = Number(data.score) || 0;
    const accuracy = data.accuracy !== undefined
      ? Number(data.accuracy) || 0
      : (answeredCount ? Math.round((answers.filter(a => a.correct === true || a.isCorrect === true).length / answeredCount) * 100) : 0);

    const summaryRow = {
      timestamp,
      sessionId,
      accessCode: identity.accessCode,
      studentId: identity.studentId,
      studentName: identity.studentName,
      category: String(data.category || ""),
      material: String(data.material || ""),
      testType: String(data.testType || ""),
      mode: String(data.mode || ""),
      status: String(data.status || ""),
      score,
      totalQuestions,
      answeredCount,
      accuracy,
      totalSeconds: Number(data.totalSeconds) || 0,
      startTime: String(data.startTime || ""),
      endTime: String(data.endTime || ""),
      source: "submitQuizResult"
    };

    const sessionSheet = getOrCreateSheet(SHEET_NAMES.quizSessions, QUIZ_SESSION_HEADERS);
    appendObjectRows(sessionSheet, QUIZ_SESSION_HEADERS, [summaryRow]);

    const studentSheet = getOrCreateStudentLogSheet(identity.studentId, identity.studentName);
    appendObjectRows(studentSheet, STUDENT_LOG_HEADERS, [toStudentSessionLogRow(summaryRow)]);

    // 旧フロントエンド互換：最後に answers をまとめて送る形式でも保存する。
    // 1問ごと送信へ移行した場合は、フロント側で skipAnswerRows: true を付けると重複を避けられます。
    if (answers.length > 0 && data.skipAnswerRows !== true && String(data.skipAnswerRows).toLowerCase() !== "true") {
      const quizRows = answers.map((answer, index) => buildQuizAnswerRow({ ...data, sessionId, answerIndex: index + 1 }, answer, identity, "submitQuizResult"));
      const quizSheet = getOrCreateSheet(SHEET_NAMES.quiz, QUIZ_HEADERS);
      appendObjectRows(quizSheet, QUIZ_HEADERS, quizRows);
      appendObjectRows(studentSheet, STUDENT_LOG_HEADERS, quizRows.map(row => toStudentLogRow(row, "quiz")));
      return { ok: true, savedRows: quizRows.length, sessionSaved: true, studentSheet: studentSheet.getName() };
    }

    return { ok: true, savedRows: 0, sessionSaved: true, studentSheet: studentSheet.getName() };
  });
}

function buildQuizAnswerRow(data, answer, identity, source) {
  const timestamp = new Date();
  const sessionId = String(data.sessionId || data.quizSessionId || answer.sessionId || "");
  const answerId = String(answer.answerId || answer.clientAnswerId || data.answerId || data.clientAnswerId || makeFallbackAnswerId(data, answer));
  const isCorrect = answer.correct === true || answer.isCorrect === true || String(answer.result || "") === "正解";

  return {
    timestamp,
    answerId,
    sessionId,
    accessCode: identity.accessCode,
    studentId: identity.studentId,
    studentName: identity.studentName,
    category: String(data.category || answer.category || ""),
    material: String(data.material || answer.material || ""),
    testType: String(data.testType || answer.testType || ""),
    mode: String(data.mode || answer.mode || ""),
    status: String(data.status || answer.status || ""),
    score: Number(data.score) || 0,
    totalQuestions: Number(data.totalQuestions) || 0,
    answeredCount: Number(data.answeredCount) || 0,
    totalSeconds: Number(data.totalSeconds) || 0,
    questionId: String(answer.questionId || answer.id || data.questionId || ""),
    section: String(answer.section || data.section || ""),
    prompt: String(answer.question || answer.prompt || data.question || data.prompt || ""),
    userAnswer: String(answer.userAnswer || data.userAnswer || ""),
    correctAnswer: String(answer.correctAnswer || data.correctAnswer || ""),
    isCorrect: isCorrect ? "正解" : "不正解",
    points: Number(answer.points || data.points) || 1,
    explanation: String(answer.explanation || data.explanation || ""),
    responseTimeSec: Number(answer.responseTimeSec || answer.responseTime || data.responseTimeSec || data.responseTime) || 0,
    timedOut: answer.timedOut === true || data.timedOut === true ? "時間切れ" : "",
    source
  };
}

function toStudentLogRow(row, recordType) {
  return {
    ...row,
    recordType,
    accuracy: ""
  };
}

function toStudentSessionLogRow(row) {
  return {
    ...row,
    recordType: "quizSession"
  };
}

function makeFallbackAnswerId(data, answer) {
  const base = [
    data.sessionId || data.quizSessionId || "session",
    data.answerIndex || "q",
    answer.questionId || answer.id || data.questionId || "unknown",
    new Date().getTime(),
    Math.floor(Math.random() * 100000)
  ];
  return base.join("_");
}

/* =========================
   Setup
========================= */

function setupSheets(data) {
  assertAdmin(data);
  getOrCreateSheet(SHEET_NAMES.accessCodes, ACCESS_HEADERS);
  getOrCreateSheet(SHEET_NAMES.writing, WRITING_HEADERS);
  getOrCreateSheet(SHEET_NAMES.quiz, QUIZ_HEADERS);
  getOrCreateSheet(SHEET_NAMES.quizSessions, QUIZ_SESSION_HEADERS);
  return { ok: true, message: "Sheets are ready.", sheets: Object.keys(SHEET_NAMES).map(k => SHEET_NAMES[k]) };
}

// Apps Scriptエディタ上で初期シートを作成したい場合は、この関数を手動実行してください。
function manualSetupSheets() {
  return setupSheets({ adminPassword: ADMIN_PASSWORD });
}

/* =========================
   Helpers
========================= */

function getSpreadsheet() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeaders(sheet, headers);
  return sheet;
}

function ensureHeaders(sheet, requiredHeaders) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(requiredHeaders);
    return;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => String(v || ""));
  const missing = requiredHeaders.filter(header => currentHeaders.indexOf(header) === -1);
  if (missing.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
  }
}

function getHeaders(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => String(v || ""));
}

function appendObjectRows(sheet, preferredHeaders, rowObjects) {
  if (!rowObjects || rowObjects.length === 0) return;
  ensureHeaders(sheet, preferredHeaders);
  const headers = getHeaders(sheet);
  const values = rowObjects.map(obj => headers.map(header => obj[header] !== undefined ? obj[header] : ""));
  sheet.getRange(sheet.getLastRow() + 1, 1, values.length, headers.length).setValues(values);
}

function getOrCreateStudentLogSheet(studentId, studentName) {
  const safeId = sanitizeSheetName(studentId || "unknown");
  const safeName = sanitizeSheetName(studentName || "");
  const base = safeName ? `${STUDENT_SHEET_PREFIX}${safeId}_${safeName}` : `${STUDENT_SHEET_PREFIX}${safeId}`;
  const sheetName = limitSheetName(base);
  return getOrCreateSheet(sheetName, STUDENT_LOG_HEADERS);
}

function sanitizeSheetName(value) {
  const text = String(value || "").trim() || "unknown";
  return text.replace(/[\\/?*\[\]:]/g, "_").replace(/\s+/g, "_");
}

function limitSheetName(name) {
  // Google Sheetsのシート名は最大100文字。余裕を持って90文字にする。
  const cleaned = String(name || `${STUDENT_SHEET_PREFIX}unknown`);
  return cleaned.length > 90 ? cleaned.slice(0, 90) : cleaned;
}

function resolveStudentIdentity(data) {
  let studentId = String(data.studentId || "").trim();
  let studentName = String(data.studentName || "").trim();
  const accessCode = String(data.accessCode || "").trim().toUpperCase();

  if (accessCode) {
    const access = validateAccessCode({ code: accessCode }, false);
    if (!access.valid) throw new Error(access.error || "学習者コードの確認に失敗しました。");
    studentId = access.studentId || studentId;
    studentName = access.studentName || studentName;
  }

  if (!studentId && accessCode) studentId = accessCode;
  if (!studentId) studentId = "unknown";
  return { accessCode, studentId, studentName };
}

function findAccessCodeRow(code) {
  const sheet = getOrCreateSheet(SHEET_NAMES.accessCodes, ACCESS_HEADERS);
  const values = sheet.getDataRange().getValues();
  const target = String(code || "").trim().toUpperCase();
  for (let i = 1; i < values.length; i++) {
    const rowCode = String(values[i][0] || "").trim().toUpperCase();
    if (rowCode === target) return { sheet, rowIndex: i + 1, row: values[i] };
  }
  return null;
}

function generateUniqueCode() {
  let code = "";
  let tries = 0;
  do {
    code = generateCode(6);
    tries++;
    if (tries > 100) throw new Error("コード生成に失敗しました。");
  } while (findAccessCodeRow(code));
  return code;
}

function generateCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

function normalizeAllowedMaterials(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(",");
  return String(value || "").split(",").map(v => v.trim()).filter(Boolean).join(",");
}

function parseAllowedMaterials(value) {
  return String(value || "").split(",").map(v => v.trim()).filter(Boolean);
}


function hasFeatureFlagUpdate(data) {
  if (!data) return false;
  const keys = ["featureFlags", "learningTree", "learningTreeEnabled", "tree", "treeEnabled", "zodiac", "zodiacEnabled", "boss", "bossEnabled"];
  return keys.some(key => data[key] !== undefined);
}

function normalizeFeatureFlags(data) {
  let source = data && data.featureFlags !== undefined ? data.featureFlags : data;
  if (typeof source === "string") {
    const text = source.trim();
    if (text) {
      try { source = JSON.parse(text); } catch (err) { source = {}; }
    } else {
      source = {};
    }
  }
  if (!source || typeof source !== "object") source = {};
  return {
    learningTree: toFeatureFlagBoolean(firstDefined(source, ["learningTree", "learningTreeEnabled", "tree", "treeEnabled"]), true),
    zodiac: toFeatureFlagBoolean(firstDefined(source, ["zodiac", "zodiacEnabled"]), true),
    boss: toFeatureFlagBoolean(firstDefined(source, ["boss", "bossEnabled"]), true)
  };
}

function getFeatureFlagsFromRow(row, headers) {
  return {
    learningTree: toFeatureFlagBoolean(getAccessHeaderValue(row, headers, "learningTreeEnabled", 9), true),
    zodiac: toFeatureFlagBoolean(getAccessHeaderValue(row, headers, "zodiacEnabled", 10), true),
    boss: toFeatureFlagBoolean(getAccessHeaderValue(row, headers, "bossEnabled", 11), true)
  };
}

function firstDefined(source, keys) {
  for (let i = 0; i < keys.length; i++) {
    if (source[keys[i]] !== undefined) return source[keys[i]];
  }
  return undefined;
}

function toFeatureFlagBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (value === true) return true;
  if (value === false) return false;
  const text = String(value).trim().toUpperCase();
  if (["FALSE", "0", "NO", "OFF", "DISABLED", "HIDE", "HIDDEN", "無効", "非表示", "オフ"].indexOf(text) !== -1) return false;
  if (["TRUE", "1", "YES", "ON", "ENABLED", "SHOW", "VISIBLE", "有効", "表示", "オン"].indexOf(text) !== -1) return true;
  return defaultValue;
}

function getAccessHeaderValue(row, headers, header, fallbackIndex) {
  const index = headers.indexOf(header);
  if (index >= 0) return row[index];
  return row[fallbackIndex];
}

function setAccessHeaderValue(sheet, rowIndex, header, value) {
  ensureHeaders(sheet, ACCESS_HEADERS);
  const headers = getHeaders(sheet);
  let index = headers.indexOf(header);
  if (index === -1) {
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(header);
  }
  sheet.getRange(rowIndex, index + 1).setValue(value);
}

function isActiveValue(value) {
  if (value === true) return true;
  const text = String(value || "").trim().toUpperCase();
  return text === "TRUE" || text === "1" || text === "YES" || text === "有効";
}

function toBoolean(value) {
  if (value === true) return true;
  const text = String(value || "").trim().toUpperCase();
  return text === "TRUE" || text === "1" || text === "YES" || text === "有効";
}

function countEnglishWords(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

function assertAdmin(data) {
  const password = String(data.adminPassword || "").trim();
  if (password !== ADMIN_PASSWORD) throw new Error("管理者認証に失敗しました。");
}

function serializeDate(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
  }
  return String(value);
}

function withScriptLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function outputResponse(obj, callback) {
  if (callback) {
    const safeCallback = String(callback).replace(/[^a-zA-Z0-9_$.]/g, "");
    return ContentService.createTextOutput(`${safeCallback}(${JSON.stringify(obj)});`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonResponse(obj);
}
