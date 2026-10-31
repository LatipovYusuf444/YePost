# Minusga sotish — frontend

`Sozlamalar → Ombor` bo‘limida do‘kon holati va joriy foydalanuvchining ruxsati
`GET /settings/inventory` orqali ko‘rsatiladi. Ilovaga kirilganda va sahifa
almashganda sozlama yangilanadi. Sessiya almashsa ruxsatlar tozalanadi; eski
foydalanuvchi uchun kech kelgan so‘rov yangi sessiyaga qo‘llanmaydi.

`NEGATIVE_STOCK_SALE` xodim ruxsatlari ro‘yxatlariga qo‘shilgan. Saqlash
`PUT /accounts/grants/users/:userId { codes: [...] }` orqali bajariladi.
Oldingi faol kodlar, jumladan UI tanimaydigan kodlar ham saqlanadi.
Direktor uchun shaxsiy grant talab qilinmaydi. Sotish imkoniyati UI’da
rol orqali taxmin qilinmaydi: backendning `canSellNegative` qiymati ishlatiladi.

Mavjud tasdiqlash endpointlari va payloadlari saqlangan. Umumiy Axios
javob qatlamida, DTO o‘rovdan ajratilishidan oldin:

- Sotuv tasdiqlash, chiqim tasdiqlash va ko‘chirish jo‘natishdagi
  `warnings[code=NEGATIVE_STOCK]` sariq xabar chiqaradi.
- Kirim tasdiqlash, ko‘chirish qabul qilish va inventarizatsiya tasdiqlashdagi
  `closedNegative` yashil xabar chiqaradi. Sozlama o‘chirilganida ham ishlaydi.
- Oddiy DTO hamda `{ data: DTO, warnings, closedNegative }` javoblari qo‘llanadi.
- Mahsulot qatorlarida `wentNegative`, sotuvda `costEstimated` belgisi ko‘rsatiladi.

Qoldiq, harakat hisoboti, mahsulot kartasi va sotuv tafsilotlari manfiy sonlarni
0 ga kesmaydi; ular qizil `−3` shaklida ko‘rsatiladi. “Minusda” filtri
`balanceStatus=NEGATIVE` yuboradi. Harakat hisobotida serverning `closingBalance`
qiymati ombor/variant bo‘yicha saqlanadi. Inventarizatsiya tizim qoldig‘i ham
manfiy bo‘lishi mumkin: −3 tizim, 5 sanoq uchun farq +8.

Frontend qoldiq cheklovlari faqat `canSellNegative=true` bo‘lganda ochiladi;
sozlama o‘chiq yoki ruxsat yo‘q bo‘lsa mavjud cheklovlar saqlanadi. Yakuniy
qarorni server beradi. `out_of_stock` hamda `negative_stock_forbidden` xabarlari
backenddagi mahsulot nomi va shtrix-kodi bilan saqlanadi. Mavjud
`negative_stock_after` xato tarjimasi sana va yetishmovchilikni ko‘rsatadi.
Ixtiyoriy `/inventory/stock-check` oldindan tekshiruvi qo‘shilmagan.

## Yoqish tartibi

Hozir `VITE_NEGATIVE_STOCK_ENABLE_READY` qiymati berilmagan yoki `false`:
do‘konlarda yoqish tugmasi bloklangan, `PATCH true` ham frontend API qatlamida
yuborilmaydi. Avval serverda o‘tgan sanaga minusga sotish/chiqim/ko‘chirish
cheklovi chiqqanini tasdiqlash kerak. Shundan keyin frontend joylashtirish
muhitida `VITE_NEGATIVE_STOCK_ENABLE_READY=true` berilib qayta build qilinadi.
Bu faqat tugmani ochadi: do‘kon sozlamasini avtomatik yoqmaydi.
`PATCH /settings/inventory`ni server faqat DIRECTOR/ADMIN uchun qabul qiladi.
Oldindan yoqilgan do‘konni o‘chirish imkoniyati saqlangan.

Haqiqiy do‘kon sozlamalari va hujjatlari ushbu ish davomida o‘zgartirilmadi.
Keyingi kirim eski sotuv tannarxi/foydasini frontendda qayta hisoblamaydi.

Testlar: `node --test tests/*.test.mjs`. Production tekshiruv: `npm.cmd run build`.
