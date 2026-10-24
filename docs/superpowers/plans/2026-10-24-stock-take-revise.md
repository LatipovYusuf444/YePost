# Confirmed stock take revision implementation plan

Goal: implement the supplied 24.10 backend contract and push both fixes to main.

Architecture: reuse the inventory creation form with an edit snapshot. Send one atomic POST /inventory/stock-takes/:id/revise, retain updatedAt for concurrency, lock warehouse/date, and refresh document and stock caches. Keep the existing creation flow.

Spec: user-supplied backend contract, 24.10.2026. React, TypeScript, Zustand, Axios; no generated API client package exists in this repository.

- [x] Test the API request, exact quantities (100 → 90, zero, fractions), row replacement, roles, and original system quantities.
- [x] Add typed revise API and store action; retain document on errors and show movement details/document_changed.
- [x] Prefill the existing form from the confirmed detail, lock warehouse/date, save through revise only, and reopen refreshed details/history.
- Finalization: verify donalik change, inventory tests, lint, build; fetch main, commit, push, and verify clean synchronization.

Validation: 417 tests pass, changed-source ESLint passes. Independent review found an earlier-excess cash edge case; corrected with two regression tests. Browser unavailable during this turn; no live inventory or payment was mutated for testing.

Review focus: missing catalog rows; concurrent edits; failed stock refresh after successful revision; double submission; cancel without mutation.
