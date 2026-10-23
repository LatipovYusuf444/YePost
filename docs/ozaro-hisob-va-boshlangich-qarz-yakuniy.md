# O'zaro hisob-kitob va boshlang'ich qarz — bajarilgan ishlar

**Sana:** 23.10.2026

**Murojaatlar:** Abdulaziz aka — 1048, 1053, 1057

**Holat:** frontend o'zgarishlari bajarildi va tekshirildi. Production muhitiga joylash ushbu ish doirasida bajarilmagan.

Bu hujjat oldingi ishlar va oxirgi birlashtirilgan talab bo'yicha bajarilgan o'zgarishlarni jamlaydi. Talab uchun oldingi `ozaro-hisob-dollar.md`, `boshlangich-qarz-bekor-qilish.md` va `ozaro-hisob-ikki-valyuta.md` o'rniga shu yakuniy hisobotdan foydalanish mumkin.

**Yakuniy yechim:** bitta **So'm / Dollar** tanlagichi. Ikki valyutani yonma-yon ko'rsatish varianti amalga oshirilmagan va yakuniy talabga kirmaydi.

## 1. O'zaro hisob-kitobda So'm / Dollar tanlovi

### Tuzatilgan muammo

Hisobot valyutasiz so'ralgani uchun backend standart `UZS` hisobotini qaytarardi. Dollar hujjatlari bu hisobotga tushmagani sababli dollar bilan ishlaydigan mijozlarda balans 0 so'm ko'rinardi.

### Bajarilgan ishlar

