# Qaytarish (Return) — frontend va backend integratsiyasi

> Qaytarish sahifasi (6 bosqichli wizard, ro'yxat, tafsilot) real backend API'lariga ulangan; mock ma'lumotlar olib tashlangan.
> Frontend hech qanday summani o'zi hisoblamaydi va `CUSTOMER_REFUND` yoki boshqa kassa/moliya so'rovini yubormaydi:
> qoldiq, qarz va kassa harakatlarini backend `confirm` / `cancel` / `restore` da boshqaradi.
> Barcha javoblar standart envelope (`{ data }`) ichida; sonlar ko'pincha satr ("7500000") ko'rinishida keladi.

## Frontend ishlatadigan endpointlar

| Endpoint | Qayerda | Eslatma |
| --- | --- | --- |
| `GET /returns` | Ro'yxat | Ustunlar hujjat maydonlaridan olinadi |
| `GET /returns/{id}` | Tafsilot, 6-bosqich | `refundAmount`, `debtReduction`, `debtBefore`, `debtAfter`, `reasonComment` |
| `GET /sales/{saleId}/returnable-items` | 2-bosqich | Sotilgan / avval qaytarilgan / qolgan miqdor, narx va `unitValue` |
| `POST /returns/preview` | 4–5-bosqich va qoralama tafsiloti | Hech narsa saqlanmaydi; backend hisob-kitobi |
| `POST /returns` | 5-bosqich | DRAFT hujjat yaratadi |
| `PATCH /returns/{id}` | Qoralamani tahrirlash | `reason`, `reasonComment`, `note`, `items` |
| `POST /returns/{id}/confirm` | 5-bosqich, tafsilot | Qoldiq, qarz va kassani backend o'zi yangilaydi |
| `POST /returns/{id}/cancel`, `POST /returns/{id}/restore` | Tafsilot | Yangilashdan keyin faqat `GET` lar yuboriladi |
| `GET /returns/{id}/timeline` | Tafsilot | Haqiqiy tarix; xato bo'lsa xabar + "Qayta urinish" |

## Real javob shakllari (backend tasdiqlagan)

**`GET /sales/{id}/returnable-items`** → `[{ saleItemId, modificationId, soldQuantity, returnedQuantity, remainingQuantity, price, unitValue }]`.
Frontend `price` ni "Narxi" sifatida ko'rsatadi, hujjat yaratishda `price` ga `unitValue` (kelmasa `price`) yuboradi;
`unitValue` narxdan farq qilsa qatorda "Qaytarish qiymati" ko'rsatiladi. Mahsulot nomi sotuv qatoridan (`saleItemId` bo'yicha) olinadi.

**`POST /returns/preview`**
- Request: `{ saleId, refundMethod, items: [{ saleItemId, quantity }] }`
- Response: `{ goodsValue, debtBefore, debtReduction, refundAmount, debtAfter, returnedQuantity, currency }`
  (misol: 3 dona → `4500000 / 3500000 / 3500000 / 1000000 / 0 / "3" / "UZS"`).
  Beshta summaning hammasi to'g'ri son bo'lmasa, frontend javobni qabul qilmaydi va tasdiqlashga yo'l qo'ymaydi.

**`GET /returns/{id}/timeline`** → `[{ type, at, actor?{id, fullName}, metadata? }]`.
`type`: `CREATED`, `CONFIRMED`, `DEBT_UPDATED` (`metadata: { debtBefore, debtReduction, debtAfter }`),
`REFUND_COMPLETED` (`metadata: { amount, method }`), ... Noma'lum tur ham yashirilmaydi (o'qiladigan matn bilan ko'rsatiladi).

**`POST /returns`**: `saleId, warehouseId, responsibleId, reason, reasonComment, restock, refundMethod, note, items[{saleItemId, modificationId, quantity, price}]`.
- `reason`: `DEFECT | WRONG | OTHER | CUSTOMER_CHANGED_MIND | NOT_SUITABLE` (to'g'ridan-to'g'ri yuboriladi).
- `reasonComment`: sabab izohi (`OTHER` uchun majburiy, kamida 3 belgi). `note` ga qo'shilmaydi.

## Eski hujjatlar va null qiymatlar

- `debtBefore` / `debtAfter` eski hujjatlarda `null` bo'lishi mumkin: ro'yxat va tafsilotda **"Ma'lumot mavjud emas"** ko'rsatiladi (0 emas).
- `0` haqiqiy qiymat sifatida `0 so'm` ko'rsatiladi.
- Sotuvning HOZIRGI qarzi hujjatning tarixiy qarzi sifatida ishlatilmaydi.
- Qoralama hujjatda snapshot bo'sh, shuning uchun tafsilotdagi hisob-kitob kartasi `POST /returns/preview` dan olinadi ("Oldindan ko'rish" belgisi bilan).
  Bekor qilingan hujjatda ro'yxatdagi summa ustunlari "—".

## Hali tekshirilmagan

1. Haqiqiy kassa chiqimi (aynan `7 500 000`) va "takroriy `CUSTOMER_REFUND` yo'q" — faqat backend/kassa tomonida tekshiriladi;
   frontend bunday so'rov yubormasligi mock testda tasdiqlangan.
2. `unitValue` va `price` farqi: hujjat summasi (`totalAmount`) va preview `goodsValue` mos kelishi.
3. Tarixda boshqa `type`lar (`CANCELLED`, `RESTORED`, ...) kelsa nomlari: hozir tanilganlari tarjima qilingan, qolganlari matn ko'rinishida chiqadi.
