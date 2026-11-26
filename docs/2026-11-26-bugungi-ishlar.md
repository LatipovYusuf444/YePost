# 2026-11-26 — bugungi ishlar (frontend)

Bugun qilingan ishlar bajarilgan tartibda. Har bandda: nima kerak edi, nima qilindi, holati (main'ga push qilinganmi).

Qisqacha holat:

| № | Ish | Holati |
|---|-----|--------|
| 1 | Planshet/iPad moslash, Savdo va Monitoring kartalari | push qilingan — `701f4fb` |
| 2 | Mahsulot tahririda variatsiyalar | push qilingan — `da329c9` |
| 3 | Login: "parol noto'g'ri" savoli | kod o'zgarmadi, javob berildi |
| 4 | Yangi sotuv: 3 panel mahsulotlar ro'yxati ostida | push qilingan — `019b7f0` |
| 5 | "Savdo agenti" bo'limi: Suhbatlar va Lidlar | **commit qilinmagan** |
| 6 | Yangi sotuv: kartalarni qo'lda joylashtirish | **commit qilinmagan** |
| 7 | Spetsifikatsiya 1.1 bilan solishtirish | hujjat (pastda) |
| 8 | Lidlar: Kanban, mas'ul, voronka va boshqalar | **commit qilinmagan** |

---

## 1. Planshet/iPad moslash, Savdo va Monitoring kartalari

**Muammo:** iPad va planshetda "Kirim" oynasidagi ochiluvchi ro'yxatlar barmoq bilan ishlamasdi. Bundan tashqari Savdo kartalari xunuk turardi, Monitoring kartalarida summalar karta chetidan chiqib ketardi.

**Qilindi:**
- **Ochiluvchi ro'yxatlar endi barmoq bilan ishlaydi.** iOS barmoq bosilishini sichqoncha harakati deb o'ylab, tanlovni yopib qo'yardi. Endi tanlov bosilgan zahoti ishlaydi, faqat sichqoncha harakatiga tayanmaydi.
- **iPhone/iPad'da avtomatik kattalashish o'chirildi.** Maydonga bosilganda ekran o'zi kattalashib ketmaydi.
- **Oyna balandligi va avtofokus tuzatildi:**
  - oynalar planshet ekraniga to'g'ri sig'adi;
  - planshetda klaviatura o'z-o'zidan ochilib ketmaydi;
  - tanlov maydonlarining ichki chetlari to'g'rilandi.
- **Savdo:** kartalar ishlashi o'zgarmagan holda qayta bezatildi.
- **Monitoring:**
  - summalar kartadan chiqib ketmaydi;
  - "omborlar soni" olib tashlandi, kartalar kattalashtirildi;
  - keraksiz 3 ta kichik karta olib tashlandi.

---

## 2. Mahsulot tahriri: variatsiyalar

**Muammo (BUG):** "Paket Rulon" kabi variatsiyali mahsulotni tahrirlashda mavjud variatsiyalar (KG: 1 / 0.4 / 0.7) yuklanmasdi. "Saqlash" esa birinchi variatsiyani "Asosiy variant" deb buzib yuborishi mumkin edi.

**Qilindi:**
- **Tahrir oynasida mavjud variatsiyalar ko'rinadi:** atribut nomi (masalan, KG), har variatsiyaning qiymati (o'zgartirsa bo'ladi) va shtrix-kodi (faqat o'qish uchun).
- **"Variatsiya qo'shish":** yangi variatsiyaga shtrix-kod mahsulot yaratishdagi `generateBarcodeValue()` bilan beriladi, narxlari kiritiladi.
- **"Saqlash"** endi faqat o'zgargan variatsiyani yangilaydi va yangisini yaratadi. Asosiy variant buzilmaydi, qayta bosilsa takror yaratilmaydi.
- **Qoldiq bloki:** qoldig'i 0 bo'lgan variatsiyalar ham "0" bilan ko'rinadi.

---

## 3. Login: "parol to'g'ri, lekin kiritib bo'lmayapti"

