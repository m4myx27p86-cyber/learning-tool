# CHECKLIST: 漫画風UI復元・教材画面整理（2026-06-03）

## 変更したファイル
- `index.html`
  - `css/game-ui-override.css?v=restore-game-ui-20260603` を追加
  - `js/game-ui-override.js?v=restore-game-ui-20260603` を追加
- `css/game-ui-override.css`
  - ホーム画面の漫画風カード表示を復元
  - 教材選択カードを白基調・漫画風に調整
  - 教材画面のボスバナー、Practice Settings、総復習条件を整理
  - 横画面・スマホ画面用のレスポンシブ調整を追加
- `js/game-ui-override.js`
  - ホームの木・十二支・ボス表示を上書き
  - 教材画面で、ボス表示を最上部バナーへ移動
  - Practice Settings内に問題一覧ボタンと総復習条件をまとめる
  - 木・十二支・ボスを画像キャラクターに差し替える
- `assets/characters/*`
  - 木・十二支・ボスのSVG画像

## 変更していない重要機能
- [ ] ログイン処理
- [ ] 教材アクセス制限・教材表示ロジック
- [ ] Speaking Reviewの問題生成・採点
- [ ] 正解エフェクト本体
- [ ] 履歴保存ロジック
- [ ] GAS送信処理
- [ ] GitHub Pages用CSV読み込み処理
- [ ] 問題データCSV

## 反映確認
- [ ] `index.html` の `<head>` に `css/game-ui-override.css` がある
- [ ] `index.html` の最後のscript群に `js/game-ui-override.js` がある
- [ ] VS Code上で `css/game-ui-override.css` と `js/game-ui-override.js` が実際にフォルダ内にある
- [ ] `assets/characters/boss.svg` と `assets/characters/tree.svg` がある
- [ ] ブラウザをハードリロードして確認する
- [ ] ホームに木・十二支・ボスが横並び/カード形式で表示される
- [ ] 教材画面の最上部にボスバナーが表示される
- [ ] Practice Settings内に「問題一覧」ボタンがある
- [ ] 総復習の抽出条件がPractice Settings近くに表示される
- [ ] テスト開始、ランダム練習、総復習が動作する

## 注意
この更新は「後読みの上書きファイル」を追加する方式です。既存の採点やCSV読み込みの中核ファイルは直接書き換えていません。
