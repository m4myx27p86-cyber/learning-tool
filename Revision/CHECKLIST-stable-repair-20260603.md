# Stable Repair Checklist 2026-06-03

## 変更したファイル
- index.html
- css/game-ui-override.css
- js/game-ui-override.js
- js/material-progress.js
- js/growth.js
- js/main.js
- split-manifest.json
- static-checks.json

## 目的
- ログイン後に画面が動かない状態を避ける
- 前回反映できていた「木・十二支・ボス」ホームを安全に戻す
- 教材画面で Practice Settings / 総復習条件 / 問題一覧を維持する
- ボスは挑戦可能時だけ最上部バナーに表示する

## 触っていない機能
- CSV読み込みロジック
- 問題表示・採点ロジック
- Speaking Review本体
- 正解エフェクト本体
- 履歴保存ロジック
- GAS URL / GAS送信処理
- 教材カテゴリと教材キー

## 反映後チェック
- [ ] ログインできる
- [ ] 管理者ログイン 9999 が使える
- [ ] ホーム画面に木・十二支・ボスが表示される
- [ ] 「教材へ」で教材一覧が開く
- [ ] 教材カードを押すと教材画面へ進む
- [ ] Practice Settings に問題一覧ボタンがある
- [ ] 総復習条件を変更できる
- [ ] ボス未解放時に大きなボスカードが出ない
- [ ] ボス挑戦可能時に上部バナーが出る
- [ ] テスト開始が動く
- [ ] Speaking Review が動く
- [ ] 正解エフェクトが出る
- [ ] 履歴保存とGAS送信が維持される
