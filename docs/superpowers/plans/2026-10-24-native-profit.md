# Native-currency profit alignment

The supplied cash requirements remain the contract. Existing cash-flow, finance summary and daily cash integrations will be verified without unrelated changes. Preserve the in-progress sales card flip changes.

Live product-profit response inspected in the authenticated local app. Legacy revenueUzs/revenueUsd etc remain converted equivalents. New authoritative fields are summary.bySaleCurrency.UZS/USD (qtySold, checks, revenue, cost, profit, marginPct), items[].bySaleCurrency.UZS/USD (qty, checks, revenue, cost, profit, marginPct), items[].costMissing (boolean), summary.costMissing ({count,revenue:{UZS,USD}}), and costMissingItems. Existing topProfit/lossItems remain legacy converted amounts and must not rank native currency profits.

- [x] Add regression cases using the observed response: legacy converted totals differ from native totals, mixed product rows, separate margins, absent currency groups, missing cost and genuine zero cost.
- [x] Adapt only the profit model/UI: prefer bySaleCurrency, retain old-response support, always show separate UZS/USD totals and margins, select one native currency for table/rankings, flag missing costs and exclude those rows from rankings. Do not apply exchange rates in frontend.
- [x] Keep filters/search/pagination/export working; send calendar dates with Tashkent defaults. Do not change sales creation/customer preferences or existing accounting data.
- [x] Verify all cash screens against the authenticated server, API/page tests, full regression suite, lint/typecheck/build, and browser rendering. Remove temporary diagnostic UI/logging.

Review focus: backend summary rather than paginated row totals; no false 100% margin for missing cost; product present in both sale currencies; USD-only row not falling back to UZS; old response behavior; search and sort use selected native currency; no mutation of sales or customer records.

Verification ledger:
- Authenticated browser: native profit summary, selected-currency table, cash-flow dual-currency cards, daily report zero-activity days and closing balances, kassa dual summary and currency selection.
- Read actual XLSX response bytes for cash-flow and product-profit. Cash-flow has Valyuta, separate UZS/USD amount and running-balance columns, and CASH/CARD/BANK/total income/expense rows. Product-profit includes distinct original-sale-currency revenue/cost/profit columns and the missing-cost flag. Temporary workbook inspection and raw-contract diagnostics were removed.
- Review found one missing-cost warning scope issue for local customer search; reproduced as failing UI test, then fixed. No deferred findings.
- Full suite passed: 437/437 tests. Lint/typecheck and production build passed; final verification rerun after removing diagnostics.
- Live environment had no missing-cost records; missing-cost rendering, exclusion and genuine zero cost were verified with targeted regression fixtures. No accounting data, customer currency preference or sale was changed.
