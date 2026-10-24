# Cash reports currency alignment

Goal: implement the supplied backend contract without converting or combining UZS and USD.

The user's API specification is the design authority. Keep the current React/Vite/API architecture and existing payment mutations. Work in the current checkout so changes are directly reviewable; do not publish or change backend data.

- [x] Preserve transaction currency and envelope summary, including pagination; keep existing array-returning callers compatible.
- [x] Use cash-flow summary.byCurrency for dual-currency cards; add a currency selector to the existing matrix/details, retain backend balances, send calendar dates, export without currency.
- [x] Add kassa date/currency filters and backend totals matching the selected payment channel/direction/search; retain operation metadata and draft/cancelled document management.
- [x] Add /hisobotlar/kunlik-kassa with timezone-aware defaults, maximum 400 inclusive days, signed daily payment totals, separate balances and an independent today request using the same branch/payment filters.
- [ ] Verify currency separation, server summaries across pages, preserved opening balances, date validation, zero-activity days, and existing tests/build/lint. Check available live backend access and state its limits.

Review focus: USD cents and negative amounts; UTC midnight/Tashkent day boundaries; stale responses after filter changes; missing summaries must never fall back to page totals; confirmed cash operations must not be duplicated or independently reintroduced into the finance ledger.

Review and verification ledger:
- Existing suite passed: 419 tests before the new API/page cases; production build and repository lint passed before final review fixes.
- Final review found K-number lookup regression, browser-timezone presets, and reordering of server running balances. All three were reproduced in page tests before fixes, then the five page tests passed.
- Ruling: local K-number lookup uses selected-period server totals labeled "Davr jami". Backend knows original document numbers, not UI-generated K numbers, and exposes no transaction-ID summary filter. Ordinary text searches remain server-filtered with matching summary. Cost if this choice is unsuitable: K-number lookup totals describe the selected period rather than just locally matched rows; the label makes this explicit and no currency totals are fabricated.
- Live validation limitation: configured backend returned HTTP 401 for an unauthenticated cash-daily GET. No authenticated session for this project is available; actual backend arithmetic, exclusions, XLSX contents and write workflows were not exercised against production data. Local API and page tests cover the stated response contract and preserve existing mutation handlers.
