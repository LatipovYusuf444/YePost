# Chegirmalar hisoboti — backend uchun talab

Sana: 2026-10-07. Hujjat backend dasturchi uchun. Frontend (POS, Savdo, Hisobotlar → Chegirmalar hisoboti) tayyor.
Backendda **faqat bitta narsa yetishmaydi: `GET /api/v1/reports/discounts`** (2026-10-07 holatida `404`, qolgan hisobotlar `401`).

---

## 1. Biznes qoidasi (misol)

```
Mahsulot (katalog) narxi — 18 000 so'm
Sotilgan narx            — 17 800 so'm
Chegirma                 —    200 so'm
```

Kassir POS'da sotuv narxini katalog narxidan pastga tushirsa, farq (200 so'm) **chegirma sifatida avtomatik** hisoblanadi
va har bir savdoda alohida saqlanadi. "Chegirmalar hisoboti"da ko'rinadi:

- bugun jami qancha chegirma berildi;
- shu oy jami qancha chegirma berildi;
- nechta savdoda chegirma ishlatildi (shuningdek kun/oy/kassir/mahsulot kesimida).

## 2. Hozirgi holat (backendda yangi maydon KERAK EMAS)

Frontend sotuvni yaratishda avvalgi shartnomani saqlaydi (`SaleItemDto`: `modificationId`, `quantity`, `price`, `discount`):

| Maydon | Qiymati |
|---|---|
| `items[].price` | **katalog narxi** (18 000) |
| `items[].discount` | shu qatorning **jami** chegirmasi so'mda = (katalog narxi − sotuv narxi) × miqdor (+ umumiy chegirmaning ulushi) |

Misol: 1 dona, 18 000 → 17 800 sotilsa: `{ "modificationId": "...", "quantity": 1, "price": 18000, "discount": 200 }`.
3 dona 23 000 → 22 500 sotilsa: `price: 23000, discount: 1500`.

Tekshirib qo'ying (kod bo'yicha ishonch hosil qiling):
- `sale.discountAmount` = `Σ items[].discount` (sotuv tasdiqlanganda);
- `discount >= 0` va `discount <= quantity × price`;
- foyda/tushum hisobotlari qatorni `quantity × price − discount` deb hisoblaydi (hozir shunday).

## 3. Yangi endpoint

`GET /api/v1/reports/discounts` — mavjud `/reports/product-profit` bilan bir xil uslubda (JWT, `x-lang`).

### So'rov parametrlari

| Parametr | Tur | Izoh |
|---|---|---|
| `dateFrom`, `dateTo` | ISO datetime (UTC) | Frontend **mahalliy (Asia/Tashkent) kun chegaralarini** UTC ko'rinishida yuboradi, ikkala chet kiradi |
| `groupBy` | `DAY` \| `MONTH` \| `CASHIER` \| `PRODUCT` | Standart `DAY` |
| `branchId` | uuid, ixtiyoriy | Sotuv ombori tegishli filial |
| `responsibleId` | uuid, ixtiyoriy | Kassir (sotuvdagi `responsibleId`) |
| `productId` | uuid, ixtiyoriy | Faqat shu mahsulot qatorlari |
| `page`, `pageSize` | int | Standart `1` / `20`, `pageSize` ≤ 500. `summary` sahifalashdan qat'i nazar **butun filtr** bo'yicha |
| `export` | `excel` \| `pdf` | Berilsa shu yo'lning o'zida fayl qaytaradi (`product-profit` kabi) |

### Javob (200)

