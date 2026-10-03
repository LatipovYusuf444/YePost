# YePost — backend uchun to'liq talablar ro'yxati (frontend audit)

Sana: 2026-10-03. Hujjat backend dasturchi uchun. Butun frontend (har bir sahifa, modal va filtr) tekshirilib,
backendda **yo'q yoki yetarli bo'lmagan** joylar sahifa nomlari bilan yig'ildi.

Prioritet belgilari: **P1** — hozir ishlashga/ma'lumot yaxlitligiga ta'sir qiladi, **P2** — muhim funksiya yetishmaydi,
**P3** — yaxshilanish/reja.

---

## 0. Qisqa xulosa

| Guruh | Mazmuni | Soni |
|---|---|---|
| **A** | Frontend chaqiradi, lekin `openapi.json`da yo'q (spec eskirgan yoki endpoint yo'q) — **tasdiqlang** | ~50 endpoint |
| **B** | Interfeysda bor, backendda umuman yo'q — **yangi endpoint/maydon** | 14 ta band |
| **C** | Mavjud endpointlarga **maydon qo'shish** (hozir `note`/`customFields`ga matn qilib yozilmoqda) | 9 ta obyekt |
| **D** | Ro'yxat endpointlarida **filtr / qidiruv / sahifalash yo'q** (hammasi brauzerda) | 17 ta endpoint |
| **E** | **Agregat** endpointlar kerak (Monitoring, kartalar) | 4 ta |
| **F** | Frontend bajarayotgan **biznes mantiq** backendga o'tishi kerak | 4 ta |
| **G** | Real-time (polling o'rniga) | 2 ta |

**Eng muhim 5 ta (P1):** A bo'limidagi spec tasdig'i → D (`GET /sales` filtr+sahifalash) → F-1 (qaytarishdan keyin
kassa yozuvi atomik bo'lsin) → B-2 (sotuv to'lovini bekor qilish va to'lov ma'lumotlari) → C-1 (sotuv/kirim sarlavhasi, bosqich, valyuta, sanalar).

---

## 1. Qanday tekshirildi va ogohlantirish

- Repodagi `openapi.json` (245 endpoint) bilan frontend kodidagi barcha `apiClient.*` chaqiruvlari (261 unikal endpoint) solishtirildi.
- Har sahifaning ma'lumot manbai, forma maydonlari va filtrlari DTO maydonlari bilan solishtirildi.
- **`openapi.json` eskirgan ko'rinadi**: masalan, frontend `DELETE /sales/{id}`, `/orders`, `/platform/*`, `/catalog/products/import`
  kabilarni ishlatadi va (loyiha tarixiga ko'ra) ular ishlaydi. **A bo'limidagi endpoint backendda allaqachon bo'lsa — shunchaki
  `openapi.json`ni yangilang**, yo'q bo'lsa qo'shing.
- Frontendda ishlatilmaydigan, lekin spec'da bor endpointlar H bo'limida (backendga ish yo'q).

---

## 2. A — Frontend chaqiradi, spec'da yo'q (tasdiqlang yoki qo'shing)

### A-1. Savdo (Barcha sotuvlar, Qoralamalar, Bekor qilinganlar, Qaytarish) — **P1**
| Metod | Yo'l | Qayerda ishlatiladi |
|---|---|---|
| DELETE | `/sales/{id}` | Qoralama/bekor qilingan sotuvni o'chirish (ro'yxat qatori, Kassa, sotuv oynasi) |
| POST | `/sales/{id}/restore` | Bekor qilingan sotuvni qoralamaga qaytarish |
| DELETE | `/returns/{id}` | Qaytarish hujjatini o'chirish |
| POST | `/returns/{id}/restore` | Qaytarishni tiklash |

### A-2. Savdo → Buyurtmalar — **P1**
| Metod | Yo'l | Izoh |
|---|---|---|
| GET | `/orders?status=&search=&page=&pageSize=` | Yetkazishi bor sotuvlar; `orderStatus` backend hisoblaydi (NEW/CONFIRMED/DELIVERING/COMPLETED/CANCELLED) |
| GET | `/orders/counts` | Tab sonlari |

### A-3. Ombor: Kirim, Chiqim, Ko'chirish, Inventarizatsiya — **P1**
| Metod | Yo'l |
|---|---|
| DELETE | `/inventory/purchases/{id}`, `/inventory/write-offs/{id}`, `/inventory/transfers/{id}`, `/inventory/stock-takes/{id}` |
| POST | `/inventory/purchases/{id}/restore`, `/inventory/write-offs/{id}/restore`, `/inventory/transfers/{id}/restore`, `/inventory/stock-takes/{id}/restore` |
| POST | `/inventory/stock-takes/{id}/cancel` |

### A-4. Mahsulotlar — **P2**
| Metod | Yo'l | Izoh |
|---|---|---|
| GET | `/catalog/modifications?productIds=a,b` | Barcha variantlar narx va mahsulot bilan (N+1 oldini oladi) |
| GET | `/catalog/modifications/search?q=` | Kassir/omborchi uchun tannarxsiz, qoldiq bilan qidiruv |
| GET | `/catalog/products/export` | Excel eksport (filtrlar bilan) |
| POST | `/catalog/products/import?dryRun=true` | Excel import (multipart `file`) |
| GET | `/catalog/products/import/template` | Import shabloni |
| GET | `/catalog/units/standard` | Standart o'lchov birliklari (Sozlamalar → O'lchov birliklari) |

### A-5. Super admin paneli (`/admin/*`) — **P1**
Frontend `/platform/*` ishlatadi, spec'da esa `/tenants/*` bor — nomlar mos emas, ikkalasini tasdiqlang.
| Metod | Yo'l |
|---|---|
| GET | `/platform/dashboard` (`workspaces{total,active,inactive,createdLast30Days}`, `users{total,active,inactive}`, `subscriptions` status bo'yicha) |
| GET/POST | `/platform/workspaces`; PATCH/DELETE `/platform/workspaces/{id}`; PATCH `/platform/workspaces/{id}/status {isActive}` |
| GET/POST | `/platform/tariffs`; PATCH/DELETE `/platform/tariffs/{id}` |
| GET/POST | `/platform/subscriptions`; PATCH `/platform/subscriptions/{id}` (uzaytirish, bekor qilish, tarif almashtirish) |
| GET | `/platform/users?workspaceId=&search=&role=&page=&pageSize=` |
| PATCH | `/platform/users/{id}/status {isActive}`, `/platform/users/{id}/password {password}` |

### A-6. Qo'llab-quvvatlash (Support) — **P2**
Mavjud va yangi endpointlar to'liq `docs/support-backend-spec.md` da: `/support/messages`, `/support/messages/read`,
`/support/unread-count`, `/support/tickets`, `/support/tickets/{id}/messages`, `/support/tickets/{id}/read`, `/support/tickets/{id}/status`.
Hozir `GET /support/tickets` **404** qaytaradi va frontend bitta "Umumiy suhbat" ko'rsatadi (brauzer konsolida qizil xato).

### A-7. Rasm (avatar) — **P2**
`POST/DELETE /auth/me/avatar`, `POST/DELETE /accounts/users/{id}/avatar` — to'liq `docs/avatar-backend-spec.md` da.
Yo'q bo'lsa rasm faqat shu brauzerda saqlanadi.

### A-8. Bo'limlar daraxti (Xodimlar → Tashkilot tuzilmasi) — **P2**
Frontend `POST/PATCH /hr/departments` ga `parentId` va `managerId` yuboradi; spec'da faqat `name, description`.
Tasdiqlang: ikkala maydon qabul qilinib saqlanyaptimi (aks holda daraxt strukturasi yo'qoladi).

---

## 3. B — Interfeysda bor, backendda umuman yo'q (YANGI)

### B-1. Savdo → sotuv oynasi → "Hujjat" menyusi — **P2**
- Menyuda 12 ta hujjat turi bor: Akt, Hisob, Hisob-faktura, Nakladnoy, Ishonchnoma, Tijorat taklifi, Pudrat shartnomasi,
  Yetkazib berish shartnomasi, Xizmat ko'rsatish shartnomasi, Universal topshirish hujjati, EDI (jismoniy/yuridik).
- Backend `POST /sales/{id}/documents` faqat `RECEIPT | INVOICE` ni biladi. **Nakladnoy va Hisob-faktura brauzerda yasaladi va faqat
  xotirada saqlanadi** (sahifa yangilansa yo'qoladi).
- Talab: `CreateSaleDocumentDto.type` ni kengaytirish (`WAYBILL`, `ACT`, `POWER_OF_ATTORNEY`, `COMMERCIAL_OFFER`, `CONTRACT_*`, `UNIVERSAL_TRANSFER`, `EDI_*`),
  PDF generatsiya (`.../pdf` kabi), va shablonlar uchun `GET/POST /document-templates` ("Yangi shablon", "Hujjatlar ro'yxati" tugmalari).

### B-2. Savdo → to'lovlar (sotuv oynasi "Qabul qilingan to'lovlar", Kassa) — **P1**
- `POST /sales/{id}/payments` dan boshqa to'lov endpointi **yo'q**. To'lovni bekor qilish/o'zgartirish uchun butun sotuvni bekor qilish kerak
  (Kassa sahifasida ham shu sabab).
- Talab:
  - `GET /sales/{id}/payments`, `GET /sales/{id}/payments/{paymentId}`
  - `POST /sales/{id}/payments/{paymentId}/cancel` (yoki `DELETE`) — qisman to'lovni qaytarish/bekor qilish
  - Payment obyektida: `id`, `number` (masalan `50888384/1`), `createdAt`, `createdBy{id,fullName}`, `paymentType`, `amount`, `status`
    (hozir faqat `id, paymentType, amount`; to'lov sanasi frontendda ko'rinmaydi)
- To'lov turlari: sotuvda `CASH|CARD|BANK|DEBT`; Savdo → To'lovlar filtrida `CLICK`, `PAYME`, `OTHER` ham bor, ammo sotuv to'lovida yo'q.
  "Terminal orqali to'lov" menyusi (hozir "Tez orada") uchun `TERMINAL` (+ `providerRef`) va online to'lov (Click/Payme/Uzum) integratsiyasi kerak.

### B-3. Savdo → Yetkazish (sotuv oynasi) — **P3**
`/sales/{id}/delivery/*` endpointlari bor, UI menyuda "Tez orada" bilan o'chirilgan (frontend ishi). Backendga savol:
yetkazish narxi (`deliveryFee`) sotuv summasiga qo'shiladimi? Ombordan chiqarish hujjatida "Yetkazish summasi" va "Soliq summasi" hozir **qattiq 0**
yozilgan — `deliveryFee`, `taxAmount` maydonlari kerak.

### B-4. Savdo → sotuv oynasi → "Maydon yarating" (maxsus maydonlar) — **P3**
`GET /crm/custom-fields?entityType=` faqat `CUSTOMER | COMPANY | SUPPLIER`. Sotuv oynasida "Maydonni tanlang / Maydon yarating" bor →
`SALE` (va ehtimol `PRODUCT`, `EMPLOYEE`) turini qo'shish; `Sale.customFields` maydoni.

### B-5. Savdo → sotuv oynasi → "Qaytarilgan savdo" — **P3**
"Qo'shimcha ma'lumotlar"da "Qaytarilgan savdo" maydoni (hozir doim "Tanlanmagan"). Talab: sotuv ↔ qaytarish bog'lanishi
(`linkedReturnIds[]` / `returns[]` sotuv tafsilotida).

### B-6. Yuqori panel → global qidiruv — **P2**
Yuqoridagi qidiruv maydoni hech narsaga ulanmagan. Talab: `GET /search?q=&types=product,customer,company,supplier,sale,user&limit=`
→ `[{type, id, title, subtitle, url}]`.

### B-7. Hisobotlar → O'zaro hisob-kitob → hujjatni ochish — **P2**
To'lov hujjatlari (kassaKirim/tolov) hozir ochilmaydi (kod: "hozircha ochilmaydi — null qaytadi"). Talab:
`GET /finance/transactions/{id}` (hozir faqat ro'yxat) va `counterparty-balance/.../documents` javobida to'lov yozuvlari `type=PAYMENT` bilan.

### B-8. Hisobotlar → Audit loglari — **P3**
Filtrlar: sana va obyekt. Yo'q: foydalanuvchi bo'yicha (`actorId`), qidiruv (`search`), Excel eksport (`GET /audit/logs/export`).
(`action`, `resource`, `resourceId`, sahifalash bor.)

### B-9. Xodimlar → Davomat — **P3**
`GET /hr/attendance` faqat `userId, dateFrom, dateTo` oladi. Frontend holat bo'yicha filtrni brauzerda qiladi
(kod: "Holat bo'yicha filtr backendda yo'q"). Talab: `status`, `departmentId`, `branchId`, sahifalash, davr xulosasi
(kechikish/kelmaslik soni), Excel eksport.

### B-10. Xodimlar → Lavozimlar — **P3**
UI lavozimga izoh va vakolatlar biriktirishni ko'rsatadi, lekin `CreatePositionDto` = `name, departmentId`. Talab: `description`,
`grants[]` (lavozim vakolatlari; foydalanuvchiga lavozim orqali meros bo'ladi). Hozir lavozim vakolatlari har doim bo'sh.

### B-11. Ombor → Inventarizatsiya — **P2**
Interfeys matnlaridan: backend quyidagilarni qo'llamaydi
- javon/joy (location) va partiya/seriya bo'yicha sanash;
- sanalmagan qatorli qoralamani saqlash (hozir har tovar uchun son majburiy);
- katta farqda avtomatik qayta sanash va rahbar tasdig'i;
- qoralama yaratilganda ombor muzlatilishi (qaysi harakatlar cheklanadi, qancha vaqt — aniq emas).

### B-12. Kassa → yozuvlarni bekor qilish — **P2**
Sotuv to'lovini bekor qilib bo'lmaydi (B-2); **qaytarish (RETURN) yozuvlari kassadan o'chirilmaydi** ("deleteBlocked.RETURN").
Talab: qaytarishni bekor qilganda unga bog'liq kassa yozuvi ham bekor bo'lsin.

### B-13. Bildirishnomalar (yuqori panel) — **P3**
Qo'ng'iroq nishonidagi son butun ro'yxatni yuklab hisoblanadi. Talab: `GET /crm/notifications/unread-count`.

### B-14. Chegirmalar moduli (Aksiya, Bonus, Promokod) — **P3 (reja)**
`Pages/Chegirmalar/*` va `chegirmalarApi.ts` **bo'sh** (hech narsa yozilmagan, menyuda yo'q). Mahsulot rejasida bo'lsa to'liq modul kerak:
`/promotions`, `/bonuses`, `/promo-codes` va sotuvda qo'llash (`promoCode`, chegirma hisobi).

---

## 4. C — Mavjud endpointlarga maydon qo'shish

Hozir bu ma'lumotlar `note` yoki `customFields` ichiga matn qilib yoziladi — qidirib, filtrlab, hisobot qilib bo'lmaydi.

| # | Obyekt / sahifa | Maydonlar | Hozir | Prioritet |
|---|---|---|---|---|
| C-1 | **Sotuv** (Savdo → Qo'shish) | `title` (Sotuv nomi), `stage` (Bosqich), `currency`, `startDate`, `endDate`, `linkedReturnIds`, `deliveryFee`, `taxAmount` | `note` ichida: `"Sotuv nomi: …\nBosqich: …\nValyuta: …\nBoshlanish sanasi: …"` | **P1** |
| C-2 | **Kirim** (Ombor → Kirim → Qo'shish) | `title` (Nomi) | `note` ichida `"Nomi: … \| …"` | P2 |
| C-3 | **Xodim** (Xodimlar → forma) | `phones[]` (2+ telefon), `address`, `hireDate`, `employmentStatus` (ACTIVE/ON_LEAVE/TERMINATED), `notes`, `createdBy`, `updatedBy`, `avatarUrl` | Bitta `phone`; `hireDate` = `createdAt` (tahrir saqlanmaydi); "izoh" `position` matniga aralashib yoziladi; "ta'tilda" holati yo'q (faqat `isActive`) | P2 |
| C-4 | **Xaridor** (Mijozlar → Xaridorlar) | `phones[]`, `socials{telegram,whatsapp,instagram,website}`, `position`, `email` | `customFields`ga (extraPhones, whatsapp, instagram, position); `telegramId` alohida | P2 |
| C-5 | **Xaridor kompaniyasi / Yetkazib beruvchi** | `contactPhone` (aloqa shaxsining telefoni), `address`, `createdBy`, `updatedBy` | `contactPhone` **saqlanmaydi** (adapterda `""`), manzil yo'q | P2 |
| C-6 | **Bo'lim** (Tashkilot tuzilmasi) | `parentId`, `managerId` (A-8) | Yuboriladi; saqlanishi tasdiqlanmagan | P2 |
| C-7 | **Lavozim** | `description`, `grants[]` (B-10) | Bo'sh | P3 |
| C-8 | **Sotuv to'lovi** | `id, number, createdAt, createdBy, status` (B-2) | Faqat `id, paymentType, amount` | **P1** |
| C-9 | **Ro'yxat javoblari** (D bo'limiga qarang) | list'da ichki obyektlar (`responsible`, `createdBy`, `branch`, `items` soni/summasi, `product`/`modification` nomi) | Har bir qator uchun alohida detail so'rov (N+1) | **P1** |

---

## 5. D — Ro'yxat endpointlarida filtr, qidiruv va sahifalash

**Hozir** quyidagi endpointlar **hech qanday query parametr olmaydi**; frontend hammasini yuklab, qidiruv/filtr/sahifalashni brauzerda qiladi
(kalendar komponentida ham shunday yozilgan: "Backendda sana bo'yicha so'rov parametri yo'q"). Ma'lumot ko'payganda sahifalar sekinlashadi.

Umumiy talab: `page`, `pageSize` (default 20, max 100), `search`, `sort`, javob `{ items, total, page, pageSize, totalPages }`
(hisobotlardagi shakl bilan bir xil). Tab sonlari uchun `GET …/counts` (`/orders/counts` kabi).

| Endpoint | Qo'shiladigan parametrlar | Qaysi sahifa/filtr ishlatadi |
|---|---|---|
| **GET /sales** — **P1** | `status`, `dateFrom`, `dateTo`, `customerId`, `clientCompanyId`, `responsibleId`, `warehouseId`, `paymentType`, `hasDebt`, `search` | Savdo: Barcha sotuvlar (qidiruv, Holat, To'lov: Naqd/Karta/Bank/Qarz, sana), Qoralamalar, Savdo tarixi, Bekor qilinganlar, Qarzdorliklar; Ombor → Amalga oshirilganlar (qidiruv, sana); Mijoz tafsilotidagi "Savdolar"; Monitoring |
| GET /returns | `saleId`, `status`, `dateFrom`, `dateTo`, `search` | Savdo → Qaytarish |
| GET /inventory/purchases | `status`, `supplierId`, `warehouseId`, `dateFrom`, `dateTo`, `search` | Ombor → Kirim (qidiruv, sana, holat) |
| GET /inventory/write-offs | `status`, `warehouseId`, `reason`, `dateFrom`, `dateTo`, `search` | Ombor → Chiqim |
| GET /inventory/transfers | `status`, `sourceWarehouseId`, `destWarehouseId`, `dateFrom`, `dateTo`, `search` | Ombor → Ko'chirish |
| GET /inventory/stock-takes | `status`, `warehouseId`, `dateFrom`, `dateTo`, `search` | Ombor → Inventarizatsiya |
| GET /partners/customers | `search`, `companyId`, `hasDebt` | Mijozlar → Xaridorlar |
| GET /partners/client-companies | `search`, `hasDebt` | Mijozlar → Kompaniya |
| GET /partners/suppliers | `search`, `hasDebt` | Mijozlar → Yetkazib beruvchilar |
| GET /accounts/users | `search`, `role`, `branchId`, `departmentId`, `isActive` | Xodimlar |
| GET /catalog/products | `search`, `categoryId`, `isActive` | Mahsulotlar |
| GET /organization/warehouses | `search`, `branchId`, `isActive` | Ombor → Omborlar |
| GET /organization/branches | `search`, `status` | Filiallar |
| GET /finance/expenses, /loans, /cash-ins | `dateFrom`, `dateTo`, `branchId`, `page` | Kassa (eski oqim; asosiysi `/finance/transactions` — u tayyor) |
| GET /hr/attendance | `status`, `departmentId`, `branchId`, `page` | Xodimlar → Davomat (B-9) |
| GET /crm/notifications | `page`, `pageSize` | Yuqori panel |
| GET /crm/activities | `page`, `pageSize` | Sotuv/mijoz faoliyat lentasi |

**Yaxshi namuna (o'zgarishsiz):** `/finance/transactions`, `/finance/cash-operations`, `/reports/*` — parametrlari to'liq.

### N+1 muammolari (list javobida ma'lumot yetishmaydi)
Quyidagi joylarda ro'yxatdan keyin **har bir qator uchun alohida so'rov** ketadi — ro'yxat javobiga kerakli maydonlarni qo'shing:
- **Ombor → Omborlar**: har ombor uchun `GET /organization/warehouses/{id}` (list'da `responsible`, `createdBy`, `branch` yo'q).
- **Ombor → Ko'chirish** va **Chiqim**: list'da `items` yo'q → har hujjat uchun detail so'rovi.
- **Monitoring**: barcha chiqim/ko'chirish hujjatlari uchun detail so'rovi (E-2 bilan hal bo'ladi).
- **Savdo (POS) qoldiq tanlash / Ombor qoldig'i**: `GET /inventory/stock-balance` javobida mahsulot nomi yo'q → har qator uchun
  `GET /catalog/modifications/{id}` va `GET /catalog/products/{id}`. Javobga `product{id,name}`, `modification{name,barcode,article}`, `unit` qo'shing.

---

## 6. E — Agregat (hisoblangan) endpointlar

### E-1. Savdo kartalari — **P2**
Savdo va Ombor → Amalga oshirilganlar sahifalari tepasida 4 ta karta (jami sotuvlar, savdo summasi, qabul qilingan to'lov, qarzdorlik, kechagiga/oldingi
davrga nisbatan, oxirgi 7 kun). Hozir butun `GET /sales` ro'yxatidan brauzerda hisoblanadi.
```
GET /sales/summary?dateFrom=&dateTo=&status=&warehouseId=
→ { confirmed:{count,total,paid,debt,debtorsCount}, draft:{count}, cancelled:{count},
    previous:{count,total}, daily:[{date,count}]  // oxirgi 7 kun }
```

### E-2. Monitoring — **P1**
Sahifa hozir **barcha** sotuvlar, **barcha** kirim/chiqim/ko'chirish hujjatlarini (+ har biri uchun detail) yuklab, grafiklarni brauzerda yig'adi.
```
GET /analytics/sales-dynamics?dateFrom=&dateTo=&groupBy=day|month|year
GET /analytics/payment-split?dateFrom=&dateTo=            // naqd/karta/bank/qarz
GET /analytics/top-products?dateFrom=&dateTo=&limit=      // mahsulot reytingi
GET /analytics/warehouse-flow?dateFrom=&dateTo=&groupBy=  // omborlar bo'yicha kirim/chiqim/ko'chirish
```

### E-3. Qarzdorliklar (Savdo tabi) — **P2**
Hozir sotuvlar ro'yxatidan brauzerda hisoblanadi → `GET /sales?hasDebt=true&sort=-debtAmount` (D bo'limi) yoki `GET /reports/counterparty-balance` dan foydalanish.

### E-4. Tab sonlari — **P3**
`GET /sales/counts` → `{ all, draft, confirmed, cancelled }` (Savdo tablari uchun, `/orders/counts` kabi).

---

## 7. F — Frontend bajarayotgan biznes mantiq (backendga o'tishi kerak)

### F-1. Qaytarishdan keyin kassa yozuvi — **P1**
Frontend `POST /returns/{id}/confirm` dan **keyin** o'zi `POST /finance/cash-operations` (`CUSTOMER_REFUND`) va `…/confirm` ni chaqiradi
(`savdoStore.qaytarishToloviniKassagaYozish`). Ikki alohida so'rov — biri o'tib, ikkinchisi yiqilsa qaytarish tasdiqlanadi, lekin kassa yozilmaydi.
**Talab:** `confirm` ichida `refundMethod` = CASH/CARD bo'lsa backend o'zi bitta tranzaksiyada cash operation yaratsin (idempotent);
bekor qilinganda teskari yozuv.

### F-2. Qarzga sotuv uchun mijoz majburiyligi — **P2**
"Qarzga sotuv uchun xaridorni tanlang" tekshiruvi faqat frontendda (`sotuvniTasdiqlash`). Backend ham `POST /sales/{id}/confirm`da
qarz > 0 va mijoz yo'q bo'lsa `400` (masalan `errors.sales.customer_required_for_debt`) qaytarsin.

### F-3. Summalar — **P2**
To'langan/qarz/jami frontendda `payments[]` yig'indisidan hisoblanadi (ayniqsa qoralamada). Backend `totalAmount`, `paidAmount`, `debtAmount`ni
**har doim** (list va detail, qoralama ham) hisoblab qaytarsin; ortiqcha to'lov (change) qoidasini aniqlang.

### F-4. Bo'sh qoldiq xatosi — **P3**
`errors.inventory.out_of_stock` kodi allaqachon ishlatiladi (frontend tushunarli xabar ko'rsatadi) — qolgan xatolar ham shu usulda (`code`) qaytsin.

---

## 8. G — Real-time

- **Qo'llab-quvvatlash**: inbox har 5 soniyada so'rov yuboradi (polling). Talab: SSE/WebSocket (`/support/stream`) — yangi xabar, o'qildi holati.
- **Bildirishnomalar / qoldiq o'zgarishi**: hozir faqat qo'lda yangilanadi. Ixtiyoriy: `/events` oqimi (`sale.confirmed`, `stock.changed`, `notification.created`).

---

## 9. H — Backend bor, lekin frontend ulamagan (backendga ish yo'q)

Ma'lumot uchun: bular spec'da bor, frontend ishlatmaydi — UI tomonda ulanadi.
- `POST /crm/comments/{id}/documents`, `GET/POST /crm/documents`, `DELETE /crm/documents/{id}`, `GET /crm/attachments/documents` — "CRM izohidan hujjat yaratish".
- `DELETE /crm/chat/messages/{id}` — chat xabarini o'chirish (UI: "endpoint backendda mavjud emas" deb yozadi, aslida bor).
- `GET /sales/{id}/documents/{docId}`.
- `/sales/{saleId}/delivery/*` — Yetkazish UI menyuda o'chirilgan (B-3).

## 10. Ishlatilmayotgan (o'lik) kod — e'tibor uchun
- Routerga ulanmagan eski sahifalar: `Pages/Kassa`, `Pages/Hodimlar`, `Pages/Sozlamalar`, `Pages/Hisobotlar` (o'rniga `*Uchot` ishlatiladi).
- Bo'sh fayllar: `Pages/Chegirmalar/*`, `Pages/Buyurtmalar/*` (hammasi 0 bayt), `api/{boshSahifa,chegirmalar,hisobotlar,kassa,mahsulotlar,mijozlar,qarzdorlik}Api.ts`.

---

## 11. Tavsiya etilgan tartib

1. **1-hafta (P1):** A-1…A-3, A-5 spec tasdig'i va `openapi.json` yangilash → `GET /sales` filtr+sahifalash (D) → F-1 (qaytarish + kassa).
2. **2-hafta (P1/P2):** B-2 (to'lov endpointlari) → C-1 (sotuv maydonlari) → C-8, C-9 (N+1) → E-2 (Monitoring).
3. **3-hafta (P2):** B-1 (hujjat turlari), B-6 (global qidiruv), E-1, A-6 + A-7 (support, avatar), C-3…C-6.
4. **Keyin (P3):** B-3…B-5, B-8…B-14, G.
