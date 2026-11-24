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
| `SexMuhiti.tsx` | Sex ichi: pol, yo'laklar, devorlar, ustunlar, chang so'rish, usta xonasi, stellajlar, tayyor mahsulot zonasi. |
| `Ishchilar.tsx` | Odamlar (ishchi, usta, qorovul, haydovchi) va pogruzchik; har stanokda operator, stanok ishlamasa tik turadi. |
| `hudud.ts` | Zavod hududi rejasi: panjara, darvoza, KPP, shlagbaum, ko'chalar, rampalar, avtoturargoh (koordinatalar). |
| `Shaharcha.tsx` | Tashqi muhit: ko'chalar, trotuar, hudud asfalti va maysalar, panjara, KPP, bayroq, shahar binolari, daraxtlar, chiroqlar. |
| `Transport.tsx` | Logistika: yuk mashinalari (reys ma'lumotidan), rampa pogruzchiklari, shlagbaum, qorovul, chap darvoza, ko'chadagi avtomobillar. |
| `yollar.ts` | Yuk mashinasi marshrutlari (ko'cha → KPP → hovli → rampaga orqa bilan) va tezlik hisobi. UI'siz — testda tekshiriladi. |
| `materiallar.ts`, `shaharMateriallari.ts`, `geometriyalar.ts`, `shakllar.tsx` | Materiallar va teksturalar (canvas), umumiy geometriyalar, `Yumaloq`, `StatikGuruh`. |

Three.js faqat shu sahifa ochilganda yuklanadi (alohida bo'lak) — ilovaning qolgan qismi og'irlashmaydi.

## Ye-Post ma'lumotiga ulash (keyingi bosqich)

`SexManbasi` interfeysini amalga oshiradigan yangi manba yozish kifoya (masalan ishlab chiqarish moduli smenalari / buyurtma bosqichlaridan):

- `StanokTavsifi.id` — Ye-Post'dagi ish markazi (stanok) ID'si;
- `StanokHolati.holat` — texnik holat (`ishlayapti` / `pauza` / `bosh` / `nosoz`), `sabab` — pauza sababi;
- `StanokHolati.joriy` / `navbat` — buyurtma raqami, detal, operatsiya, bajarilgan / jami miqdor;
- `StanokHolati.yangilangan` va `aloqa` — oxirgi ma'lumot vaqti; aloqa yo'q bo'lsa sahna "Ma'lumot eskirgan" deb ko'rsatadi.

`index.tsx` da `new DemoSexManbasi()` o'rniga shu manba berilsa, sahna o'zgarishsiz ishlaydi.

### Logistika (yuk mashinalari)

`SexManbasi.reyslar?()` ixtiyoriy — `Reys[]` qaytaradi (KPP jurnali / jo'natma hujjatlaridan to'ldiriladi):

- `raqam` — davlat raqami; `yonalish` — `jonatish` (tayyor mahsulot olib ketadi) yoki `qabul` (material olib keladi); `rampa` — 1 yoki 2;
- `bosqich` — `kelmoqda` → `rampada` → `ketmoqda` → `yoq`, `boshlangan` — bosqich boshlangan vaqt (ms): sahna mashina harakatini shu vaqtdan hisoblaydi;
- `yuk`, `palet` / `jamiPalet` — yuklangan (yoki tushirilgan) paletlar.

Demo manbada ikki reys 80 soniyalik davr bilan aylanadi (`LOGISTIKA`), ikkinchisi 19 s siljigan — testda butun davr bo'yi ikki mashina orasidagi masofa ≥ 6 m ekani tekshiriladi.

## 3D modellar

Barcha stanoklar va sex jihozlari **kod bilan (three.js geometriyasi) yasalgan**, tashqi `.glb` fayl yoki havola yo'q:

- format-kesish stanogi — korpus, uzun suriladigan karetka, ko'ndalang stol, aylanuvchi arra, ustki himoya, pult;
- CNC frezer (nesting) — vakuum stol, relslar, harakatlanuvchi portal va shpindel, boshqaruv shkafi;
- qirra yopishtirish stanogi — uzun korpus, konveyer, bosim roliklari, elim idishi, lenta rulon, shaffof qopqoq;
- burg'ilash stanogi — stol, portal, uch shpindelli tushib-ko'tariluvchi kallak;
- qadoqlash joyi — stol, qutilar, aylanma stretch-o'rash stoli va minorasi;
- material ombori (stellajlar, LDSP listlar), tayyor mahsulot zonasi (paletlar), yo'laklar, ustunlar, devorlar.

Odamlar, yuk mashinalari, avtomobillar, KPP, shahar binolari (ko'p qavatli uylar, ofislar, omborlar, mahalla uylari), daraxtlar ham kod bilan; fasad, asfalt, maysa, panjara, bayroq, davlat raqami teksturalari canvas'da chiziladi. Osmon — drei `Sky` (shader), metall aksi — `Environment` + `Lightformer` (tarmoqqa so'rov yo'q).

Tezlik: qimirlamaydigan qismlar (`StatikGuruh`) material bo'yicha bitta geometriyaga birlashtiriladi; daraxt, chiroq, panjara ustunlari va avtomobillar — instancing; odam qismlari umumiy geometriyadan. Natija (o'lchangan): umumiy ko'rinish ~680, hudud ~800 draw call.

Tayyor modellar qidirildi: litsenziyasi aniq (CC0) to'plamlardan eng yaqini — Kenney "Conveyor Kit" / "Factory Kit" (CC0, kenney.nl). Lekin ular umumiy o'yin uslubidagi zavod jihozlari (mebel sexi stanoklari — format-kesish, CNC router, qirra yopishtirish — yo'q) va yuklab olish havolasi to'g'ridan-to'g'ri emas (sayt JS / xayriya oynasi orqali beradi). Shu sababli stanoklar kod bilan yasaldi — litsenziya masalasi yo'q.
