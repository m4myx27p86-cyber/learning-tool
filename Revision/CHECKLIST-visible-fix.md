# Visible Game Home Fix Checklist

## 原因
- `index.html` は `script.js` ではなく `js/home-status.js` などの分割JSを読み込んでいます。
- 前回ZIPでは root の `script.js` 側の変更が中心になっていたため、分割版のホーム描画には十分反映されませんでした。
- 今回は `js/game-ui-override.js` を最後に読み込み、既存のホーム描画関数だけを後から上書きします。

## 追加ファイル
- `css/game-ui-override.css`
- `js/game-ui-override.js`

## 変更ファイル
- `index.html`

## 守ったもの
- ログイン処理: 変更なし
- 教材定義: 変更なし
- Speaking Review: 変更なし
- 正解エフェクト: 変更なし
- 履歴保存: 変更なし
- GAS送信: 変更なし
- GitHub Pages用CSV読み込み: 変更なし
- 採点ロジック: 変更なし

## 反映確認
1. `index.html` のCSS末尾付近に `css/game-ui-override.css` がある。
2. `index.html` のJS末尾付近に `js/game-ui-override.js` がある。
3. ホーム上部が「今日のクエスト」になり、木・十二支・ボスの3カードが表示される。
4. 「教材へ」を押すと教材一覧が表示される。
5. 「カレンダー」を押すと学習カレンダーが表示される。
