# CHECKLIST - Mockup Aligned v3 2026-06-03

## 変更目的
- 添付イラストに近いホーム画面・教材選択画面・教材画面へ寄せる。
- PC・タブレット・スマホで、Practice Settingsが潰れないようにする。
- 木のキャラをホーム画面と教材画面で統一する。
- 保存済みセッションからの自動復帰を戻す。

## 変更ファイル
- index.html
- css/game-ui-override.css
- js/game-ui-override.js
- js/main.js
- js/auth.js
- js/materials.js
- split-manifest.json
- static-checks.json
- assets/characters/*

## 触っていない機能
- GAS URL
- GAS送信処理
- CSV読み込み処理
- Speaking Reviewの出題・採点処理
- 正解エフェクト本体
- 履歴保存ロジック
- 教材カテゴリ・教材キー
- 管理者ログイン9999の判定

## 反映後チェック
- [ ] 保存済みセッションがある場合、再読み込み後にホームへ戻る
- [ ] ログアウト後はログイン画面に戻る
- [ ] 管理者ログイン9999が使える
- [ ] ホーム画面が添付イラスト風に、木・十二支・ボスの3カードで表示される
- [ ] 「教材へ」を押すまで教材一覧が出ない
- [ ] 教材カードにキャラ画像とレベル表示がある
- [ ] 教材カードから正しい教材画面に進める
- [ ] 教材画面の木がホーム画面と同じSVGになる
- [ ] 「正解表示から次へ進むまで」が潰れない
- [ ] Practice Settings内に問題一覧ボタンがある
- [ ] Practice Settings内に総復習の抽出条件がある
- [ ] ランダムで練習が動く
- [ ] 総復習が動く
- [ ] テスト開始が動く
- [ ] Speaking Reviewが動く
- [ ] 正解エフェクトが出る
- [ ] 履歴保存が残っている
- [ ] GAS送信が維持されている
- [ ] GitHub PagesでCSVが読み込まれる

## 注意
ブラウザのキャッシュが残りやすいため、反映後は Ctrl + F5 または Command + Shift + R で強制更新する。
