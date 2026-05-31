# ポラリス3・統合ダッシュボード修正チェックリスト

## 変更したファイル
- [x] `index.html`
- [x] `script.js`
- [x] `style.css`

## 画面構成
- [x] 「演習設定」と「習得状況と総復習」を1つのカードに統合
- [x] 教材カード下の「進捗を見て始める」ボタンを削除
- [x] 統合画面内で「セクション」「問題数」「1問ごとの制限時間」「正解表示から次へ進むまで」を設定可能にした
- [x] 総復習にも、上記のセクション・問題数・制限時間・自動移動設定が反映されるようにした

## ポラリス3
- [x] 通常演習では `keepOrder: true` を尊重し、本文の流れどおりに出題
- [x] 総復習・ランダム練習でも、ポラリス3だけは問題順をシャッフルしないように調整
- [x] ポラリス3ではボタン文言を「選択範囲を順番に練習」に変更し、ランダム誤解を避ける
- [x] 本文表示を大きめ、設問表示を小さめに維持
- [x] Summary問題では、同じ本文ブロックのSummary文全体を表示
- [x] CSVに `summary` / `summaryText` / `fullSummary` / `summaryFullText` / `要約` / `サマリー` / `要約全文` 列がある場合も全文表示に利用

## Speaking Review / 誤り発見→修正
- [x] `speakingReview` の語順・二度押し回答処理には触れていない
- [x] `speakingErrorCorrection` の identify → correct の二段階処理には触れていない
- [x] CSV読み込み・採点・履歴保存の基本処理は維持

## デザイン
- [x] 操作ボタンを参考画像に近い黒系・シンプルな角丸デザインに統一
- [x] 選択肢ボタンの疑似Bulletは引き続き削除し、文字欠けを防止
- [x] 青は集中・背景、緑は習得・成長に使い分け
- [x] 木のイラスト以外の茶色系アクセントをできるだけ排除
- [x] スマホでは統合カードが1列で表示されるように調整

## 動作確認
- [x] `node --check script.js` で構文エラーなし
- [x] 既存ID（`startButton`, `sectionSelect`, `timeLimitSelect`, `autoNextDelaySelect`, `settingReviewRandomButton`, `settingReviewReviewButton`）を保持
- [x] 既存のイベント登録が壊れないよう、削除した総復習ステッパーは安全に無視される構成
