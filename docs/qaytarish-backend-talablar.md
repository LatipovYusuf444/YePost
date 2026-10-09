# Qaytarish (Return) — frontend va backend integratsiyasi

> Qaytarish sahifasi (6 bosqichli wizard, ro'yxat, tafsilot) real backend API'lariga ulangan; mock ma'lumotlar olib tashlangan.
> Frontend hech qanday summani o'zi hisoblamaydi va `CUSTOMER_REFUND` yoki boshqa kassa/moliya so'rovini yubormaydi:
> qoldiq, qarz va kassa harakatlarini backend `confirm` / `cancel` / `restore` da boshqaradi.

## Frontend ishlatadigan endpointlar

| Endpoint | Qayerda | Eslatma |
| --- | --- | --- |
| `GET /returns` | Ro'yxat | Ustunlar hujjat maydonlaridan olinadi |
| `GET /returns/{id}` | Tafsilot, 6-bosqich | `refundAmount`, `debtReduction`, `debtBefore`, `debtAfter` |
| `GET /sales/{saleId}/returnable-items` | 2-bosqich | Sotilgan / avval qaytarilgan / qolgan miqdor va narx |
| `POST /returns/preview` | 4–5-bosqich | Hech narsa saqlanmaydi; backend hisob-kitobi |
| `POST /returns` | 5-bosqich | DRAFT hujjat yaratadi |
| `POST /returns/{id}/confirm` | 5-bosqich, tafsilot | Qoldiq, qarz va kassani backend o'zi yangilaydi |
| `POST /returns/{id}/cancel`, `POST /returns/{id}/restore` | Tafsilot | Yangilashdan keyin faqat `GET` lar yuboriladi |
| `GET /returns/{id}/timeline` | Tafsilot | Haqiqiy tarix; xato bo'lsa xabar + "Qayta urinish" |

## Frontend kutayotgan kontrakt (YANGI endpointlar)

> Ogohlantirish: `returnable-items`, `preview` va `timeline` uchun repodagi `openapi.json` eskirgan (bu yo'llar yo'q).
> Quyidagi shakllar backend hisobotidagi maydon nomlari va shu hujjatdagi avvalgi taklif asosida yozilgan;
> haqiqiy backend javobi bilan solishtirib tasdiqlash kerak.

**`GET /sales/{saleId}/returnable-items`** → massiv:
`saleItemId`, `modificationId`, `soldQuantity`, `returnedQuantity`, `remainingQuantity`, `price` (son yoki satr).
Mahsulot nomi sotuv qatoridan (`saleItemId` bo'yicha) olinadi; javobda `modification{name, product{name}}` kelsa u ham ishlatiladi.

**`POST /returns/preview`**
- Request: `{ saleId, refundMethod, items: [{ saleItemId, quantity }] }`
- Response: `{ goodsValue, debtBefore, debtReduction, refundAmount, debtAfter, returnedQuantity? }`.
  Beshta summaning hammasi to'g'ri son bo'lmasa, frontend javobni qabul qilmaydi va tasdiqlashga yo'l qo'ymaydi.

**`GET /returns/{id}/timeline`** → massiv: `{ type, at, actor?{id, fullName}, payload?{quantity?, amount?} }`.
Tanilgan `type`lar: `CREATED`, `UPDATED`, `CONFIRMED`, `STOCK_RETURNED`, `DEBT_REDUCED`, `CANCELLED`, `RESTORED`;
boshqa tur kelsa ham voqea yashirilmaydi (turi o'qiladigan matnga aylantirib ko'rsatiladi).

**`POST /returns` (CreateReturnDto)**: `saleId, warehouseId, responsibleId, reason, restock, refundMethod, note, items[{saleItemId, modificationId, quantity, price}]`.
- `reason`: `CUSTOMER_CHANGED_MIND | NOT_SUITABLE | DEFECT | WRONG | OTHER` — endi to'g'ridan-to'g'ri yuboriladi
  (avval "Sabab: ..." izohga yozilar edi). `OTHER` uchun izoh majburiy (kamida 3 belgi).
- `note`: faqat foydalanuvchi izohi. Alohida `reasonComment` maydoni bo'lsa, frontend shunga o'tkaziladi.
- `price`: `returnable-items` dagi backend narxi (kelmasa shu sotuv qatorining narxi).

## Eski hujjatlar va null qiymatlar

- `debtBefore` / `debtAfter` eski hujjatlarda `null` bo'lishi mumkin: ro'yxat va tafsilotda **"Ma'lumot mavjud emas"** ko'rsatiladi (0 emas).
- `0` haqiqiy qiymat sifatida `0 so'm` ko'rsatiladi.
- Sotuvning HOZIRGI qarzi hujjatning tarixiy qarzi sifatida ishlatilmaydi.
- Qoralama hujjatda hisob-kitob kartasi yo'q ("tasdiqlangandan keyin backend chiqaradi"); bekor qilingan hujjatda ro'yxatda summa ustunlari "—".

## Hali tekshirilmagan / backenddan aniqlashtirish kerak

1. Uchta yangi endpointning real javob shakli (yuqoridagi ogohlantirish).
2. `reason` uchun yangi qiymatlarni (`CUSTOMER_CHANGED_MIND`, `NOT_SUITABLE`) `POST /returns` qabul qilishi.
3. `GET /returns` ro'yxatida `docNumber`, `customer`, `refundAmount`, `debtReduction`, `debtAfter` kelishi (kelmasa tegishli ustun "Ma'lumot yo'q").
4. Qoralama hujjat uchun preview kerak bo'lsa (hozir tafsilotda hisob-kitob ko'rsatilmaydi).