```json
{
  "summary": {
    "totalDiscount": 205800,
    "discountedSalesCount": 3,
    "totalSalesCount": 5,
    "totalSalesAmount": 21777000,
    "avgDiscountPct": 0.94
  },
  "items": [
    {
      "key": "2026-10-07",
      "label": "2026-10-07",
      "salesCount": 3,
      "discountedSalesCount": 2,
      "salesAmount": 5742000,
      "discountAmount": 5800,
      "discountPct": 0.1
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

| Maydon | Ma'nosi |
|---|---|
| `key` / `label` | `DAY` → `YYYY-MM-DD`, `MONTH` → `YYYY-MM` (Asia/Tashkent bo'yicha); `CASHIER` → key = `responsibleId`, label = F.I.Sh.; `PRODUCT` → key = `productId`, label = mahsulot nomi |
| `salesCount` | Guruhdagi tasdiqlangan sotuvlar soni (`PRODUCT` kesimida — shu mahsulot bor sotuvlar soni) |
| `discountedSalesCount` | Shundan chegirmasi `> 0` bo'lganlar soni |
| `salesAmount` | Sof savdo summasi (chegirmadan **keyin**): `Σ (quantity × price − discount)` |
| `discountAmount` | `Σ discount` |
| `discountPct` | `discountAmount / (salesAmount + discountAmount) × 100` |
| `summary.avgDiscountPct` | Xuddi shu formula, butun filtr bo'yicha |

## 4. Hisoblash qoidalari

1. Faqat **CONFIRMED** sotuvlar (qoralama va bekor qilinganlar kirmaydi).
2. Sana — sotuv tasdiqlangan sana (`confirmedAt`; bo'lmasa sotuv sanasi), Asia/Tashkent kuni bo'yicha guruhlanadi.
3. **Qaytarishlar:** tasdiqlangan qaytarishda qaytarilgan miqdorga mutanosib chegirma ayirilsin (sof tushum / sof foyda qoidasi bilan bir xil).
   Qaysi sana bo'yicha ayirilishini (qaytarish sanasi yoki sotuv sanasi) hujjatlashtiring — frontend ikkalasiga ham mos.
4. Natijalar `/reports/income-expense` va `/reports/product-profit` bilan **mantiqan mos** bo'lsin (chegirma tushumdan allaqachon ayirilgan).
5. Ruxsat: **ADMIN, DIREKTOR** (KASSIR/OMBORCHI uchun 403 — frontend ularga hisobotlar sahifasini ko'rsatmaydi).
6. Xato holatlari standart (`400` noto'g'ri parametr, `401`, `403`).

## 5. Qabul sinovi (shu raqamlar chiqishi kerak)

Davrda 5 ta tasdiqlangan sotuv: ikkitasida chegirma 5 000 va 800 (bugun), bittasida 200 000 (2 kun oldin), ikkitasida chegirma yo'q.

| So'rov | Kutilgan |
|---|---|
| Faqat bugun | `totalDiscount = 5800`, `discountedSalesCount = 2`, `totalSalesCount = 3` |
| Shu oy | `totalDiscount = 205800`, `discountedSalesCount = 3`, `totalSalesCount = 5` |
| `groupBy=CASHIER` | Har kassirning chegirmasi yig'indisi `summary.totalDiscount` ga teng |
| `groupBy=PRODUCT` | Qatorlar yig'indisi `summary.totalDiscount` ga teng |
| `export=excel` | `.xlsx` fayl, `Content-Disposition` bilan |

## 6. Frontend qanday ulanadi (o'zgartirish shart emas)

- Endpoint tayyor bo'lishi bilan **Hisobotlar → Chegirmalar hisoboti** o'zi backend hisobotiga o'tadi:
  "Bugun" va "Shu oy" kartalari `summary` dan, jadval `items` dan olinadi, Excel tugmasi yoqiladi.
- Endpoint `404` qaytarsa, frontend vaqtincha sotuvlar ro'yxatidagi chegirmalardan hisoblab, sariq ogohlantirish ko'rsatadi.
- `/reports/discounts` uchun xato toasti o'chirilgan (sahifa xatoni o'zi ko'rsatadi): `src/api/axios.ts` → `TOAST_ISTISNOLARI`.
- Frontend kodi: `src/api/reportsApi.ts` (`discountReportApi`), `src/Pages/HisobotUchot/ChegirmaHisoboti.tsx`,
  `ChegirmaXulosa.tsx`, `chegirmaYordamchilari.ts`. Maydon nomlari boshqacha bo'lsa, faqat `qatorlarniOlish` va `backendXulosa` o'zgaradi.

## 7. Ixtiyoriy (yaxshi bo'lardi)

- `GET /sales` ro'yxati va tafsiloti har doim `discountAmount` qaytarsin (Savdo ro'yxatidagi "Chegirma" ustuni shundan olinadi).
- `GET /sales?hasDiscount=true` filtri.
- `openapi.json` ni yangilash.
