/* =========================
   ホーム画面：お知らせ・Apps Script確認
========================= */

function renderSyncNotice(status = "checking", details = "") {
  const banner = document.getElementById("syncNoticeBanner");
  const statusText = document.getElementById("appsScriptStatusText");
  if (!banner || !statusText) return;
  banner.classList.remove("notice-ok", "notice-warn", "notice-local");
  if (USE_LOCAL_ONLY) {
    banner.classList.add("notice-local");
    statusText.textContent = "現在はlocalStorage保存のみです。スプレッドシート送信を使う場合は USE_LOCAL_ONLY=false にしてください。";
    return;
  }
  if (status === "ok") {
    banner.classList.add("notice-ok");
    statusText.textContent = details || "Apps Scriptは appendAnswerRecord / submitQuizSummary に対応しています。";
    return;
  }
  if (status === "warn") {
    banner.classList.add("notice-warn");
    statusText.textContent = details || "Apps Scriptの最新反映を確認できませんでした。Webアプリを新しいバージョンで再デプロイしてください。";
    return;
  }
  statusText.textContent = "Apps Scriptの反映状況を確認中です。";
}

async function checkAppsScriptIntegration() {
  if (USE_LOCAL_ONLY || !GAS_WEB_APP_URL) {
    renderSyncNotice("warn", "GAS_WEB_APP_URLが未設定、またはlocalStorage保存のみの設定です。");
    return;
  }
  try {
    const result = await apiGetJsonp("status");
    const features = Array.isArray(result?.features) ? result.features : [];
    const hasPerQuestion = features.includes("appendAnswerRecord") || features.includes("quizAnswer");
    const hasSummary = features.includes("submitQuizSummary") || features.includes("quizSummary");
    if (result?.ok && hasPerQuestion && hasSummary) {
      renderSyncNotice("ok", "反映確認OK：1問ごとの送信と結果概要の保存に対応しています。");
    } else if (result?.ok) {
      renderSyncNotice("warn", "GASは応答していますが、1問ごと送信のfeaturesが確認できません。最新Apps Scriptを再デプロイしてください。");
    } else {
      renderSyncNotice("warn", result?.error || "GASのstatus応答が不正です。");
    }
  } catch (error) {
    renderSyncNotice("warn", "この画面からApps Scriptへ接続確認できませんでした。デプロイURL・公開範囲・新バージョン反映を確認してください。");
  }
}

function getComboMessageHtml(streak) {
  if (streak >= 10) return `<div class="combo-message super"><strong>${streak}連続正解！</strong><span>かなり強い集中が続いています。ここで一度深呼吸して、正確さを維持しましょう。</span></div>`;
  if (streak >= 5) return `<div class="combo-message"><strong>${streak}連続正解！</strong><span>知識の根が一気に伸びています。次の1問も落ち着いていきましょう。</span></div>`;
  return `<div class="combo-message light"><strong>${streak}連続正解</strong><span>よい流れです。使える知識として定着し始めています。</span></div>`;
}

