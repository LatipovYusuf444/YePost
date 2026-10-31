# Dona birligi va nakladnoydagi korobka

Koeffitsient tahrirlagichi faqat do‘konning `/catalog/units` ro‘yxatidan
foydalangan. “Dona” hali do‘konda yaratilmagan bo‘lsa, tanlovda chiqmagan.
Endi bunday holatda ham “Dona” tanlovi bor. U tanlanganda avval mavjud birlik
qayta tekshiriladi, kerak bo‘lsa mavjud endpoint orqali yaratiladi:

```json
POST /catalog/units
{ "code": "H87", "name": "Dona", "shortName": "dona", "isFractional": false }
```

Keyingi so‘rovlarga faqat backend qaytargan haqiqiy `id` yuboriladi. Mavjud
`H87`, `dona` yoki `шт.` birligi takror yaratilmaydi. Yaratishda 403 yoki boshqa
xato bo‘lsa, xabar ko‘rsatiladi va qatorning birligi o‘zgarmaydi. Asosiy birlik
“Dona” bo‘lsa, u koeffitsient ×1 bilan alohida ko‘rsatiladi; qo‘shimcha birlik
sifatida takrorlashga ruxsat berilmaydi.

Bu qoida mahsulot kartasidagi va alohida “Birliklar” oynasidagi tahrirlagichga
ulangan. Yaratish davomida saqlash bloklanadi. Mavjud
`PUT /catalog/products/:id/units { units: [...] }` formati saqlangan; asosiy
birlik bu massivga kiritilmaydi. `factor`, `canReceive`, `canSell`, narxlar va
shtrix-kodning backend formati o‘zgarmagan.

## Nakladnoy

Frontend nakladnoyining ko‘rinishi, brauzerdan chop etish va mahalliy PDF
generatorida birlik oldin doim “dona”, miqdor va narx asosiy birlikda chiqardi.
Endi saqlangan sotuv qatoridagi `unitId`, `unitName`, `unitQuantity`, `unitPrice`
birgalikda ishlatiladi. Eski birliksiz qatorlar asosiy birlikda qoladi;
`baseUnitName` mavjud bo‘lsa ishlatiladi. Birlik nomi yo‘q bo‘lsa, unga taxminan
“korobka” yoki “dona” yozilmaydi.

Sinov misoli: 1 korobka = 12 dona; sotuv 2 korobka. Backend qatori
`quantity=24, price=3000, unitQuantity=2, unitPrice=36000, unitName=korobka`.
Nakladnoyda **2 korobka × 36 000** ko‘rsatiladi. 200 chegirma uchun jami
**71 800** saqlanadi. Bu tuzatish qoldiq, sotuv payloadi yoki moliyaviy hisobni
o‘zgartirmaydi.

### Server yaratadigan PDF chegarasi

`GET /sales/:id/nakladnoy.pdf` orqali olinadigan PDF va Telegramga yuboriladigan
nakladnoyni backend yaratadi. Ushbu endpoint va yuborish oqimi o‘zgartirilmagan.
Server PDF’i ham yuqoridagi saqlangan `unit*` maydonlaridan foydalanishi kerak.
Backend manba kodi va haqiqiy server PDF namunasi bu repoda bo‘lmagani uchun
uning ichki shakllantirishini shu frontend tuzatishi bilan tasdiqlab bo‘lmaydi.

## Tekshiruv

`tests/donaNakladnoy.test.mjs` haqiqiy komponent va handlerlarni ishlatadi:
birlikni qayta ishlatish/yaratish, 409 va 403, haqiqiy ID bilan PUT payloadi,
nakladnoy jadvali, HTML chop etish, PDF matni va PDF obyekt offsetlari.
Sinov hujjati xotirada yaratiladi; haqiqiy do‘kon, sotuv va qoldiq o‘zgartirilmaydi.

`node --test tests/*.test.mjs` — 529 test o‘tdi. To‘liq ESLint tekshiruvi o‘tdi.