Kod o'zgartirilmadi, faqat tekshirildi:
- **Xato qachon chiqadi:** backend `INVALID_CREDENTIALS` xatosini 4 holatda qaytaradi — foydalanuvchi topilmasa, o'chirilgan bo'lsa, faol bo'lmasa yoki parol noto'g'ri bo'lsa.
- **Do'kon kodi** faqat bir xil login bir nechta do'konda bo'lsa so'raladi.
- **"Kim o'zgartirgan" bilib bo'lmaydi:** backend parol o'zgarishini audit logga yozmaydi. Buning uchun backendda audit qo'shish kerak.

---

## 4. Yangi sotuv: 3 panel mahsulotlar ro'yxati ostiga

**So'rov:** "Narx turi", "Umumiy birlik", "Umumiy chegirma" mahsulotlar tepasida turardi — ularni ro'yxat ostiga o'tkazish.

**Qilindi:** uchala panel mahsulotlar ro'yxati ostiga, yakuniy summalar ustiga ko'chirildi. Ishlashi o'zgarmadi. (Keyin 6-bandda bu kartalarni har xodim o'zi joylashtiradigan qilindi.)

---

## 5. "Savdo agenti" bo'limi: Suhbatlar va Lidlar

**Asos:** backend tayyorlagan Telegram Business CRM chat va lidlar API'si, hamda spetsifikatsiyaning 11-bo'limi. Yon menyuga yangi "🤖 Savdo agenti" bo'limi qo'shildi, ichida 4 ta tab bor.

### Tablar

