# Parolni pochta orqali tiklash

Frontend yo‘llari: `/login`, `/forgot-password`, `/reset-password?token=...`.
Tiklash sahifalari ochiq; brauzerda eski sessiya bo‘lsa ham ishlaydi.

So‘rovlar mavjud `VITE_API_BASE_URL` orqali yuboriladi:

- `POST /auth/forgot-password` — `{ username, workspace? }`.
- `POST /auth/reset-password` — `{ token, newPassword }`.

Do‘kon kodi kiritilmasa `workspace` yuborilmaydi. `workspace_required` kelganda
maydon majburiy bo‘ladi. `200` javobida login mavjudligi yoki pochtasi borligi
oshkor qilinmaydi. `mail.not_configured`, `reset_token_invalid` va validatsiya
xatolarida backend xabari ko‘rsatiladi. Reset muvaffaqiyatida mavjud auth storage
yordamchisi tokenlarni o‘chiradi va auth store’ni yangilaydi; login sahifasida
“Parol o‘zgardi” xabari chiqadi.

Xatdagi havolani backend yaratadi: `<frontend origin>/reset-password?token=<token>`.
Backendda frontend manzili sifatida amalda joylashtirilgan saytning HTTPS origin’i
sozlanishi kerak, `/login` yoki `/reset-password` qo‘shilmaydi. Bu repoda tasdiqlangan
production domeni berilmagan; `https://ye-post.vercel.app` foydalanuvchi talabida
faqat misol sifatida keltirilgan. Vercel’dagi mavjud SPA rewrite tiklash yo‘lini
to‘g‘ridan to‘g‘ri ochishni qo‘llaydi. Lokal frontend origin’i `http://localhost:5173`.

Serverda pochta sozlanmaguncha `503 errors.mail.not_configured` ko‘rsatilishi
kutilgan holat. Haqiqiy xat yuborishni tekshirish uchun backendda pochta sozlanishi
kerak.

Tekshiruv: `node --test tests/passwordRecovery.test.mjs tests/dokonKodi.test.mjs`.
Testlar API payloadlari, ommaviy yo‘llar, frontend validatsiyasi, backend xatolari,
do‘kon kodi ko‘chirilishi va resetdan keyingi sessiya tozalanishini qamraydi.
