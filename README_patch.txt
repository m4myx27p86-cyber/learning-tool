学習者コード別 機能ON/OFF パッチ（2026-06-05）
================================================

目的
----
学習者コードごとに、以下の3機能をON/OFFできるようにしました。

- 学習の木
- 十二支
- ボス

反映内容
--------
1. 管理者の「学習者コード発行・確認」画面に、3機能のチェック欄を追加しました。
2. コード発行時に learningTreeEnabled / zodiacEnabled / bossEnabled をApps Scriptへ送信します。
3. 発行済みコード一覧でも3機能のON/OFFを確認・切り替えできます。
4. ログイン時にApps Scriptから featureFlags を受け取り、localStorageへ保存します。
5. 学習者画面ではOFFの機能を非表示にします。
6. ボスOFF時は、ボス表示だけでなくボス挑戦開始・結果表示も止めます。
7. 既存コードや古いシートで3列が空欄の場合は、すべてON扱いにします。

置き換え・配置
--------------
GitHub Pages側:
- index.html
- js/config.js
- js/auth.js
- js/materials.js
- js/admin-access.js
- js/growth.js
- js/material-progress.js
- js/quiz-start.js
- js/results-sync.js
- js/game-ui-override.js
- css/access-category-writing.css
- css/game-ui-override.css

単一ファイル版を使っている場合:
- script.js
- style.css

Apps Script側:
- apps_script/Code.gs の内容をApps Scriptエディタへ貼り替えてください。
- デプロイは新しいバージョンとして再デプロイしてください。

スプレッドシート側:
- spreadsheet/learning_tool_feature_flags.xlsx では AccessCodes に以下の列を追加済みです。
  - J: learningTreeEnabled
  - K: zodiacEnabled
  - L: bossEnabled
- Google Sheets本番版でも AccessCodes の末尾に同じ3列を追加してください。
- 既存行は TRUE/空欄どちらでもON扱いです。明示的にOFFにしたい場合は FALSE にします。

検証
----
- 分割JS全体、script.js、Apps Script用Code.gsで node --check 済みです。
- learning_tool_feature_flags.xlsx の AccessCodes!A1:L10 を確認し、J:L列を追加済みです。
- Excel内の代表的なエラー文字列（#REF! / #VALUE! など）は検出されませんでした。
