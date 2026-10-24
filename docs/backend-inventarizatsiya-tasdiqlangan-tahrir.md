# Tasdiqlangan inventarizatsiyani tahrirlash

24.10.2026: backend tomonidan berilgan yakuniy shartnoma va frontend ulanishi.

## API

`POST /inventory/stock-takes/:id/revise` — faqat `CONFIRMED` hujjatda, `ADMIN` va `DIREKTOR` uchun.

```json
{
  "expectedUpdatedAt": "2026-10-24T07:10:00.000Z",
  "note": "Sanoqdagi xato tuzatildi",
  "type": "PARTIAL",
  "responsibleId": "user-uuid",
  "items": [{ "modificationId": "modification-uuid", "actualQuantity": 90 }],
  "confirmWarnings": false
}
```

Maydonlar ixtiyoriy. `items` berilsa eski qatorlar to'liq almashtiriladi. Muqobil miqdor shakli: `closedUnitId`, `closedQuantity`, `openQuantity`. Frontend asosiy birlikdagi `actualQuantity`ni yuboradi.

`expectedUpdatedAt` hujjat ochilgandagi nusxadan olinadi. `warehouseId` va `date` yuborilmaydi; formada qulflangan.

Server bitta tranzaksiyada eski ta'sirni qaytaradi va sanoqni o'z vaqtida qayta qo'llaydi. `id`, `docNumber` saqlanadi, natija `CONFIRMED`; xatoda hech narsa o'zgarmaydi. `systemQuantity` sanash paytidagi boshlang'ich qoldiq bo'lib qoladi.

## Frontend

- Jadval → hujjat → Tahrirlash: yaratish formasi mavjud mahsulotlar, miqdorlar va izoh bilan ochiladi.
- Saqlash faqat bitta `revise` mutatsiyasini yuboradi. `cancel`, `restore`, `PATCH`, `confirm` zanjiri yo'q.
- Miqdor aynan yozilganicha yuboriladi: masalan 100 → 90 yoki 45; tahrirda `Math.max(actualQuantity, currentStock)` ishlatilmaydi.
- Eski qatorlar sanash paytidagi `systemQuantity` bilan ko'rsatiladi; katalogda yo'q qatorlar ham yo'qolmaydi.
- Muvaffaqiyatdan keyin hujjat tafsiloti va tarixi qayta ochiladi, jadval hamda ombor va savdo qoldiq keshlari yangilanadi.
- Audit yozuvini backend yaratadi; frontend qo'shimcha audit mutatsiyasi yubormaydi. `REVISED` tarixi: “Tasdiqlangan inventarizatsiya tahrirlandi”.

## Xatolar

- `409 errors.inventory.movements_after_stock_take`: forma saqlanadi, yangi inventarizatsiya qilish tavsiya etiladi; barcha `movements` (type, docId, date, quantity) ro'yxati ko'rsatiladi.
- `409 errors.inventory.document_changed`: hujjat o'zgargani va yangilab qayta ochish kerakligi aytiladi.
- `400 errors.inventory.confirmed_only_revisable`: faqat tasdiqlangan hujjatni tahrirlash mumkinligi ko'rsatiladi.
- `423`: mavjud yopilgan davr xabari ishlatiladi.

Yaratishning mavjud oqimi saqlangan. Generated `packages/api-client` bu frontend repoda yo'q; ulanish mavjud Axios API qatlamida bajarilgan.