- Valyuta rejimi yoniq bo'lsa, sahifa tepasida **So'm / Dollar** tanlagichi chiqadi.
- Boshlang'ich tanlov — **So'm**.
- **So'm** tanlanganda hisobot `currency=UZS` bilan olinadi, summalar `so'm` bilan ko'rsatiladi.
- **Dollar** tanlanganda hisobot `currency=USD` bilan olinadi, summalar `$` bilan ko'rsatiladi.
- Valyuta rejimi o'chiq bo'lsa, tanlagich yashiriladi va hisobot `UZS` bilan ishlaydi.
- Tanlov xaridorlar va yetkazib beruvchilar hisobotlariga bir xil qo'llanadi.
- Backenddan kelgan summa kursga qayta aylantirilmaydi; dollar summalarining kasr qismi saqlanadi.
- Valyuta almashayotganda oldingi summalar yangi valyuta belgisi bilan ko'rsatilmaydi.
- Excel yuklashga ham tanlangan `currency` uzatiladi.

### Hujjatlar ro'yxati

- Hisobotdagi kontragent nomini bosganda uning hujjatlari alohida oynada ochiladi.
- Hujjatlar aynan tanlangan valyutada so'raladi.
- Hujjat raqami, turi, sanasi, debet, kredit va backend qaytargan qoldiq ko'rsatiladi.
- Qoldiq frontendda qayta hisoblanmaydi.
- So'rov bajarilayotganda yuklanish holati, xatoda qayta yuklash tugmasi chiqadi.
- Tanlangan valyutada hujjat bo'lmasa, tushunarli bo'sh holat ko'rsatiladi.

### Ishlatilgan API

```http
GET /settings/currency
GET /reports/counterparty-balance?currency=UZS|USD
GET /reports/counterparty-balance/:counterpartyType/:counterpartyId/documents?currency=UZS|USD
GET /reports/counterparty-balance?currency=UZS|USD&export=excel
```

Mavjud kontragent turi va tanlangan mijoz/yetkazib beruvchi filtrlari tegishli so'rovlarda saqlanadi.

## 2. Boshlang'ich qarzni bekor qilish

### Bajarilgan ishlar

- Boshlang'ich qarz tafsilotiga **Bekor qilish** tugmasi qo'shildi.
- Shu tafsilot oynasi mijoz kartasidan ham, boshlang'ich qarz ochilgan sotuvlar ro'yxatidan ham ishlaydi.
- Tugma faqat quyidagi shartlarda ko'rinadi:
  - `isOpeningDebt: true`;
  - `status: "CONFIRMED"`;
  - foydalanuvchi `DIREKTOR`, yoki faol `RETURN_CANCEL` granti bor `ADMIN`.
- DIREKTOR uchun grant shart emas. ADMIN da `RETURN_CANCEL` granti yo'q yoki faol bo'lmasa, tugma ko'rinmaydi.
- Boshlang'ich qarz va oddiy sotuv uchun bir xil umumiy rol/grant funksiyasi ishlatiladi. Oddiy sotuvning mavjud ruxsat qoidalari saqlangan.
- Server `403 errors.common.forbidden` qaytarsa, tafsilot oynasi va xato xabarida **Ruxsat yo'q** chiqadi. Hujjat bekor qilingan deb belgilanmaydi.
- Tasdiqlash oynasida hujjat raqami va o'z valyutasidagi summa chiqadi. Masalan:

  > QB-000001 ($1 879.25) bekor qilinsinmi?

- Tasdiqlashdan oldin bekor qilish so'rovi yuborilmaydi.
- Amal bajarilayotganda takroriy so'rov yuborish bloklanadi.
- Muvaffaqiyatdan keyin hujjat va unga bog'liq ro'yxatlar yangilanadi.
- Bekor qilingan boshlang'ich qarzda bekor qilish va to'lash tugmalari yashiriladi.
- Bekor qilingan boshlang'ich qarz uchun sotuvlar jadvallaridagi **Qayta tiklash** tugmasi yashiriladi. Oddiy sotuvlarda bu tugma saqlangan.
- Bekor qilingan qarzni qayta tiklab bo'lmasligi haqida izoh ko'rsatiladi.
- Yopilgan davr uchun backendning `423` xatosi tushunarli matn bilan ko'rsatiladi; hujjat muvaffaqiyatli bekor qilingandek belgilanmaydi.
- Yangi bekor qilish matnlari o'zbek va rus tillariga qo'shildi.

### Ishlatilgan API va backend chegarasi

```http
POST /sales/:id/cancel
```

Frontend mavjud bekor qilish endpointidan foydalanadi. Backend `@Grants(RETURN_CANCEL)` orqali ruxsatni qayta tekshiradi: DIREKTOR o'tadi, ADMIN uchun faol grant kerak. To'lov qilingan qarzni bekor qilish mumkinligi va yopilgan davr cheklovi ham backend tomonidan tekshiriladi.

Backend bergan qoidalarga ko'ra, boshlang'ich qarz bekor qilinganda Telegram xabari yuborilmaydi, ombor va kassaga ta'sir bo'lmaydi. Frontend bu amal uchun alohida Telegram, ombor yoki kassa so'rovlarini yubormaydi. Qayta tiklash endpointi chaqirilmaydi.

## 3. Tekshiruv natijalari

| Tekshiruv | Natija |
| --- | --- |
| Avtomatik testlar | 353 ta o'tdi, 0 ta xato |
| O'zgargan frontend fayllarining ESLint tekshiruvi | O'tdi |
| TypeScript va production build | O'tdi |
| Brauzerda So'm / Dollar almashishi | Sinov ma'lumotlarida tekshirildi |
| Dollar kursi kiritilmagan holatda USD hisobot | Tekshirildi; backend summasi qayta aylantirilmadi |
| Hujjatlar va Excelga valyuta uzatilishi | USD va UZS holatlarida tekshirildi |
| Valyuta rejimi o'chiq do'kon | Tanlagich yashirildi, UZS ishladi |
| Grantsiz yoki faol bo'lmagan grantli ADMIN | Tugma yashirilgani sinovda tekshirildi |
| Faol RETURN_CANCEL grantli ADMIN | Bekor qilish sinovda ishladi |
| DIREKTOR | Grant bo'lmasa ham ruxsat berilishi tekshirildi |
| Serverda ruxsat yo'q — HTTP 403 | Ruxsat yo'q xabari chiqdi; hujjat CONFIRMED holatida qoldi |
| Tasdiqlashdan qaytish | Bekor qilish so'rovi yuborilmadi |
| Tasdiqlash va muvaffaqiyat | Bitta POST yuborildi, hujjat CANCELLED bo'ldi |
| Yopilgan davr — 423 | Xabar ko'rsatildi, hujjat CONFIRMED holatida qoldi |
| Oddiy sotuvni qayta tiklash | Mavjud tugma saqlangan |

Build muvaffaqiyatli yakunlandi; JavaScript paketining hajmi bo'yicha Vite ogohlantirishi mavjud.

Ruxsatlar bo'yicha dastlabki mock sinovda backend grant tekshiruvi hisobga olinmagan edi. Bu xato tuzatildi: endi grant yo'qligi, faol emasligi, faol grant, DIREKTOR va HTTP 403 holatlari alohida tekshirilgan. Brauzerda mahalliy sinov serveridan foydalanildi; production backend guardi ushbu ishda bevosita sinovdan o'tkazilmagan.

## 4. Haqiqiy QB-000001 holati

**Haqiqiy bazadagi QB-000001 ushbu ish davomida bekor qilinmagan.** Kerakli ADMIN/DIREKTOR sessiyasi mavjud bo'lmagani uchun real ma'lumotlarga o'zgartirish kiritilmadi. Brauzer tekshiruvlari alohida sinov ma'lumotlari bilan bajarildi.

Vakolatli foydalanuvchi xato hujjatni yangi tugma orqali yoki quyidagi so'rov bilan bekor qilishi kerak:

```http
POST /sales/d03f90c9-5fd1-4b36-a1f1-b206df74e7fa/cancel
```

| Hujjat | Summa | Kerakli amal |
| --- | --- | --- |
| QB-000001 | $1 879.25 | Xato hujjat — bekor qilish kerak |
| QB-000002 | $1 979.25 | To'g'ri hujjat — saqlanadi |

Murojaatda ko'rsatilgan ikki hujjat bo'yicha, QB-000001 muvaffaqiyatli bekor qilingach qoladigan qarz **$1 979.25** bo'ladi. Bu natija sinov ma'lumotlarida tekshirildi; real mijoz balansi alohida tekshirilishi kerak.

## 5. O'zgarishlar doirasi

Backend kodi o'zgartirilmagan. Frontenddagi o'zgarishlar ushbu ikki vazifa va ularning testlari doirasida bajarilgan.

Asosiy fayllar:

- `src/Pages/HisobotUchot/OzaroHisobKitob.tsx`
- `src/Pages/HisobotUchot/HisobKitobHujjatlariModal.tsx`
- `src/Pages/HisobotUchot/hisobKitobHujjatlari.ts`
- `src/api/reportsApi.ts`
- `src/types/reports.ts`
- `src/Pages/XaridorUchot/BoshlangichQarzTafsilotlariModal.tsx`
- `src/lib/boshlangichQarz.ts`
- `src/lib/hujjatRuxsati.ts`
- `src/hooks/useHujjatniOchirishMumkinmi.ts`
- `src/api/sozlamalarApi.ts`
- `src/Pages/Savdo/SotuvlarJadvali.tsx`
- `src/Pages/Savdo/BekorQilinganlar.tsx`
- `src/i18n/locales/uz/xaridor_uchot.json`
- `src/i18n/locales/ru/xaridor_uchot.json`

Yangi testlar:

- `tests/counterpartyBalance.test.mjs`
- `tests/hisobKitobHujjatlari.test.mjs`
- `tests/boshlangichQarzBekor.test.mjs`
- `tests/salesCancelPermissionError.test.mjs`
- `tests/helpers/balanceReportClient.mjs` — API so'rovlarini tekshirish uchun sinov yordamchisi.
