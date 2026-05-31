# A Learning Tool - Target / Boss Layout Fix

## 更新内容

教材画面で発生していた次の2点だけを修正しました。

1. 「対象」欄を教材画面から削除しました。
2. ボスカードが狭い列に押し込まれて、ボタン文言が切れる問題を修正しました。

## 置き換える主なファイル

- `index.html`
- `css/material-screen-brushup.css`
- `style.css`（単体CSS運用・保険用）
- `split-manifest.json`
- `static-checks.json`

JSファイル、CSVファイル、問題判定ロジックは変更していません。

## VS Codeでの確認順

1. このZIPを別フォルダに展開します。
2. VS Codeで展開したフォルダを開きます。
3. `index.html` を Live Server などで開きます。
4. 管理者ログイン `9999` → 教材一覧 → ポラリス3 / Speaking Review などを確認します。
5. 教材画面で「対象」カードが表示されないことを確認します。
6. ボスカードが横にはみ出さず、ボタン文言が切れないことを確認します。

## 版

split-target-boss-fix-20260531
