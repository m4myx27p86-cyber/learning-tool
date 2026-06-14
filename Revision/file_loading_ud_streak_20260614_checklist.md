# File Loading / UD Colors / Streak Screen Checklist 2026-06-14

## Requests
- [x] Fix the issue where question files cannot be read across materials.
- [x] Adjust the new quest UI colors for universal design and readability.
- [x] Replace the calendar feature with a consecutive-login / consecutive-learning-days view.

## Preservation
- [x] Keep all material IDs, button IDs, and event handlers intact.
- [x] Keep CSV paths and question data files unchanged.
- [x] Keep scoring, answer checking, history, local review, and Apps Script sync behavior unchanged.
- [x] Keep Polaris3 order and passage display unchanged.

## Implementation
- [x] Add a shared text fetch helper for all local question/data files.
- [x] Show a clear message when the page is opened as `file://` and CSV fetch is blocked.
- [x] Avoid garbled error alerts for missing question files.
- [x] Add a UD/readability override to the quest UI color layer.
- [x] Change the bottom nav and calendar action wording to streak/continuous learning.
- [x] Replace `openCalendar()` output with streak information instead of TOEIC calendar JSON.

## Verification
- [x] JS syntax checks pass.
- [x] Polaris3 loader returns 342 questions and 0 empty passages.
- [x] HTTP server can serve `index.html` and sample CSV.
- [x] Calendar nav opens the streak screen without fetching `toeic_calendar.json`.
- [x] Diff does not alter core scoring/checking/sync functions.

## Data Notes
- [ ] `data/vocab/target_1900.csv` currently contains only a header row, so it loads as 0 questions until data rows are added.
- [ ] `data/speaking_review/phrasal_verbs.csv` is referenced by config but is not present in the workspace.

## Follow-up 2026-06-14: Unselected UI Contrast
- [x] Review screenshots showing unselected material cards and material header with dark text on dark blue.
- [x] Add a final CSS contrast repair for unselected cards, dark headers, bottom nav, and progress labels.
- [x] Keep the existing UI structure and event handlers unchanged.
- [x] Verify JS syntax remains valid.
