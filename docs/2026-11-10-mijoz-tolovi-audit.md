# Mijoz to'lovi: frontend va backend tekshiruvi

Sana: 2026-11-10. Quyidagi audit dastlab diagnostika sifatida bajarilgan. Keyin foydalanuvchi topshirig'i bilan frontend tuzatishlari kiritildi; biznes ma'lumotlar va backend kodi o'zgartirilmadi.

## Frontendda bajarilgan tuzatishlar

- `docType` va `refId` backend javobidan olinadi; boshlang'ich qarz, to'lov, hisob harakati va qaytim nomlari ko'rsatiladi.
- Kassada mijoz to'lovi o'z KAS raqami bilan chiqadi; bog'langan QB hujjati "Boshlang'ich qarz" deb ajratiladi. O'zbekcha va ruscha nomlar qo'shildi.
- Kassa ekranda yangidan eskiga chiqadi; mavjud K1/K2 raqamlash tartibi saqlanadi.
- Xaridorlar kartasi va tafsilotida UZS/USD yakuniy qoldiqlar o'zaro hisob-kitob hisobotidan olinadi. Qarz qizil, avans yashil; valyutalar bir-biriga qo'shilmaydi. Hisobot yuklanmasa, soxta nol ko'rsatilmaydi.
- "Faqat qarzdorlar", so'm yoki dollar qarzi bo'yicha kamayish tartibida saralash qo'shildi. Kartadagi summa yoki mijoz nomi bosilganda tegishli hisob-kitob hujjatlari ochiladi; ma'lumotlar tugmasi mijoz tafsilotlarini ochadi.
- Kartada va tafsilotda "To'lov qabul qilish" tugmasi kassani yangi mijoz to'lovi oynasi bilan ochadi; mijoz oldindan tanlanadi. Yopilganda yoki saqlanganda URLdagi tanlov tozalanadi.
- Yangi kassa hujjatida bo'sh izoh o'rniga avtomatik ravishda tarjima qilingan nomni izohga nusxalash to'xtatildi; foydalanuvchi kiritgan izoh saqlanadi.

KAS kreditining $0 chiqishi, taqsimot yozuvlarining sana/raqami va Telegram xabarnomasi backend vazifasi bo'lib qoladi. Quyidagi bandlar dastlab topilgan sabablarni hujjatlashtiradi.

Frontend tuzatishlaridan keyin: tegishli regressiya va jadval tekshiruvlari **70/70 o'tdi**, o'zgargan TypeScript/TSX fayllar ESLintdan o'tdi, `npm run build` muvaffaqiyatli yakunlandi. Ishlab turgan serverda autentifikatsiyali tekshiruv bajarilmadi.

## Tekshiruv chegarasi

- Frontend: YePost, `2fc0f73`, 2026-11-09.
- Backend: `itskamol/pos-backend`, `origin/main`, `09f9d3698afd77cf6eaf5d11cc9859cc7998e68a`, 2026-11-09. Lokal backend checkout eski bo'lgani uchun `git fetch origin main --no-tags` bajarildi va yangi kod `git show` orqali o'qildi; checkout o'zgartirilmadi.
- Berilgan mijozning `/partners/customers/:id` va `/reports/counterparty-balance/CUSTOMER/:id/documents?currency=USD` jonli endpointlari autentifikatsiyasiz `401` qaytardi. Ulangan brauzer sessiyasi mavjud emas. Shuning uchun $700, 23 ta savdo, QB sanasi va 31.10 dagi $400 juftligi bazadan mustaqil tasdiqlanmadi. Quyida kod bilan tasdiqlangan sabablar hamda berilgan raqamlardan keladigan xulosalar ajratilgan.

## Natijalar

### 1. KAS qatorida $0, pul QB qatorida: backend hisobot mantig'i

Tasdiqlandi: bu holatni yaratadigan kod mavjud.

Backend `apps/api/src/reports/reports.service.ts:1410` mijoz to'lovini hisobotga quyidagicha oladi:

```ts
-COALESCE(co.accountAmount, co.settledAmount, co.amount)
```

`accountAmount` — to'lovdan qarzlarga taqsimlangandan keyin avansga qolgan qism. Qiymat `0` bo'lsa, `COALESCE` uni haqiqiy qiymat deb oladi; `amount`ga o'tmaydi. Masalan, $100 to'liq qarzga tushsa, KAS qatorining krediti $0 bo'ladi.

Shu faylning `1426`-qatoridagi alohida `sale_payments` so'rovi taqsimotni to'langan qarzning `s.docNumber` raqami bilan chiqaradi. Shu sabab $100 KAS o'rniga QB-000004 ostida ko'rinadi.

