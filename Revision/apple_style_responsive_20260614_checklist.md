# Apple Style Responsive Pass Checklist (2026-06-14)

## Scope
- [x] Use Apple official site direction: light neutral background, large readable type, restrained color, generous spacing, and polished cards.
- [x] Do not add or depend on illustrations.
- [x] Keep existing material access, quiz start, review start, CSV loading, and progress logic unchanged.

## Layout
- [x] Remove illustration-heavy treatment from the material settings header.
- [x] Fix horizontal overflow by using flexible `minmax(0, ...)` grids and capped page width.
- [x] Simplify settings panels into Apple-like white/soft-gray cards.
- [x] Improve button hierarchy with blue primary, orange conditional practice, and purple review.
- [x] Add responsive behavior for PC, tablet, and smartphone widths.

## Verification
- [x] Confirm JS syntax still passes.
- [x] Confirm Polaris CSV loading still returns questions with body text.
- [x] Confirm material access and start/review button selectors are still present.
- [x] Confirm local HTTP delivery still works.
