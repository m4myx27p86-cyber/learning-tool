/* =========================
   CSV読み込み
========================= */

async function loadChoiceQuestions(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。フォルダ名・ファイル名を確認してください。`);
    return [];
  }

  const text = await response.text();
  const rows = parseCSV(text);
  const header = (rows.shift() || []).map(cell => String(cell || "").trim());

  return rows.map(row => {
    const id = getCsvCell(row, header, ["id", "no", "number", "番号"], 0);
    const section = getCsvCell(row, header, ["section", "lesson", "unit", "part", "セクション", "レッスン", "単元"], 1);
    const word = getCsvCell(row, header, ["word", "term", "sentence", "stimulus", "語", "語句", "問題"], 2);

    // passage列があるCSVだけ本文として扱います。
    // word列を本文に流用すると、ポラリス3で設問が本文欄に出るため、ここでは代用しません。
    const passageNames = ["passage", "context", "body", "source", "text", "本文", "長文"];
    const hasExplicitPassageColumn = hasCsvHeader(header, passageNames);
    const passage = getCsvCell(row, header, passageNames, -1);

    // ポラリス3のCSVでは word列が設問、questionType列が Vocabulary/Factual です。
    // fallbackを9列目にすると questionType が設問として表示されるため、明示的なquestion列がない場合はword列を使います。
    const explicitQuestion = getCsvCell(row, header, ["question", "prompt", "item", "設問", "問い", "問題文"], -1);
    const question = explicitQuestion || word;

    const correctAnswer = getCsvCell(row, header, ["correctanswer", "correct", "answer", "key", "正解"], 3);
    const points = Number(getCsvCell(row, header, ["points", "point", "score", "配点"], 7)) || 1;
    const explanation = getCsvCell(row, header, ["explanation", "comment", "feedback", "解説", "説明"], 8) || "";
    const questionType = getCsvCell(row, header, ["questionType", "type", "kind", "形式", "問題形式"], -1) || "";
    const summaryText = getCsvCell(row, header, ["summary", "summaryText", "fullSummary", "summaryFullText", "要約", "サマリー", "要約全文"], -1) || "";

    const choices = [
      getCsvCell(row, header, ["choice1", "option1", "answer1", "a", "選択肢1"], 3),
      getCsvCell(row, header, ["choice2", "option2", "answer2", "distractor1", "wrong1", "b", "選択肢2"], 4),
      getCsvCell(row, header, ["choice3", "option3", "answer3", "distractor2", "wrong2", "c", "選択肢3"], 5),
      getCsvCell(row, header, ["choice4", "option4", "answer4", "distractor3", "wrong3", "d", "選択肢4"], 6)
    ].filter(Boolean);

    if (correctAnswer && !choices.includes(correctAnswer)) choices.unshift(correctAnswer);

    return {
      id,
      section,
      word: word || question || passage,
      passage,
      question,
      prompt: question || word,
      correctAnswer,
      choices,
      points,
      explanation,
      questionType,
      summaryText,
      summaryFullText: summaryText,
      hasExplicitPassageColumn,
      sourceFile: filePath
    };
  }).filter(q => q.id && q.section && (q.word || q.question || q.passage) && q.correctAnswer && q.choices.length > 0);
}

function normalizeCsvHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_\-－ー]/g, "");
}

function hasCsvHeader(header, names) {
  const normalizedHeader = header.map(normalizeCsvHeader);
  const normalizedNames = (Array.isArray(names) ? names : [names]).map(normalizeCsvHeader);
  return normalizedNames.some(name => normalizedHeader.includes(name));
}

function getCsvCell(row, header, names, fallbackIndex = -1) {
  const normalizedHeader = header.map(normalizeCsvHeader);
  const normalizedNames = (Array.isArray(names) ? names : [names]).map(normalizeCsvHeader);
  const headerIndex = normalizedNames
    .map(name => normalizedHeader.indexOf(name))
    .find(index => index >= 0);

  if (headerIndex >= 0 && row[headerIndex] !== undefined && String(row[headerIndex]).trim() !== "") {
    return row[headerIndex];
  }

  if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && row[fallbackIndex] !== undefined) {
    return row[fallbackIndex];
  }

  return "";
}

async function loadChoiceQuestionsFromFiles(files) {
  const all = [];
  for (const file of files) {
    const loaded = await loadChoiceQuestions(file);
    all.push(...loaded);
  }
  return all;
}

async function loadPolaris3Questions(config) {
  const files = Array.isArray(config.files) ? config.files : [];
  const manifest = await loadPolaris3Manifest(config.manifest);
  const all = [];

  for (const file of files) {
    const fileLessonKey = getPolarisLessonKey(file);
    const loaded = await loadChoiceQuestions(file);
    loaded.forEach(question => {
      const sectionLessonKey = getPolarisLessonKey(question.section) || fileLessonKey;
      const manifestEntry = getPolarisManifestEntry(manifest, question.section, sectionLessonKey, fileLessonKey, file);
      const embeddedPassage = question.hasExplicitPassageColumn
        ? (question.passage || "")
        : (looksLikePolarisQuestion(question.passage, question.question) ? "" : (question.passage || ""));

      // 各Lesson CSVの passage 列を最優先します。
      // manifest.csvの description/path は本文ではなく見出し・ファイル情報なので、本文として上書きしません。
      const passage = embeddedPassage || manifestEntry?.passage || "";
      const title = manifestEntry?.title || question.passageTitle || makePolarisLessonTitle(sectionLessonKey || question.section || fileLessonKey);

      all.push({
        ...question,
        section: question.section || title,
        passage,
        passageTitle: title,
        lessonKey: sectionLessonKey || fileLessonKey
      });
    });
  }

  enrichPolarisSummaryBlocks(all);
  return all;
}

function enrichPolarisSummaryBlocks(items) {
  const groups = new Map();
  items.forEach(item => {
    if (!isPolarisSummaryQuestion(item)) return;
    const key = `${item.lessonKey || item.section || ""}::${normalizeForCompare(item.passage || "")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  groups.forEach(group => {
    const explicitSummary = group
      .map(item => String(item.summaryFullText || item.summaryText || "").trim())
      .find(text => text.length > 0);
    const generatedSummary = group
      .map(item => String(item.question || item.prompt || item.word || "").trim())
      .filter(Boolean)
      .join("\n");
    const summaryText = explicitSummary || generatedSummary;
    group.forEach(item => { item.summaryFullText = summaryText; });
  });
}

function isPolarisSummaryQuestion(item) {
  const type = String(item?.questionType || "").toLowerCase();
  const id = String(item?.id || "").toUpperCase();
  return type.includes("summary") || /-S\d+/.test(id);
}

async function loadPolaris3Manifest(manifestPath) {
  const manifest = new Map();
  if (!manifestPath) return manifest;

  try {
    const response = await fetch(manifestPath);
    if (!response.ok) return manifest;

    const text = await response.text();
    const rows = parseCSV(text);
    const header = (rows.shift() || []).map(cell => String(cell || "").trim());

    rows.forEach(row => {
      const lesson = getCsvCell(row, header, ["lesson", "section", "unit", "id", "レッスン", "セクション"], 0);
      const path = getCsvCell(row, header, ["path", "file", "filename", "ファイル", "パス"], 1);
      const title = getCsvCell(row, header, ["title", "name", "label", "description", "desc", "見出し", "タイトル", "説明"], -1) || makePolarisLessonTitle(lesson);

      // description列やpath列は本文ではありません。
      // 本文列が明示されているmanifestだけ、補助本文として使います。
      const passage = getCsvCell(row, header, ["passage", "body", "text", "context", "本文", "長文"], -1);
      if (!lesson) return;

      [lesson, title, path, getPolarisLessonKey(lesson), getPolarisLessonKey(path)].filter(Boolean).forEach(key => {
        manifest.set(normalizePolarisKey(key), { title, passage });
      });
    });
  } catch (error) {
    console.warn("ポラリス3本文manifestを読み込めませんでした:", error);
  }

  return manifest;
}

function getPolarisManifestEntry(manifest, ...keys) {
  for (const key of keys) {
    const normalized = normalizePolarisKey(key);
    if (normalized && manifest.has(normalized)) return manifest.get(normalized);
  }
  return null;
}

function getPolarisLessonKey(value) {
  const text = String(value || "").trim();
  const match = text.match(/(?:polaris3[_\-\s]*)?lesson[_\-\s]*(\d+)|^\s*(\d+)\s*$/i);
  if (!match) return "";
  return `lesson${match[1] || match[2]}`;
}

function normalizePolarisKey(value) {
  const lessonKey = getPolarisLessonKey(value);
  if (lessonKey) return lessonKey;
  return String(value || "").trim().toLowerCase().replace(/[\s_\-－ー]/g, "");
}

function makePolarisLessonTitle(value) {
  const lessonKey = getPolarisLessonKey(value);
  if (!lessonKey) return String(value || "本文");
  return `Lesson ${lessonKey.replace("lesson", "")}`;
}

function looksLikePolarisQuestion(text, questionText = "") {
  const clean = String(text || "").trim();
  if (!clean) return true;
  if (questionText && normalizeForCompare(clean) === normalizeForCompare(questionText)) return true;
  return clean.length < 180 && /[?？]|according|which|what|why|author|main idea|closest in meaning|本文|選び/i.test(clean);
}

async function loadErrorCorrectionQuestions(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。フォルダ名・ファイル名を確認してください。`);
    return [];
  }

  const text = await response.text();
  const rows = parseCSV(text);
  const header = (rows.shift() || []).map(cell => String(cell || "").trim());
  const isCurrentReviewCsv =
    header.includes("sentence") &&
    header.includes("correctAnswer") &&
    header.includes("correctionPrompt") &&
    header.includes("clozeAnswer");

  return rows.map(row => {
    let prompt = "";
    let wrongSentence = "";
    let incorrectPhrase = "";
    let correctPhrase = "";
    let choices = [];
    let explanation = "";
    let points = 1;

    if (isCurrentReviewCsv) {
      // Current TOEIC error-correction CSV:
      // id, section, sentence, correctAnswer(=誤り), choice1-3, correctionPrompt,
      // clozeAnswer(=修正後), hint, explanation, points
      wrongSentence = row[2] || "";
      incorrectPhrase = row[3] || "";
      prompt = row[7] || `「${incorrectPhrase}」を、より自然なTOEIC S&W表現に直してください。`;
      correctPhrase = row[8] || "";
      choices = [row[4], row[5], row[6], incorrectPhrase];
      explanation = row[10] || "";
      points = Number(row[11]) || 1;
    } else {
      // Legacy format support:
      // id, section, prompt, wrongSentence, incorrectPhrase, correctPhrase,
      // correctedSentence, distractor1-3, explanation, points
      prompt = row[2] || row[3] || "";
      wrongSentence = row[3] || row[2] || "";
      incorrectPhrase = row[4] || row[3] || "";
      correctPhrase = row[5] || row[6] || "";
      choices = [row[4], row[7], row[8], row[9]];
      explanation = row[10] || row[9] || "";
      points = Number(row[11]) || 1;
    }

    const cleanChoices = [...new Set(
      choices
        .map(choice => String(choice || "").trim())
        .filter(Boolean)
        .filter(choice => normalizeForCompare(choice) !== normalizeForCompare(correctPhrase))
        .filter(choice => normalizeForCompare(choice) !== normalizeForCompare(prompt))
    )];

    if (incorrectPhrase && !cleanChoices.some(choice => normalizeForCompare(choice) === normalizeForCompare(incorrectPhrase))) {
      cleanChoices.unshift(incorrectPhrase);
    }

    return {
      id: row[0],
      section: row[1],
      prompt,
      wrongSentence,
      incorrectPhrase,
      correctPhrase,
      answer: correctPhrase,
      choices: cleanChoices,
      explanation,
      points
    };
  }).filter(q => q.id && q.section && q.wrongSentence && q.incorrectPhrase && q.correctPhrase && q.choices.length > 0);
}

async function loadSentenceQuestions(files) {
  const all = [];
  for (const file of files) {
    const response = await fetch(file);
    if (!response.ok) {
      console.warn(`読み込み失敗: ${file}`);
      continue;
    }
    const text = await response.text();
    const rows = parseCSV(text);
    rows.shift();
    const loaded = rows.map(row => ({
      id: row[0],
      section: row[1],
      answer: row[2],
      prompt: row[3] || "",
      hint: row[4] || "",
      explanation: row[5] || "",
      points: Number(row[6]) || 1
    })).filter(q => q.id && q.section && q.answer);
    all.push(...loaded);
  }
  return all;
}

async function loadClozeQuestions(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。フォルダ名・ファイル名を確認してください。`);
    return [];
  }

  const text = await response.text();
  const rows = parseCSV(text);
  rows.shift();

  return rows.map(row => ({
    id: row[0],
    section: row[1],
    prompt: row[2],
    answer: row[3],
    hint: row[4] || "",
    explanation: row[5] || "",
    points: Number(row[6]) || 1
  })).filter(q => q.id && q.section && q.prompt && q.answer);
}

async function loadWritingTasks(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    alert(`${filePath} を読み込めませんでした。`);
    return [];
  }
  const text = await response.text();
  const rows = parseCSV(text);
  rows.shift();
  return rows.map(row => ({
    id: row[0],
    section: row[1],
    prompt: row[2],
    targetWords: row[3] || "120-150",
    memo: row[4] || ""
  })).filter(q => q.id && q.prompt);
}

