# Qaytarish (Return) sahifasi — backendga kerak bo'ladigan ma'lumotlar

> Holat: frontend qayta dizayn qilindi (6 bosqichli wizard, yangi ro'yxat, tafsilot + jarayon tarixi).
> **Backend, API endpointlar, request/response kontraktlari va moliya logikasi O'ZGARTIRILMAGAN.**
> Backendda hali yo'q ma'lumotlar `src/Pages/Savdo/qaytarish/mockReturnData.ts` ichida namunaviy (mock) qilingan.
> Backend tayyor bo'lgach faqat shu fayldagi funksiyalar real API javobiga almashtiriladi.

## Hozirgi (o'zgarmagan) oqim

1. `POST /returns` — hujjat (DRAFT) yaratiladi. Payload: `saleId, warehouseId, responsibleId, reason (DEFECT|WRONG|OTHER), restock, refundMethod (CASH|CARD|BALANCE|NONE), note, items[{saleItemId, modificationId, quantity, price}]`.
2. `POST /returns/{id}/confirm` — backend o'zi `refundAmount` va `debtReduction` ni hisoblaydi, sotuv qarzini kamaytiradi, tovarni omborga qaytaradi, kassa/balans yozuvlarini yaratadi.
3. `GET /returns/{id}` — tasdiqlangan hujjatdan `refundAmount`, `debtReduction` o'qiladi.
4. Frontend hech qachon `CUSTOMER_REFUND` yoki boshqa moliya so'rovini o'zi yaratmaydi.

## Frontend nimani MOCK / TAXMINIY ko'rsatadi

| Joy | Nima | Manba |
| --- | --- | --- |
| Wizard 4–5-bosqich (tasdiqlashdan oldin) | Qarzdan ayriladi / Mijozga qaytariladi / Qolgan qarz | `taxminiyHisobKitob()` — "Taxminiy" belgisi bilan. Faqat ko'rsatish; backendga yuborilmaydi |
| Wizard 6-bosqich, Tafsilot (tasdiqlangan) | Yakuniy summalar | Backend `refundAmount` / `debtReduction` (yagona manba) + sotuvning yangilangan qarzi |
| Tafsilot — jarayon tarixi | Voqealar ro'yxati | `mockVaqtChizigi()` — hujjat holati va sanalaridan namunaviy tuziladi, "Namuna" belgisi bilan |
| Ro'yxat — "Qolgan qarz" ustuni | Sotuvning HOZIRGI qarzi | Sotuvlar ro'yxatidan. Hujjat bo'yicha snapshot emas |
| Sabab: "Mijoz fikrini o'zgartirdi", "Mahsulot mos kelmadi" | Backend enum'ida yo'q | `OTHER` yuboriladi, matn `note` ga "Sabab: ..." sifatida yoziladi |

## BACKENDGA KERAK BO'LADIGAN MA'LUMOTLAR

| Maydon | Nima uchun kerak | Qaysi sahifa / bosqich | Tur | Misol | Backendda bormi? | Qaysi response'ga tegishli |
| --- | --- | --- | --- | --- | --- | --- |
| `docNumber` | Qaytarish raqami (QAY-000003) | Ro'yxat, Tafsilot, 6-bosqich | string | `"QAY-000003"` | Tekshirilmagan (frontend `docNumber ?? documentNumber ?? number ?? id[0..8]` ni o'qiydi) | `GET /returns`, `GET /returns/{id}`, `POST /returns` |
| `refundAmount` | Mijozga qaytarilgan pul | Ro'yxat, Tafsilot, 6-bosqich | string (decimal) | `"7500000.00"` | **Bor** (confirm dan keyin) | `POST /returns/{id}/confirm`, `GET /returns/{id}`, `GET /returns` |
| `debtReduction` | Sotuv qarzidan ayirilgan summa | Ro'yxat, Tafsilot, 6-bosqich | string (decimal) | `"7500000.00"` | **Bor** (confirm dan keyin) | `POST /returns/{id}/confirm`, `GET /returns/{id}`, `GET /returns` |
| `debtBefore` | Qaytarishdan oldingi sotuv qarzi | 4–5-bosqich (real), Tafsilot hisob-kitob kartasi | string (decimal) | `"7500000.00"` | **Yo'q** (frontend: joriy qarz + debtReduction deb hisoblaydi) | `GET /returns/{id}`, `POST /returns/{id}/confirm` |
| `debtAfter` | Qaytarishdan keyingi qarz (hujjat bo'yicha snapshot) | Ro'yxat "Qolgan qarz", 6-bosqich, Tafsilot | string (decimal) | `"0.00"` | **Yo'q** (frontend: sotuvning joriy qarzini ko'rsatadi — keyingi qaytarishlardan keyin noto'g'ri bo'lishi mumkin) | `GET /returns`, `GET /returns/{id}`, `POST /returns/{id}/confirm` |
| `customer { id, fullName }` | Ro'yxatda mijoz ustuni | Ro'yxat | object | `{ "id": "…", "fullName": "Hojiakbar" }` | Qisman (`sale.customer` orqali; ro'yxatda `sale` har doim kelmasligi mumkin) | `GET /returns` |
| `reason` kengaytmasi: `CUSTOMER_CHANGED_MIND`, `NOT_SUITABLE` | 5 xil sababni alohida saqlash/hisobot | 3-bosqich, Tafsilot | enum | `"NOT_SUITABLE"` | **Yo'q** (enum: DEFECT, WRONG, OTHER) | `POST /returns` (request), barcha return response'lari |
| `reasonComment` | Sabab izohi `note` dan ajratilgan | 3-bosqich, Tafsilot | string \| null | `"Mijoz aytdi"` | **Yo'q** (hozir `note` ichida "Sabab: … \| izoh") | `POST /returns`, `GET /returns/{id}` |
| `returnedQuantity` (jami dona) | "Omborga qaytdi: N dona" | 5–6-bosqich, Tafsilot | number | `2` | **Yo'q** (frontend `items[].quantity` yig'indisini hisoblaydi) | `GET /returns/{id}`, confirm response |
| `returnableItems[]` (`saleItemId, soldQuantity, returnedQuantity, remainingQuantity`) | Qaytarilishi mumkin bo'lgan qoldiq | 2-bosqich | array | `[{ "saleItemId": "…", "remainingQuantity": 2 }]` | **Yo'q** (frontend tasdiqlangan qaytarishlar ro'yxatidan o'zi hisoblaydi) | Yangi endpoint (pastda) |
| `events[]` (`type, at, actor{id,fullName}, payload`) | Jarayon tarixi (timeline) | Tafsilot | array | `[{ "type": "CONFIRMED", "at": "2026-10-08T12:00:00Z" }]` | **Yo'q** (mock) | Yangi endpoint (pastda) yoki `GET /returns/{id}` ichida |
| `confirmedBy`, `cancelledBy`, `cancelledAt` | Kim/qachon tasdiqladi, bekor qildi | Tafsilot, timeline | object / ISO sana | `{ "id": "…", "fullName": "Admin" }` | Tekshirilmagan | `GET /returns/{id}` |
| `refundBreakdown` (`method, accountId, cashEntryId`) | Pul qaysi usul/hisobdan qaytgani | Tafsilot, 6-bosqich | object | `{ "method": "CASH", "accountId": "…" }` | Tekshirilmagan | `GET /returns/{id}` |

## Taklif qilinayotgan yangi endpointlar (YARATILMAGAN — faqat taklif)

### 1. Hisob-kitob oldindan ko'rish

- **Endpoint:** `POST /returns/preview`
- **Maqsad:** Tasdiqlashdan oldin backend qoidalari bo'yicha qarz/pul taqsimotini ko'rsatish (frontend o'zi hisoblamasligi uchun). Hech narsa saqlanmaydi.
- **Request:**
  ```json
  {
    "saleId": "…",
    "refundMethod": "CASH",
    "items": [{ "saleItemId": "…", "quantity": 2 }]
  }
  ```
- **Response:**
  ```json
  {
    "goodsValue": "15000000.00",
    "debtBefore": "7500000.00",
    "debtReduction": "7500000.00",
    "refundAmount": "7500000.00",
    "debtAfter": "0.00",
    "returnedQuantity": 2
  }
  ```

### 2. Qaytarilishi mumkin bo'lgan qatorlar

- **Endpoint:** `GET /sales/{saleId}/returnable-items`
- **Maqsad:** Har bir sotuv qatori uchun qolgan qaytariladigan miqdorni backend aniq berishi (DRAFT/CANCELLED hujjatlarni to'g'ri hisobga olish).
- **Request:** yo'q (path parametr).
- **Response:**
  ```json
  [
    {
      "saleItemId": "…",
      "modificationId": "…",
      "soldQuantity": "2",
      "returnedQuantity": "0",
      "remainingQuantity": "2",
      "price": "7500000.00"
    }
  ]
  ```

### 3. Jarayon tarixi

- **Endpoint:** `GET /returns/{id}/timeline`
- **Maqsad:** Qaytarish hujjati bo'yicha voqealar (yaratildi, mahsulot tanlandi, hisob-kitob, tasdiqlandi, omborga qaytdi, qarz/to'lov yangilandi, bekor qilindi) — kim va qachon.
- **Request:** yo'q (path parametr).
- **Response:**
  ```json
  [
    { "type": "CREATED", "at": "2026-10-08T11:50:00Z", "actor": { "id": "…", "fullName": "Kassir" } },
    { "type": "CONFIRMED", "at": "2026-10-08T12:00:00Z", "actor": { "id": "…", "fullName": "Admin" } },
    { "type": "STOCK_RETURNED", "at": "2026-10-08T12:00:00Z", "payload": { "quantity": 2 } },
    { "type": "DEBT_REDUCED", "at": "2026-10-08T12:00:00Z", "payload": { "amount": "7500000.00" } }
  ]
  ```

### 4. Mavjud `GET /returns` ni kengaytirish (yangi endpoint emas)

- **Maqsad:** Ro'yxat ustunlari uchun har bir elementda `docNumber`, `customer`, `refundAmount`, `debtReduction`, `debtAfter` kelishi.

## Mock'dan real API'ga o'tish

`src/Pages/Savdo/qaytarish/mockReturnData.ts`:

- `taxminiyHisobKitob()` → `POST /returns/preview` javobi.
- `backendHisobKitobi()` → `debtBefore`/`debtAfter` maydonlari kelganda to'g'ridan-to'g'ri ularni o'qiydi.
- `mockVaqtChizigi()` → `GET /returns/{id}/timeline` javobi.

UI komponentlari (`QaytarishHisobKitobi`, `QaytarishVaqtChizigi`) faqat ko'rsatadi, shuning uchun ularga tegish shart emas.
