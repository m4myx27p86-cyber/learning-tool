# 2026-05-26 update: Chapter-based theory ranges + cloze auto-check + sound + Enter/two-tap choices

## Replace these files in VS Code
- `index.html`
- `script.js`
- `style.css`

## Add / replace these data files
- `data/english_theory/sla_theory_map.csv`
- `data/english_theory/chapter3_theory.csv`
- `data/teacher/writing_theory_map.csv`

## Main changes
1. SLA理論とライティング理論の解答範囲を Chapter 単位に整理しました。
   - SLA: `SLA Chapter 3`, `SLA Chapter 4`
   - Writing: `Writing Chapter 4`
2. SLA理論・ライティング理論の四択問題を英語化し、問題画面に Source を表示するようにしました。
3. 四択問題は、選択肢を選んだ後に Enter キーで回答できます。
4. 四択問題は、同じ選択肢をもう一度押しても回答できます。
5. Speaking Review 穴埋めは、1語ずつ自動確認し、最後の語が正しく入力された時点で通常の正解表示に移ります。
6. 正解時に音が鳴る処理を復元しました。外部音声ファイルではなく、ブラウザの Web Audio API で短い成功音を生成します。
7. SNS風ニュース表示は、静的JSONではなく動的ニュース取得にする必要があるため、今回は実装していません。実装する場合は、Apps ScriptなどでニュースAPIを中継する形が安全です。

## GitHub Pages after update
VS Codeで差し替え後、いつもの流れで

```bash
git add .
git commit -m "Update study map chapter theory cloze sound and choice submit"
git push
```

を実行してください。
