# Yetkazib beruvchi (zavod) bonusi — frontend ulanishi uchun talab

Sana: 2026-10-08. Hujjat backend dasturchi uchun. Backend tavsifi bo'yicha reja to'g'ri, quyida frontend UI'ni
qaysi shartnomaga yozishi va tasdiqlanishi kerak bo'lgan savollar yig'ilgan.
(2026-10-08 holatida bonus uchun marshrut topilmadi: `supplier-bonuses`, `finance/supplier-bonuses`, `partners/...` va h.k. — hammasi `404`.)

## 1. Reja (backend tavsifi)

Yangi hujjat: **"Yetkazib beruvchi bonusi"** — sana, qaysi zavod (yetkazib beruvchi), summa, izoh. Tasdiqlanganda:

1. Shu zavodga bo'lgan qarzimiz bonus summasiga kamayadi (kassaga pul **kirmaydi**).
2. "Foyda va xarajat"da **daromad** sifatida ko'rinadi.
3. Chegirmalar hisobotida bitta qatorda: berilgan chegirmalar, olingan bonus va farqi (`bonus − chegirma`).
4. Xato kiritilsa, bekor qilish mumkin.

## 2. Tavsiya etilgan endpointlar (mavjud `cash-operations` uslubida)

| Metod | Yo'l | Izoh |
|---|---|---|
| GET | `/finance/supplier-bonuses` | Ro'yxat: `search`, `supplierId`, `status`, `dateFrom`, `dateTo`, `page`, `pageSize` |
| GET | `/finance/supplier-bonuses/{id}` | Bitta hujjat |
| POST | `/finance/supplier-bonuses` | Yaratish (qoralama) |
| PATCH | `/finance/supplier-bonuses/{id}` | Faqat `DRAFT` ni tahrirlash |
| POST | `/finance/supplier-bonuses/{id}/confirm` | Tasdiqlash |
| POST | `/finance/supplier-bonuses/{id}/cancel` | Tasdiqlanganini bekor qilish (qarz va daromad qaytariladi) |
| DELETE | `/finance/supplier-bonuses/{id}` | Faqat `DRAFT` ni o'chirish |

Hujjat maydonlari: `id`, `docNumber`, `date`, `supplierId`, `supplier{id,name}`, `amount`, `note`,
`status` (`DRAFT` \| `CONFIRMED` \| `CANCELLED`), `responsibleId`, `createdAt`, `confirmedAt`, `cancelledAt`.

## 3. Hisobotlarda frontend nimani kutadi

| Joy | Kerak |
|---|---|
| `GET /reports/income-expense` | `income.supplierBonus` (alohida maydon) va u `income.total` / `summary.netProfit` ga kirsin. Alohida bo'lsa "Zavod bonusi" qatori chiqadi; `otherIncome` ga qo'shilsa "Boshqa daromad" ichida ko'rinadi |
| `GET /reports/discounts` → `summary` | `totalBonus` (olingan bonus) va `bonusMinusDiscount` (`totalBonus − totalDiscount`) |
| `GET /reports/discounts` → `items` | Bonus yetkazib beruvchiga tegishli, mijozga emas: `groupBy=CUSTOMER` va `CASHIER` qatorlarida bonus **bo'lmasin**; `DAY`/`MONTH` qatorlarida `bonusAmount` bo'lishi mumkin |
| `GET /reports/counterparty-balance` (SUPPLIER) | Qarz bonus summasiga kamaygan holda chiqsin |

## 4. Aniqlashtirish kerak bo'lgan savollar

1. **Qarz nolga teng yoki bonus qarzdan katta bo'lsa nima bo'ladi?** Yetkazib beruvchi balansi manfiyga o'tadimi (zavod bizga qarzdor — avans)? Ruxsat berilsa shunday ko'rsatamiz, aks holda `400` va xato matni kerak.
2. **Daromad yoki tannarxdan chegirma?** Ko'pincha bonus zavoddan olingan tovar tannarxini kamaytiradi. "Boshqa daromad" sifatida yozilsa, **yalpi foyda** (`/reports/product-profit`) o'zgarmaydi, **sof foyda** (`/reports/income-expense`) bonusga oshadi. Ikkala hisobot orasidagi shu farq oldindan ma'lum bo'lsin.
3. **Bekor qilish:** bekor qilinganda qarz va daromad to'liq qaytariladimi? Bekor qilingan hujjat hisobotlarga kirmasligi kerak (audit logda qoladi).
4. **Valyuta:** bonus faqat so'mdami yoki USD ham bormi? (Frontendda valyuta almashtirgich bor.)
5. **Ruxsat:** kim yarata/tasdiqlaydi/bekor qiladi (tavsiya: ADMIN, DIREKTOR).
6. Davr "yopilgan" bo'lsa, o'tgan sanaga bonus kiritish mumkinmi?

## 5. Chegirmaning foizda kiritilishi (qaror)

Frontend (POS) kassirga chegirmani **so'mda yoki foizda** kiritishga ruxsat beradi, lekin foizni o'zi **so'mga aylantirib**
(`Σ sotuv summasi × foiz / 100`, butun so'mgacha yaxlitlab) backendga faqat so'mda `items[].discount` sifatida yuboradi.
Shu sababli backendga `discountPercent` maydoni **kerak emas**; so'm yagona manba bo'lib qoladi va hisobotlar bilan mos keladi.

## 6. "Mijoz bo'yicha" chegirmalar hisoboti

Frontend `GET /reports/discounts?groupBy=CUSTOMER` ni so'raydi. Javob oldingi shartnoma bilan bir xil
(`docs/chegirmalar-backend-spec.md`): har qatorda `key` (= mijoz id), `label` (= mijoz nomi), `salesCount`,
`discountedSalesCount`, `salesAmount`, `discountAmount` (so'mda) va `discountPct` (foizda).
Mijozsiz (donalik) sotuvlar bitta qatorda "Donalik mijoz" nomi bilan chiqsin.
