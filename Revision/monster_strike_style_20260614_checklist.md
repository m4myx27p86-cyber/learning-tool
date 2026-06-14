# Monster Strike Style Pass Checklist (2026-06-14)

## Scope
- [x] Use the official Monster Strike site reference for visual direction: light page base, bold red angled bands, rounded content cards, colorful section headers, and dark bottom navigation.
- [x] Keep the change primarily visual so quiz logic, CSV loading, scoring, local history, and sync behavior are not changed.
- [x] Preserve readable universal-design contrast for unselected cards and screen headers.

## Material Access Guardrails
- [x] Keep `button.material-card[data-material]` as the clickable material entry.
- [x] Keep `openMaterial()` and existing access checks untouched.
- [x] Keep the learner-code/admin bypass and legacy material password path untouched.
- [x] Keep the continuous login/streak utility card available from the material area.

## Implementation
- [x] Add a final CSS-only Monster Strike inspired polish pass in `css/anime-quest-ui.css`.
- [x] Update the cache-busting query string in `index.html` so the new style loads.
- [x] Avoid changing material data definitions, CSV paths, or problem loaders.

## Verification
- [x] Confirm JS syntax still passes.
- [x] Confirm Polaris CSV loading still returns questions with body text.
- [x] Confirm the local server can still serve `index.html`, CSS, and a Polaris CSV.
- [x] Confirm material access selectors are still present after the style pass.
