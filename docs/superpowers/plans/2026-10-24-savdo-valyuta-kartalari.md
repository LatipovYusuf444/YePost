# Savdo valyuta kartalari

Maqsad: boshqaruvdagi savdo kartalarida UZS va USD tovar savdosi, haqiqiy qabul qilingan to'lovlar va qarzdorlikni alohida ko'rsatish. Summalar boshqa valyutaga aylantirilmaydi.

- Tovarlar: tasdiqlangan oddiy sotuvlar, hujjat sanasi bo'yicha; `totalsByCurrency`, bo'lmasa `items[].currency` va qator summalari.
- To'lovlar: tasdiqlangan sotuvlar va boshlang'ich qarzlar, to'lovning o'z sanasi va valyutasi bo'yicha; CASH/CARD/BANK. BALANCE va DEBT yangi pul kirimi emas. Qaytim alohida ko'rsatiladi; bu sof kassa qoldig'i emas.
- Qarz: backendning `debtAmount` maydoni, sotuv valyutasida. Boshlang'ich qarz aylanmaga kirmaydi.
- Sana: Toshkent kuni. Dollarda sentlar saqlanadi.
- To'liq ro'yxat olinadi; qisqa ro'yxatda yo'q tafsilotlar mavjud detail API orqali to'ldiriladi. Yetishmagan yoki xato ma'lumot nolga aylantirilmaydi.
- Eski `sales/summary` ning valyutasiz pul maydonlari ishlatilmaydi; sotuvlar soni va kunlik chiziq uchun ishlatish mumkin.

Ishlar:
1. Pul va sana qoidalariga regressiya testlari; sof hisoblash modeli va tafsilotlarni yuklash.
2. Kartalarni alohida UZS/USD summalariga ulash, tarjimalar, ro'yxat to'liqligini tekshirish.
3. Testlar, lint, build, ochiq brauzerda kartalarni tekshirish; backend uchun zarur maydonlarni hujjatlashtirish.

Tekshiruv natijasi: mavjud backendning ro'yxat/detail API javoblari yetarli. Ochiq sahifada 2026-09-24..2026-10-24 uchun USD tovar savdosi 2391.30, USD tushum 3.00, USD qarz 1176.50 ko'rindi. Yangi endpoint shart emas. Katta bazada tezlatish uchun ayni ta'riflar bo'yicha server agregati keyinchalik qo'shilishi mumkin.