Bu pul yo'qolganini anglatmaydi: hisobot pul tushumini va uning qarzga taqsimotini mijozga tushunarli bitta hujjatga birlashtirmagan. Faqat KAS summasini `amount`ga almashtirish mumkin emas: taqsimot qatorlari ham qolsa, summa ikki marta hisoblanadi. Tuzatish backendning hisobot SQL va qaytadigan hujjat tuzilmasida birgalikda qilinishi kerak.

Frontend `src/Pages/HisobotUchot/hisobKitobHujjatlari.ts:23` serverning `debit`, `credit`, sana va qoldiq qiymatlarini to'g'ridan-to'g'ri ko'rsatadi; bu yerda $100 nolga aylantirilmaydi.

### 2. To'lov sanasining siljishi: backend

Hisobot `reports.service.ts:1426` da `sp.createdAt`dan foydalanadi. Ammo taqsimot `apps/api/src/finance/debt-allocation/debt-allocation.service.ts:638` da to'lovning biznes sanasini alohida `date`ga yozadi:

```ts
date: ctx.at > a.debt.date ? ctx.at : a.debt.date
```

Orqaga sana bilan kiritilgan yoki keyinroq taqsimlangan to'lovda `createdAt` to'lov sanasidan farq qilishi mumkin. Kod berilgan 04.11 → 08.11 kabi holatni tushuntiradi; aynan shu mijozdagi yozuvni tekshirish uchun autentifikatsiyali ma'lumot kerak.

`reports.service.ts:1469` hisob harakatlarini ham alohida `ACCOUNT` qatori sifatida qo'shadi. $400 kredit/debet juftligi shu turdagi ichki hisob harakatiga mos kelishi mumkin. Uni dalilsiz "reversal" yoki takroriy pul tushumi deb bo'lmaydi.

### 3. Hujjat turining "Hujjat" bo'lib chiqishi: frontend integratsiya xatosi

Backend `reports.service.ts:1238` da `docType` qaytaradi. Frontend `hisobKitobHujjatlari.ts:32` faqat `row.type` va `row.documentType`ni o'qiydi. Natijada `docType: CUSTOMER_PAYMENT` yoki `OPENING_DEBT` yo'qoladi; `HisobKitobHujjatlariModal.tsx:44` umumiy "Hujjat" yozuvini ko'rsatadi.

Qo'shimcha: frontend nomlar lug'atida backendning `ACCOUNT`, `CHANGE`, `RETURN` turlari ham to'liq moslashtirilmagan.

### 4. Kassada "Sotuv QB-000004": frontend

`src/Pages/KassaUchot/nomQismlari.ts:28` bog'langan har qanday sotuv hujjatini `names.sale` bilan chiqaradi. Boshlang'ich qarz ham backendda `Sale` modelida saqlangani uchun bu yo'lga tushadi.

`src/hooks/useKassaSotuvlari.ts:17` keshga raqam va mahsulotlarni oladi, lekin `isOpeningDebt` belgisini olib o'tmaydi. Natijada nomlash funksiyasi oddiy savdo va boshlang'ich qarzni farqlay olmaydi. Boshlang'ich qarz belgisi kesh orqali nomlashgacha yetkazilishi va KAS raqami ko'rinadigan qilib chiqarilishi kerak.

### 5. Kassada eski yozuvlar birinchi: frontend

`src/lib/kassaNomlari.ts:24` sanani o'sish tartibida saralaydi; `src/Pages/KassaUchot/index.tsx:467` jadval uchun aynan shu funksiyani ishlatadi.

K1, K2 raqamlash tartibini saqlab, ekrandagi ro'yxatni alohida yangidan eskiga chiqarish mumkin. Aks holda umumiy saralash funksiyasini teskarilash hujjatlarning K raqamlarini ham o'zgartiradi.

### 6. Mijoz kartasida qarz yo'q: frontend; balance=0 esa o'zi xato emas

`src/Pages/XaridorUchot/Xaridorlar.tsx:245` dagi ro'yxat kartasida qarz yoki hisob qoldig'i umuman chizilmagan. "Faqat qarzdorlar" filtri va qarz bo'yicha saralash ham mavjud emas. Karta bosilganda hisob-kitob emas, ma'lumotlar tabi ochiladi.

Ammo "mijozning hech qayerida qarz ko'rsatilmaydi" degan xulosa to'liq to'g'ri emas: `XaridorTafsilotlariModal.tsx:160` tafsilot ichida savdolarning qarzlarini yig'adi, qarzni alohida ko'rsatadi va "Qarzlar" tabi ham mavjud. Bu xulosa hisob-kitob hisobotining o'zidan olinmaydi; ma'lumot manbalari bir xil bo'lishi kafolatlanmagan.

Backendda `customer.balance` jami qarz emas, ishlatilmagan avans. `debt-allocation.service.ts:194` to'lovni qarzlarga taqsimlaydi va faqat qolganini balansga qo'shadi. Frontenddagi `src/lib/mijozHisobi.ts:1` ham shu ma'noni ishlatadi. Shuning uchun mijoz qarzdor bo'la turib `balance=0` bo'lishi normal. Bu maydonga $858.85 qarzni yozish mavjud avans mantig'ini buzadi. Qarzlar valyutalar kesimida alohida olinishi kerak.