| Tab | Holati |
|-----|--------|
| Tasdiq kutayotganlar | "Tez orada" (backend yo'q) |
| Lidlar | ishlaydi |
| Suhbatlar | ishlaydi |
| Sozlamalar | "Tez orada" (backend yo'q) |

Bo'lim kassir va omborchiga ham ochiq, chunki backend ularga chat va lidlarni beradi.

### Suhbatlar
- **Ro'yxat:**
  - kanal belgisi bor: "Bot" yoki "Telegram akkaunt" (do'konning o'z akkaunti, Telegram Business);
  - mijozga bog'lanmagan suhbatda "Biriktirilmagan" belgisi turadi;
  - "Hammasi / Biriktirilmagan" filtri va ism yoki @username bo'yicha qidiruv bor.
- **Yozishma:**
  - xabarlar kunlarga bo'lingan, eskilari "Oldingi xabarlarni yuklash" bilan ochiladi;
  - ro'yxat va ochiq suhbat har 15 soniyada o'zi yangilanadi.
- **Kim yozgani ko'rinadi:**
  - mijoz xabari — oq;
  - tizimdagi xodim javobi — ko'k;
  - do'kon egasining o'zi Telegram ilovasidan yozgan xabari (`sentById: null`) — binafsha, "Telegram akkauntdan" deb.
- **Javob yozish:**
  - ostida javob qayerdan ketishi yoziladi (bot orqali yoki do'kon akkauntidan);
  - xatolar yozish maydoni ustida tushunarli matn bilan chiqadi, yozilgan matn o'chmaydi:
    - "Telegram'da botga javob berish ruxsatini yoqing" (`telegram_business_cannot_reply`);
    - "faqat 24 soat ichida javob berish mumkin, xabar saqlanmadi" (`telegram_send_failed`).
- **Mijozga biriktirish:** bog'lanmagan suhbatni mijoz tanlab biriktirish mumkin. Qidiruvda so'z tartibi muhim emas: "Ali Valiyev" kartadagi "Valiyev Ali"ni ham topadi.
- **Mijoz kartasida:** faoliyat tarixida akkauntdan yozilgan xabar "Telegram akkauntdan yozildi" deb ko'rinadi.

### Lidlar (birinchi versiya)
- **Voronka kartalari:** jami → qiziqqan → buyurtma bergan → sotilgan, yo'qotilgan — foizlari bilan.
- **Jadval:** kanal, bosqich va sana bo'yicha filtr, sahifalash.
- **Lid kartasi** o'ngdan ochiladigan panel:
  - bosqichni o'zgartirish ("Yo'qotildi" uchun sabab majburiy);
  - "Menga biriktirish";
  - izohlar va bosqichlar tarixi;
  - "Suhbatni ochish" tugmasi.

---

## 6. Yangi sotuv: kartalarni har xodim o'zi joylashtiradi

**So'rov:** ba'zi mijozlarga kartalar tepada, ba'zilariga pastda, ba'zilariga faqat bittasi tepada kerak. Bir marta joylashtirilsa, refresh qilganda ham, chiqib qayta kirganda ham joyida qolsin.

**Qilindi (4 ta karta: Narx turi, Umumiy birlik, Umumiy chegirma, Yakuniy summalar):**
- **⋮⋮ tutqich** har kartaning chap tomonida:
  - **sudrash** — kartani mahsulotlar jadvalining tepasiga yoki ostiga, istalgan tartibda qo'yish; qayerga tushishi ko'k chiziq bilan ko'rinadi;
  - **bosish** — menyu: Yuqoriga, Pastga, Jadval tepasiga, Jadval ostiga, Yashirish, Standart joylashuv;
  - klaviaturada Alt+↑/↓ bilan ham siljitiladi.
- **Yashirish:** yashirilgan karta pastdagi "Yashirilgan kartalar" qatoridan qaytariladi.
  - Yakuniy summalar yashirilmaydi — jami summa doim ko'rinishi kerak.
  - Umumiy chegirma qo'yilgan bo'lsa, yashirilgan bo'lsa ham ko'rinib turadi — chegirma ko'zdan qochib qolmasligi uchun.
- **Saqlash:**
  - har xodimning joylashuvi alohida, shu brauzerda saqlanadi;
  - refresh va qayta kirishdan keyin ham qoladi;
  - boshqa qurilmadan kirilsa, u yerda standart holat chiqadi.
- **Planshetda** barmoq bilan sudrash ham ishlaydi.

---

## 7. Spetsifikatsiya 1.1 bilan solishtirish

"Telegram va Instagram savdo agenti" spetsifikatsiyasi (1.1) qilingan ish bilan solishtirildi. Natija ikki qismga bo'lindi:
- **frontendda qilish mumkin bo'lganlar** — 8-bandda bajarildi;
- **backend kutilayotganlar** — pastdagi "Backend kutilmoqda" bo'limida.

---

## 8. Lidlar: Kanban, mas'ul, voronka, vaqt, suhbatdagi lid holati

- **Kanban — asosiy ko'rinish:**
  - 6 ustun: Yangi · Qiziqdi · Buyurtma · Qayta bog'lanish · Sotildi · Yo'qotildi, har ustunda lidlar soni;
  - kartochkada ism, kanal, "Biriktirilmagan" belgisi, mas'ul, "12 daq oldin" ko'rinadi.
- **Kartochkani ko'chirish:**
  - kompyuterda butun kartochkadan, planshetda ⋮⋮ tutqichdan sudraladi;
  - **"Yo'qotildi"ga tashlansa** sabab so'raydigan oyna chiqadi, sababsiz saqlanmaydi;
  - backend xato qaytarsa, doska qayta yuklanadi.
- **Kanban / Jadval almashtirgichi:** tanlov eslab qolinadi. Ustunda 50 tadan ko'p lid bo'lsa, "Yana N ta — jadvalda ko'rish" tugmasi chiqadi.
- **Mas'ul:**
  - "Barcha mas'ullar / Meniki / xodim" filtri;
  - admin va direktor lid kartasida xodimni ro'yxatdan tanlab mas'ul qiladi;
  - kassirga backend xodimlar ro'yxatini bermaydi, unda faqat "Menga biriktirish" qoladi.
- **Voronka:**
  - "Bugun / Hafta / Oy / Hammasi" tezkor tugmalari;
  - har kanal uchun alohida qator: jami → qiziqqan → buyurtma → sotilgan, foizlar va yo'qotilganlar bilan.
- **Vaqt:** "hozir", "12 daq oldin", "3 soat oldin" ko'rinishida; sichqonchani ustiga olib borilsa aniq sana-vaqt ko'rinadi.
- **Suhbat tepasida lid holati:**
  - "Lid: Qiziqdi" kabi rangli belgi;
  - bosilsa lid paneli suhbatdan chiqmasdan ochiladi, panel ichidagi "Suhbatni ochish" esa panelni yopadi.

---

## Backend kutilmoqda (frontend backend chiqishi bilan ulanadi)

Spetsifikatsiya 1.1 bo'yicha quyidagilar uchun backendda hali endpoint yoki maydon yo'q:

| Spec bo'limi | Nima kerak | Frontendda qayerda bo'ladi |
|--------------|-----------|----------------------------|
| 3A, 10 | Instagram: ulash (OAuth), webhook, xabar yuborish, 24 soat qoidasi, `human_agent` | Suhbatlar (📸 belgisi, "javob uchun X soat qoldi" taymeri, "Faqat inson javobi, 7 kungacha"), Sozlamalar ([Ulash] tugmasi) |
| 10, 11.1 | `GET /agent/orders?holat=agent_qoralama`, `POST /agent/orders/:id/approve`, `/reject` | "Tasdiq kutayotganlar" tabi: kartochkalar, ⚠️ qarz belgisi, Tasdiqlash/Rad etish, bildirishnoma va badge soni |
| 9, 10, 11.3 | Chat holati (`agent` / `menejer` / `pauza` / `menejer_kerak`), `POST /agent/chats/:id/takeover` va `/release` | Suhbatlar: 🤖/👤/⏸️/🔴 belgilari, "Men javob beraman / Agentga qaytarish" |
| 9, 11.3 | Vosita loglari (`agent_actions_log`) chat tarixida | Agent xabari ostida "🔧 3 ta vosita" yig'iladigan qatori |
| 10, 11.4 | `GET/PUT /agent/settings` | "Sozlamalar" tabi: yoqish/o'chirish (kanal bo'yicha), ish vaqti, jim turish daqiqasi, qarz limiti, lid qoidalari, qo'shimcha ko'rsatma |
| 8.4 | Lidda so'ralgan mahsulotlar va narxlar, taxminiy summa, bog'langan buyurtma | Lid kartasi va kanban kartochkasi |
| 5–7 | AI agentning o'zi (Claude, vositalar, buyurtma qoralamasi) | To'liq backend ishi |
| 3 (login) | Parol o'zgarishini audit logga yozish | Hisobotlar → Audit loglari |

---

## Tekshiruv

- **Oxirgi tekshiruv:**
  - TypeScript (`tsc`) va `eslint` — xatosiz;
  - testlar — 1205/1205 o'tdi;
  - `vite build` — muvaffaqiyatli.
- **Qo'shilgan testlar:** `tests/savdoAgenti.test.mjs`, `tests/sotuvKartalari.test.mjs`.
- **Brauzerda sinash:** 5, 6 va 8-bandlar headless Chrome'da soxta (mock) backend bilan sinaldi — kompyuter, telefon va planshet o'lchamida, sichqoncha va barmoq bilan. Konsolda xato yo'q.
- **Haqiqiy backend bilan** 5, 6 va 8-bandlar hali sinalmagan.
- **Bitta mavjud test yangilandi:** jadvallar sonini sanaydigan test 60 dan 61 ga o'zgartirildi, chunki Lidlar jadvali qo'shildi.

## Commit qilinmagan fayllar (5, 6, 8-bandlar)

**Yangi fayllar:**
- `src/Pages/SavdoAgenti/` — bo'lim sahifalari: Suhbatlar, Lidlar, Kanban, lid kartasi, oynalar;
- `src/Pages/Savdo/SotuvKartalari.tsx`, `src/hooks/useSotuvKartalari.ts`, `src/lib/sotuvKartalari.ts` — sotuv kartalari joylashuvi;
- `src/lib/savdoAgenti.ts` — savdo agenti yordamchi funksiyalari;
- `src/i18n/locales/{uz,ru}/savdo_agenti.json` — tarjimalar;
- `tests/savdoAgenti.test.mjs`, `tests/sotuvKartalari.test.mjs` — testlar.

**O'zgargan fayllar:**
- API va turlar: `src/api/crmApi.ts`, `src/api/xatoKodlari.ts`, `src/types/crm.ts`;
- menyu, marshrut va ruxsatlar: `src/Components/layout/YonPanel.tsx`, `src/routes/AppRouter.tsx`, `src/lib/roles.ts`;
- sahifalar: `src/Pages/Savdo/YangiSotuvModal.tsx`, `src/Pages/XaridorUchot/FaoliyatPaneli.tsx`;
- tarjimalar: `src/i18n/index.ts`, `nav.json`, `savdo_yangi.json`, `xaridor_uchot.json` (uz va ru);
- test: `tests/smartTableCoverage.test.mjs`.
