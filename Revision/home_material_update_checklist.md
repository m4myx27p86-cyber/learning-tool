# 学習サイト更新チェックリスト（2026-05-31）

## 今日の作業
- [x] ホーム画面に「教材へ」セクションを追加し、教材をカテゴリ別アコーディオンに格納
- [x] 各教材カードに「進捗・総復習」ボタンを残し、教材ごとに総復習ダッシュボードへ入れる構成を維持
- [x] ホーム画面にお知らせバナーを追加
  - 表示文言：「スプレッドシートへの送信の画面の変更：一問ずつ送信されるようになりました！」
- [x] Apps Script の status を画面上で確認し、appendAnswerRecord / submitQuizSummary 対応を判定する処理を追加
- [x] USE_LOCAL_ONLY を false に変更し、端末内保存 + 1問ごとの Apps Script 送信形式に変更
- [x] fetch の no-cors 送信を text/plain に変更し、Apps Script doPost で JSON を受け取りやすく調整
- [x] ホーム画面に学習継続カレンダーを追加
- [x] 正解数に応じて成長する植物・根のホーム表示を維持
- [x] 連続正解3問以上で、より強調されたコンボ表示を追加
- [x] 回答終了後の結果画面をカード型・ヒーロー型に変更
- [x] iPhone風フォント指定を維持
- [x] スマホ・PCの両方で表示しやすいレスポンシブCSSを追加

## 機能保持チェック
- [x] 管理者ログイン 9999
- [x] 学習者コードログイン
- [x] Google Sheets / Apps Script による学習者コード管理
- [x] 管理者の学習者コード発行
- [x] 管理者の教材変更ボタン
- [x] 許可教材だけを表示
- [x] 1教材のみ許可された学習者は直接教材画面へ移動
- [x] 教材パスワード方式も従来方式として保持
- [x] パスワード表示・非表示切替
- [x] TOEIC / TOEFL / 高校英語 / 英検 / 古文 / 教師用問題のカテゴリ保持
- [x] Stock 3000
- [x] 速読英単語
- [x] ターゲット1900
- [x] ポラリス3 Lesson 7〜12
- [x] TOEFL語順並べ替え
- [x] 英検準一級 接続詞対策
- [x] 英検準一級 Writing 提出
- [x] TOEIC S&W モニター練習
- [x] TOEIC Speaking 復習（語順並べ替え）
- [x] TOEIC Speaking 復習（穴埋め）
- [x] TOEIC Speaking 復習（誤り発見→修正）
- [x] Phrasal Verbs / 実用チャンク
- [x] 英語教育理論
- [x] 統計：基礎概念確認
- [x] ライティング理論 Chapter 4
- [x] ライティング理論 詳細マップ
- [x] プレゼン作成トレーニング
- [x] 古典単語
- [x] 古典文法
- [x] 古文常識
- [x] 四択問題
- [x] 語順並べ替え問題
- [x] 穴埋め問題
- [x] 誤り発見→修正問題
- [x] Writing提出
- [x] 問題数選択
- [x] セクション選択
- [x] 制限時間選択
- [x] 正解表示から次へ進むまでの時間選択
- [x] Enterキー回答
- [x] 四択の二度押し回答
- [x] Speaking Review語順問題のスマホキーボード非表示
- [x] 正解音・不正解音
- [x] 正解エフェクト
- [x] 連続正解表示
- [x] 間違い履歴保存
- [x] 間違えた問題を復習
- [x] 今回のミスを解き直す
- [x] 管理者の解答履歴画面
- [x] 履歴CSV出力
- [x] 端末内 localStorage 保存
- [x] Apps Script への1問ごと送信
- [x] テスト概要の最後の送信
- [x] 学習者ごとの個別シート作成に対応するApps Scriptファイルを同梱

## Apps Script反映チェック
- [x] フロントエンド側では GAS_WEB_APP_URL が設定されている
- [x] フロントエンド側では USE_LOCAL_ONLY=false になっている
- [x] フロントエンド側では USE_PER_QUESTION_SYNC=true になっている
- [x] フロントエンド側では appendAnswerRecord を1問ごとに送る
- [x] フロントエンド側では submitQuizSummary を結果画面で送る
- [x] 同梱 Apps Script には status / appendAnswerRecord / submitQuizSummary / Learner_<studentId> 個別シート作成が含まれる
- [ ] 実際のGoogle Apps ScriptのWebアプリURLに最新コードがデプロイされているかは、こちらの実行環境から外部接続できなかったため未確認
- [ ] サイト上のお知らせバナーで status features を確認し、OK表示になるか確認する

## 現時点のサイトの注意点・問題
- [ ] no-cors送信はブラウザ側でレスポンス本文を読めないため、1問ごとの送信成功を完全には画面で検証できない
- [ ] Apps Scriptを更新しても「新しいデプロイ」または「デプロイを管理→新バージョン」しないと、サイト側には反映されない
- [ ] GitHub PagesではCSVファイルのパス・大文字小文字が違うと教材が読み込めない
- [ ] localStorageは端末・ブラウザごとの保存なので、別端末では同じ履歴を参照できない
- [ ] 履歴が増えすぎるとlocalStorage容量に近づく可能性があるため、定期的なCSV出力またはスプレッドシート送信が望ましい
- [ ] 管理者パスワード9999はコード内にあるため、本格運用では変更またはサーバー側認証化が望ましい
- [ ] GAS_WEB_APP_URLが公開範囲「全員」または必要なユーザーに公開されていない場合、学習者コード照合や送信が失敗する
- [ ] 外部接続不可の環境では、画面上のApps Script確認表示が警告になることがある

## 動作確認
- [x] script.js の構文確認：node --check 通過
- [x] index.html に新規IDが存在：syncNoticeBanner / appsScriptStatusText / learningCalendarHomeArea / materialShelf / scrollToMaterialsButton
- [x] script.js で新規IDを参照：renderSyncNotice / checkAppsScriptIntegration / renderHomeLearningCalendar
- [x] style.css に新規表示のレスポンシブCSSを追加
