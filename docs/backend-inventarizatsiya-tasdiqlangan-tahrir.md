# Tasdiqlangan inventarizatsiyani tahrirlash

Sana: 24.10.2026. Backend dasturchiga yuborish uchun talab.

## Kerakli foydalanuvchi oqimi

1. Inventarizatsiya jadvalidagi tasdiqlangan hujjat ochiladi.
2. `Tahrirlash` bosilganda yaratish formasi mavjud mahsulotlar, sanalgan miqdorlar, ombor, sana va izoh bilan ochiladi.
3. Foydalanuvchi ma'lumotlarni o'zgartiradi. Bekor qilsa, ombor va hujjat o'zgarmaydi.
4. `Saqlash va tasdiqlash` → `Tasdiqlayman` bosilganda mavjud hujjat tahrirlanadi va qoldiqlar qayta hisoblanadi.
5. Jadval, hujjat tafsiloti, ombor qoldig'i va tegishli hisobotlarda yangi natija ko'rinadi.

## Hozir loyihada mavjud holat

- `GET /api/v1/inventory/stock-takes/{id}` — hujjat tafsiloti va qatorlari.
- `PATCH /api/v1/inventory/stock-takes/{id}` — repodagi `openapi.json` tavsifiga ko'ra **faqat DRAFT** uchun.
- `POST /api/v1/inventory/stock-takes/{id}/confirm` — tasdiqlash.
- `POST /api/v1/inventory/stock-takes/{id}/cancel` — tasdiq ta'sirlarini orqaga qaytarish.
- `POST /api/v1/inventory/stock-takes/{id}/restore` — bekor qilingan hujjatni qoralamaga qaytarish.

Tasdiqlangan hujjatni bir amalda tahrirlab, qayta hisoblaydigan endpoint mavjud tavsifda yo'q. Jonli backend kodi bu repoda yo'q; ommaviy `/api-json` manzili 404 qaytardi. Quyidagi endpoint taklif bo'lib, hali mavjud deb hisoblanmaydi.

## Backendga kerakli qo'shimcha

Tavsiya: `POST /api/v1/inventory/stock-takes/{id}/revise` — CONFIRMED hujjatni atomik tahrirlash va qayta tasdiqlash. Mavjud PATCH shu imkoniyat bilan kengaytirilsa ham bo'ladi, lekin qoidalari Swaggerda aniq yozilishi kerak.

Taklif etilayotgan tana:

```json
{
  "expectedVersion": 3,
  "date": "2026-10-24",
  "warehouseId": "warehouse-uuid",
  "type": "PARTIAL",
  "responsibleId": "user-uuid",
  "note": "Sanoqdagi xato tuzatildi",
  "items": [
    { "modificationId": "modification-uuid", "actualQuantity": 90 }
  ]
}
```

`expectedVersion` taklif qilinayotgan yangi maydon. Versiya yoki `updatedAt` orqali bir vaqtdagi tahrirlardan himoya kerak. Takror yuborilgan bitta so'rov qoldiqni ikki marta o'zgartirmasligi kerak.

### Hisob-kitob qoidalari

- Bitta tranzaksiyada eski inventarizatsiya ta'siri bekor qilinib, yangi natija qo'llansin. Hujjatning ID va raqami saqlansin; muvaffaqiyatdan keyin status `CONFIRMED` bo'lsin.
- Eski sanash vaqtiga tegishli boshlang'ich qoldiq asos qilib olinsin. Bugungi qoldiq yangi boshlang'ich qoldiq deb olinmasin.
- Misol: boshlang'ich qoldiq 0, xato sanoq 100, to'g'ri sanoq 90. Tahrir natijasi +90 bo'lishi kerak; +100 ustiga yana +90 qo'shilmasin. Oradagi sotuv/kirimlar yo'qolmasin.
- FIFO partiyalari, harakatlar, tannarx va ularga bog'liq hisobotlar izchil yangilansin. Mahsulot qatori o'chirilsa yoki almashtirilsa, uning eski ta'siri ham hisobga olinsin.
- Ombor yoki sana almashtirish qo'llansa, eski va yangi ombor/davr bir tranzaksiyada tekshirilsin. Qo'llanmasa, API cheklovni aniq qaytarsin va UI maydonni qulflaydi.
- Keyingi harakatlar, manfiy qoldiq yoki yopilgan davr sabab qayta hisoblash mumkin bo'lmasa, sababli xato qaytsin va hech qanday qisman o'zgarish qolmasin.
- Ruxsatlar, tenant chegaralari va audit tarixi tekshirilsin. Tarixda kim, qachon, nimani o'zgartirgani saqlansin.
- Frontenddan alohida `cancel → restore → PATCH → confirm` so'rovlarini yashirin yuborish atomik tahrir o'rnini bosmaydi: oraliq xato hujjat va qoldiqni noto'g'ri holatda qoldirishi mumkin.

### Javob va frontend ulanishi

- Muvaffaqiyatda yangilangan to'liq hujjat: `id`, `docNumber`, `status`, `version` yoki `updatedAt`, `date`, `warehouseId`, `type`, `responsibleId`, `note`, `items` qaytsin.
- Qatorlarda `modificationId`, sanalgan `actualQuantity`, boshlang'ich `expectedQuantity` va farqni hisoblash uchun kerakli qiymatlar bo'lsin. `modification` ma'lumotlari mavjud bo'lsa, mahsulot nomi/shtrix-kodi aniq ko'rsatiladi.
- Miqdor xatolari maydon yo'li bilan, parallel tahrir esa konflikt sifatida qaytsin. Xato javobida hujjatning avvalgi holati saqlansin.
- Endpoint tayyor bo'lgach, frontend aynan shu yaratish formasini tahrir uchun ham ishlatadi, POST yaratish o'rniga mavjud ID bo'yicha tahrir so'rovini yuboradi va muvaffaqiyatdan so'ng hujjat, ro'yxat, qoldiq hamda tegishli keshlangan ma'lumotlarni yangilaydi.
- Hozirgi yaratish formasida yuboriladigan miqdor `Math.max(sanalganMiqdor, joriyQoldiq)` bilan cheklanadi. Bu kodni tasdiqlangan hujjat tahririga ko'chirish mumkin emas: oldingi ortiqcha sanoqni kamaytirib tuzatish ishlamay qoladi. Tahrirning alohida backend qoidasi kerak.

## Qabul qilish tekshiruvlari

- Tuzatish miqdorni ko'paytirish va kamaytirishda to'g'ri ishlaydi.
- Bir nechta qator, qo'shish, o'chirish va mahsulotni almashtirish hisobga olinadi.
- Orada sotuv bo'lgan holatda u saqlanib qoladi yoki aniq sabab bilan butun tahrir rad etiladi.
- Rad etilgan, takrorlangan va parallel so'rovlar qoldiqni buzmaydi.
- Natija hujjat, jadval, ombor qoldig'i va hisobotlarda mos keladi.
