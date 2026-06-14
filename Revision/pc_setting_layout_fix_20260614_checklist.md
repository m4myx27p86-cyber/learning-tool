# PC Setting Layout Fix Checklist (2026-06-14)

## Scope
- [x] Fix the PC layout collapse reported in the screenshot.
- [x] Keep existing material access, quiz start, review start, CSV loading, and progress logic unchanged.
- [x] Preserve the Apple-like simple visual direction.

## Fixes
- [x] Contain the settings panel inside the right card on PC.
- [x] Prevent `vocabReviewArea` from overflowing horizontally.
- [x] Force the normal start and review buttons to stay horizontal and inside their parent card.
- [x] Keep tablet and smartphone layouts stacked.

## Verification
- [x] Confirm JS syntax still passes.
- [x] Confirm Polaris CSV loading still returns questions with body text.
- [x] Confirm material access and start/review button selectors are still present.
- [x] Confirm local HTTP delivery still works.
