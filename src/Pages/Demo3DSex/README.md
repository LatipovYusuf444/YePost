# 3D sex — Demo

Manzil: `/demo/3d-sex` (kirish talab qilinmaydi, backendga so'rov yubormaydi). Ishga tushirish: `npm run dev` → `http://localhost:5173/demo/3d-sex`.

## Tuzilish

| Fayl | Vazifasi |
|---|---|
| `sexModeli.ts` | Ma'lumot modeli: `StanokTavsifi` (barqaror `id`, tur, joy), `StanokHolati` (texnik holat, joriy topshiriq, navbat, `yangilangan`, `aloqa`), `SexManbasi` interfeysi. UI'siz. |
| `demoManbasi.ts` | **Demo manba** (sinov ma'lumotlari): soniyalik ssenariy, Pauza / Davom ettirish / Qayta boshlash. UI'siz, vaqt tashqaridan beriladi (testlar). |
| `SexSahnasi.tsx` | 3D sahna (React Three Fiber + drei). Ma'lumotni faqat props orqali oladi — demo yoki Ye-Post manbasiga bog'liq emas. |
| `index.tsx` | Sahifa: sarlavha, "Demo — sinov ma'lumotlari" belgisi, kamera tugmalari, ma'lumot paneli, stanoklar ro'yxati, hodisalar, demo boshqaruvi. |
| `matnlar.ts` | uz/ru matnlar (`demo_sex` namespace, modul ichida yuklanadi). |

Three.js faqat shu sahifa ochilganda yuklanadi (alohida bo'lak) — ilovaning qolgan qismi og'irlashmaydi.

## Ye-Post ma'lumotiga ulash (keyingi bosqich)

`SexManbasi` interfeysini amalga oshiradigan yangi manba yozish kifoya (masalan ishlab chiqarish moduli smenalari / buyurtma bosqichlaridan):

- `StanokTavsifi.id` — Ye-Post'dagi ish markazi (stanok) ID'si;
- `StanokHolati.holat` — texnik holat (`ishlayapti` / `pauza` / `bosh` / `nosoz`), `sabab` — pauza sababi;
- `StanokHolati.joriy` / `navbat` — buyurtma raqami, detal, operatsiya, bajarilgan / jami miqdor;
- `StanokHolati.yangilangan` va `aloqa` — oxirgi ma'lumot vaqti; aloqa yo'q bo'lsa sahna "Ma'lumot eskirgan" deb ko'rsatadi.

`index.tsx` da `new DemoSexManbasi()` o'rniga shu manba berilsa, sahna o'zgarishsiz ishlaydi.

## 3D modellar

Barcha stanoklar va sex jihozlari **kod bilan (three.js geometriyasi) yasalgan**, tashqi `.glb` fayl yoki havola yo'q:

- format-kesish stanogi — korpus, uzun suriladigan karetka, ko'ndalang stol, aylanuvchi arra, ustki himoya, pult;
- CNC frezer (nesting) — vakuum stol, relslar, harakatlanuvchi portal va shpindel, boshqaruv shkafi;
- qirra yopishtirish stanogi — uzun korpus, konveyer, bosim roliklari, elim idishi, lenta rulon, shaffof qopqoq;
- burg'ilash stanogi — stol, portal, uch shpindelli tushib-ko'tariluvchi kallak;
- qadoqlash joyi — stol, qutilar, aylanma stretch-o'rash stoli va minorasi;
- material ombori (stellajlar, LDSP listlar), tayyor mahsulot zonasi (paletlar), yo'laklar, ustunlar, devorlar.

Tayyor modellar qidirildi: litsenziyasi aniq (CC0) to'plamlardan eng yaqini — Kenney "Conveyor Kit" / "Factory Kit" (CC0, kenney.nl). Lekin ular umumiy o'yin uslubidagi zavod jihozlari (mebel sexi stanoklari — format-kesish, CNC router, qirra yopishtirish — yo'q) va yuklab olish havolasi to'g'ridan-to'g'ri emas (sayt JS / xayriya oynasi orqali beradi). Shu sababli stanoklar kod bilan yasaldi — litsenziya masalasi yo'q.
