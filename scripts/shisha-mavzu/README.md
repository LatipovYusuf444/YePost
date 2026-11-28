# "Shisha" rejimi — CSS generatori

Ikkinchi ko'rinish rejimi (`data-theme="shisha"`). Iliq interyer fotosurati (`public/mavzu/shisha-fon.webp`) ustida tutunli shisha
oyna, shisha yon panel va yuqori panel, oq "pill" asosiy tugmalar va oq matn. Asosiy rejim (`default`) bu blokka tegmaydi.

Ranglar asosiy layoutda qo'llanadi: `AsosiyPanel` `useShishaSahifa("ilova")` chaqiradi va `html[data-shisha-sahifa]` atributi
qo'yiladi — yon paneldagi barcha sahifalar, ularning modallari va ochiladigan ro'yxatlari. Login va admin qismlari asosiy ko'rinishda.

## Fon rasmi

`public/mavzu/shisha-fon.webp` — Unsplash fotosurati (https://unsplash.com/photos/ — `photo-1600607687939-ce8a6c25118c` — yog'och devorli zamonaviy ochiq xona, Unsplash License:
tijoriy foydalanish bepul, mualliflikni ko'rsatish shart emas), 1920×1306, webp. Almashtirish uchun shu nomdagi faylni almashtirish
kifoya; hajmi 300 KB dan kichik bo'lsin (test tekshiradi).

## Fayllar

- `shablon.css` — qo'lda yozilgan qism:
  - o'zgaruvchilar: `--s-*`, sutli `--yp-*`, slate/gray 50–800, shadcn va `--theme-*`;
  - fon rasmi;
  - yon panel, yuqori panel, asosiy oyna;
  - ochiladigan ro'yxatlar;
  - to'lov tugmalari;
  - jadvallar;
  - mobil dock.
- `generatsiya.mjs` — ildiz fayllardan import daraxti bo'ylab Tailwind rang klasslarini yig'adi va har biriga shisha juftini
  `:where(...)` qoidasi sifatida yaratadi (aniqlik (0,1,0) — hover/fokus ustun qoladi). Qayta ishlaydigan klasslar:
  - inline qiymatli ranglar: orange/gold/cream (loyihaning ko'ki), blue/sky/indigo, hex;
  - `bg-white`;
  - semantik ranglarning och fonlari.

  Natijani `src/index.css` dagi `/* SHISHA-MAVZU:BOSHI/OXIRI */` orasiga `@media screen` ichida yozadi (chop etish oq qoladi).
  Qayta ishga tushirsa ham bir xil natija beradi.

## Qayta yaratish (yangi sahifa yoki klass qo'shilganda)

Inventar butun router daraxtidan olinadi:

```sh
node scripts/shisha-mavzu/generatsiya.mjs src/routes/AppRouter.tsx
```

Qo'llab-quvvatlanadigan variantlar:
- holatlar: `hover:`, `focus:`, `disabled:` va boshqalar;
- ekran va container: `sm:`/`md:`…, `@min-[900px]/cart:`;
- atributlar: `data-[state=active]:`, `aria-expanded:`;
- ajdod: `group-hover:`, `group-data-[...]/nom:`, `in-data-[...]:`;
- `before:`/`after:`/`placeholder:`, ixtiyoriy avlod `[&_thead]:` va `!` important.

Tashlab ketiladiganlar: `dark:`, `peer-*`, `has-*`.

Brend urg'usi (loyihaning orange/gold/blue/sky/indigo nomlari):
- interaktiv elementda (`button`, `a`, `role=tab`…) — oq pill + to'q matn;
- statik elementda (karta, plitka, belgi) — yorqinroq shisha, matn oq.

Brauzerda tekshirish: och sirt qolmagan, to'q ustida to'q matn yo'q, ochiladigan ro'yxatlar va oynalar o'qiladi.

## Tuzoqlar

- `text-white` va `bg-white` bitta `--color-white` dan foydalanadi. O'zgaruvchi oq qoladi, `bg-white` esa alohida qoida bilan shishaga
  o'tadi.
- orange/gold/cream `@theme inline` — qiymat klassga yozilgan, o'zgaruvchi orqali almashtirib bo'lmaydi (klass qoidasi kerak).
- Yuqori panelga `backdrop-filter` to'g'ridan-to'g'ri qo'yilmaydi: ichidagi `fixed inset-0` yopish qatlami panel ichiga qamalib
  qoladi. Xiralashtirish `::before` qatlamida qilinadi.
- Och "pill" fon ustidagi matn to'q bo'lishi kerak: generator `qattiq` qiymatlar uchun `color` va ichki `text-white` qoidasini
  qo'shadi.
