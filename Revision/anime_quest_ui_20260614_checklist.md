# Anime Quest UI Update Checklist 2026-06-14

## Goal
- [x] Bring the home/material/settings/result surfaces closer to the provided "AI Learning Quest" reference.
- [x] Keep the existing learning flows intact: login, access-code gating, material passwords, CSV loading, quiz rendering, scoring, local review, history export, Apps Script sync, calendar, feature flags, and Polaris3 passage handling.

## Visual Scope
- [x] Add a high-energy quest dashboard shell with dark ink, gold accents, blue panels, and card borders.
- [x] Restyle the home hero into a multi-panel quest board inspired by the reference.
- [x] Restyle material cards into colorful book/tile-like cards with clear category labels.
- [x] Add a fixed bottom quest navigation bar for home, materials, calendar, review/history, and settings/admin access.
- [x] Improve quiz/result/settings surfaces so they share the same quest visual language.
- [x] Keep mobile responsive behavior readable and avoid overlapping text.

## Preservation Checks
- [x] Do not change CSV file paths or parsing contracts.
- [x] Do not change scoring, answer checking, mistake storage, or history export logic.
- [x] Do not change Apps Script endpoint or sync behavior.
- [x] Do not remove existing feature visibility flags for learning tree, zodiac, or boss.
- [x] Do not break Polaris3 Lesson 7-12 order or passage display.
- [x] Preserve all existing buttons and IDs used by JS event handlers.

## Implementation
- [x] Add a new CSS override file loaded last.
- [x] Add a small JS enhancer only for decoration/navigation wiring.
- [x] Avoid replacing core HTML structure or quiz logic.
- [x] Use existing character/tree/boss assets where available.
- [x] Use generated CSS visuals instead of external dependencies.

## Verification
- [x] Static JS syntax checks pass.
- [x] Polaris3 loader still returns 342 questions and no empty passages.
- [x] HTTP local server can serve `index.html` and Polaris CSV.
- [ ] Manual browser check: home screen renders without blank/overlap. Blocked by in-app browser startup permission error.
- [ ] Manual browser check: material selection opens. Blocked by in-app browser startup permission error.
- [ ] Manual browser check: settings screen section select populates. Blocked by in-app browser startup permission error.
- [ ] Manual browser check: quiz start still works. Blocked by in-app browser startup permission error.
