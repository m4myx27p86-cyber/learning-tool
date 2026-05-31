# Polaris3 本文全文表示 修正チェックリスト

## 今回の修正方針

- ポラリス3の本文が途中で切れて見える問題を、CSSだけで修正する。
- 本文カード内だけのスクロールをやめ、ページ全体のスクロールで本文全体を読めるようにする。
- `index.html` と `script.js` は触らない。
- ポラリス3の本文表示ロジック、問題順固定、Summary表示、Speaking Review、誤り発見→修正問題の機能は変更しない。

## 修正内容

- [x] `.polaris-passage-card` の `max-height` を解除
- [x] `.polaris-passage-card` の `overflow` を `visible` に変更
- [x] `.polaris-passage-body` の `max-height` を解除
- [x] `.polaris-passage-body` の内部スクロールを解除
- [x] ポラリス3の時だけ、ページ全体でスクロールできるように調整
- [x] スマホでは本文フォントを少しだけ小さくして読みやすく調整
- [x] 問題カードとの境目を控えめに整理
- [x] 選択肢・判定・二度押し・正解エフェクトには変更なし

## 反映後チェック

- [ ] VS Codeで `style.css` だけ置き換える
- [ ] GitHubにcommit / pushする
- [ ] GitHub Pagesを開いて `Ctrl + F5` で強制更新する
- [ ] ポラリス3 Lesson 11 を開く
- [ ] 本文が途中で切れず、ページ全体をスクロールして最後まで読める
- [ ] 設問カードと選択肢が本文の下に表示される
- [ ] Summary問題でサマリー全文が表示される
- [ ] Speaking Reviewの誤り発見→修正問題が壊れていない
