/* =========================
   API
========================= */

function apiGetJsonp(action, params = {}) {
  return new Promise((resolve, reject) => {
    if (!GAS_WEB_APP_URL) {
      reject(new Error("GAS_WEB_APP_URL が未設定です。"));
      return;
    }

    const callbackName = `jsonpCallback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const url = new URL(GAS_WEB_APP_URL);

    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) url.searchParams.set(key, value.join(","));
      else url.searchParams.set(key, value == null ? "" : String(value));
    });

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Apps Scriptから応答がありません。デプロイ設定を確認してください。"));
    }, 15000);

    window[callbackName] = data => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error("Apps Scriptへの接続に失敗しました。"));
    };

    function cleanup() {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

async function apiPostNoCors(payload) {
  if (!GAS_WEB_APP_URL) return false;
  await fetch(GAS_WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return true;
}