### 7. 23 ta savdo to'lanmaganligi taqsimot ishlamayotganini isbotlamaydi

FIFO backendda bor: `apps/api/src/finance/debt-allocation/debt-queue.ts:21` qarzlarni sana bo'yicha tartiblaydi; shu kunning boshlang'ich qarzi o'sha kundagi savdolardan oldin keladi. `planAllocation` berilgan maqsad hujjatini birinchi, keyin to'lov valyutasidagi navbatni, so'ng kurs bo'lsa boshqa valyutani yopadi. `debt-allocation.service.ts:622` to'langan hujjatning `paidAmount`ini oshiradi va `debtAmount`ini kamaytiradi.

Berilgan summalar va boshlang'ich qarz navbatda birinchi bo'lishi sharti bilan:

```text
Boshlang'ich qarz:       $915.57
To'lovlar:             -$700.00
Boshlang'ich qarz qoldig'i $215.57
Keyingi savdolar qarzi:  $643.28
Umumiy qarz:            $858.85
Ishlatilmagan avans:      $0.00
```

Shunday holatda savdolarning to'lanmagan qolishi kutilgan natija. Aynan mijozning QB sanasi va `saleId` orqali ustuvor tanlovlari jonli ma'lumotsiz tasdiqlanmaydi.

Frontendda FIFO oldindan ko'rish va birinchi yopiladigan hujjatni tanlash mavjud (`QarzTaqsimotiPaneli.tsx:27`). To'liq qo'lda bir nechta hujjat/summa tanlash va qarz borligida pulni majburan avansda saqlash rejimlari mavjud emas. Bular yangi frontend va backend imkoniyatlari bo'ladi.

### 8. Kassa to'lovidan keyin Telegram xabari: backendda yetishmaydi

Tekshirilgan `CUSTOMER_PAYMENT` confirm yo'lida mijozga xabar yuboruvchi outbox hodisasi yozilmaydi: `cash-operations.service.ts:345` taqsimotni chaqiradi, `351` esa faqat yetkazib beruvchi xabarnoma yo'lini chaqiradi. Taqsimotning `write` funksiyasi `SalePayment` va audit yozadi, mijoz xabarnomasini yaratmaydi. Savdo to'lovlari uchun mavjud Telegram oqimi kassa to'loviga avtomatik ulanmagan.

## Tekshirish dalillari

- Mavjud tegishli testlar: **25/25 o'tdi** (`hisobKitobHujjatlari`, `mijozHisobi`, `qarzTaqsimoti`, `kassaNomlari`, `boshlangichQarz`). Ular jonli bazani tekshirmaydi.
- Haqiqiy frontend funksiyalari bilan qo'shimcha xotiradagi reproduksiya: `docType` yo'qolishi, "Sotuv QB-000004", eski yozuv birinchi chiqishi va hisobot summalarining o'zgarmasdan ko'chishi tasdiqlandi.
- Yangilangan backendning haqiqiy `planAllocation` funksiyasi xotirada ishga tushirildi: navbat boshidagi $915.57 qarzga yetti marta $100 berilganda shu qarz $215.57 bo'ldi, $643.28 savdo qarzi o'zgarmadi, umumiy qarz $858.85 chiqdi. Bu sun'iy kirish ma'lumotli funksional tekshiruv, ishlab turgan mijoz yozuvlarining tekshiruvi emas.

## Tavsiya etilgan tuzatish ketma-ketligi

1. Backend hisobotida to'lov va taqsimotni bitta manba hujjatiga bog'lab chiqarish; KAS sanasi va raqamini saqlash; yig'indi ikki marta hisoblanmasligini tekshirish. Hisobotning umumiy xulosasi va hujjatlar ro'yxati birgalikda tekshirilsin.
2. Frontendda `docType` mosligi, boshlang'ich qarz nomi, KAS raqami va ko'rsatish saralashini tuzatish.
3. Kartaga bir xil hisob-kitob manbasidan UZS/USD qarz va avansni chiqarish; qarzdorlar filtri va to'lov qabul qilish yo'lini qo'shish.
4. Kassa to'lovlari uchun mijoz Telegram xabarnomasini outbox orqali qo'shish.
5. Zarur bo'lsa, to'liq qo'lda taqsimlash va faqat avans rejimini alohida talab sifatida ishlab chiqish.

Backend manbalaridagi qatorlar yuqoridagi `09f9d3698afd77cf6eaf5d11cc9859cc7998e68a` commitiga tegishli; lokal eski checkoutning qatorlari bilan almashtirilmasin. Kodning ishlab turgan serverdagi aynan shu versiyaga tengligi tasdiqlanmagan.
