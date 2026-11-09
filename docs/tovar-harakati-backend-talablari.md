# Tovar harakati: frontend tuzatishlari va backend talablari

Tekshiruv sanasi: 2026-11-09. Hisobotdagi frontend xatolari kodda tasdiqlandi. Production bazasiga autentifikatsiyali kirish bo'lmagani uchun berilgan dublikatlar soni va raqam generatorining ichki sababi mustaqil tasdiqlanmagan.

## Frontendda bajarildi

- `refId` va asl `type` saqlanadi. Hujjat raqami identifikator o'rnida ishlatilmaydi.
- SALE haqiqiy `GET /sales/{refId}` javobi bilan savdo oynasida ochiladi. STOCK_TAKE, WRITE_OFF, PURCHASE, TRANSFER va sotuvdan qaytarish o'z hujjat oynalariga yo'naltiriladi. Bitta hisobot qatoridan soxta hujjat yaratilmaydi.
- Savdo va ombor hujjatlarida tanlangan mahsulot/modifikatsiya belgilanadi. Inventarizatsiya asl Tizimda / Sanaldi / Farq ko'rinishida ochiladi. Narx uchun katalogdagi hozirgi qiymatdan hujjat summasi yasalmaydi.
- Sana/vaqt (Asia/Tashkent), hujjat turi/raqami, mijoz/kontragent va ombor ko'rsatiladi. Narx/summa ustunlarini «Ustunlar»dan yoqish mumkin.
- Qidiruv yuklangan davrdagi mahsulot, mijoz/kontragent, ombor, hujjat raqami va ID bo'yicha ishlaydi. Server faqat mahsulot nomidan qidirsa ham mijoz qidiruvi buzilmasligi uchun matnli qidiruv mahalliy bajariladi.
- Raqami bir xil, `refId`lari boshqa hujjatlar alohida saqlanadi va belgi bilan ajratiladi. Frontend haqiqiy raqamlarni o'zgartirmaydi.
- Sahifalash mahsulot guruhlari bo'yicha: sarlavha va uning barcha harakatlari bo'linmaydi.
- Kirim/chiqim `quantity` ishorasidan olinadi; inventarizatsiya kamomadi va bekor qilishdagi teskari harakat ham to'g'ri yo'nalishda qoladi.
- Excel aynan filtrlangan barcha guruhlarning harakatlarini chiqaradi. Asl narx/summa, valyuta, kurs va UZS qiymatlar alohida ustunlarda; aralash valyutalar qo'shilmaydi. Noma'lum valyuta UZS deb belgilanmaydi, bugungi kurs qo'llanmaydi.

## 1. Hujjat raqamining yagonaligi

Backendda tekshirish: bir workspace va hujjat turi ichida bir raqamga bir nechta **hujjat** tegishlimi? Bitta savdoning turli mahsulot harakatlari dublikat emas. Turli workspace'lardagi bir xil raqam ham dublikat emas.

Hisobotda keltirilgan SOT-000052, SOT-000037, SOT-000020, SOT-000091 va SOT-000251 alohida tekshirilsin. MAX(number)+1 yoki race condition hozircha taxmin; raqam generatori va import yo'li tekshirilishi kerak.

- Raqamni workspace + hujjat turi kesimida atomar counter/sequence orqali, hujjatni yaratish/tasdiqlash tranzaksiyasining ichida ajratish.
- Raqam berish uchun yagona qoida tanlash: yaratishda yoki tasdiqlashda. Berilgan raqam qayta ishlatilmasin.
- Mavjud dublikatlar tekshirilib, aloqalar va tarix saqlangan holda migratsiya qilinsin. `id/refId` o'zgarmasin. Eski va yangi raqam auditga yozilsin; hisobotda keshlangan docNumber bo'lsa u ham yangilansin.
- Shundan keyin workspace ichidagi bo'sh bo'lmagan savdo raqamlariga UNIQUE cheklov qo'yilsin. Haqiqiy jadval/ustun nomlariga moslashtirish sharti bilan PostgreSQL misoli:

```sql
CREATE UNIQUE INDEX ux_sales_workspace_doc_number
ON sales (workspace_id, doc_number)
WHERE doc_number IS NOT NULL AND btrim(doc_number) <> '';
```

Indeksni dublikatlar tozalanmasdan productionda qo'llamang. Alohida hujjat jadvallarida raqam turlari bo'yicha tegishli cheklov bo'lsin. Parallel yaratish va importni takror yuborish sinovlari kerak.

## 2. Stock-movement javobi

Har bir qatorning shartnomasi:

```ts
{
  id: string;              // harakatning barqaror IDsi
  type: string;            // SALE, STOCK_TAKE, WRITE_OFF, PURCHASE, ...
  refId: string;           // asl hujjat IDsi, harakat IDsi emas
  docNumber: string | null;
  date: string;            // ISO sana/vaqt
  productId: string;
  productName: string;
  modificationId: string;
  modificationName?: string;
  counterpartyName: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  warehouseId: string;
  warehouseName: string;
  quantity: string | number; // ishorali: kirim musbat, chiqim manfiy
  openingBalance: string | number;
  closingBalance: string | number;
  price: string | number | null;
  total: string | number | null;
  currency: 'UZS' | 'USD' | null; // price/total qaysi valyutada ekanini aniq bildiradi
  rate: string | number | null; // 1 USD = necha UZS, shu HUJJATDA saqlangan kurs
  priceUzs?: string | number | null;
  totalUzs?: string | number | null;
}
```

`priceUzs/totalUzs` bo'lsa frontend tayyor qiymatni ishlatadi. Bo'lmasa aniq `currency=USD` va musbat saqlangan `rate` bilan o'giradi. Yetarli ma'lumot bo'lmasa UZS jami chiqarilmaydi. `priceCurrency` berilsa uning `price/total`ga tegishliligi ham yagona shartnoma bilan belgilanmog'i kerak.

`openingBalance/closingBalance` ombor + modifikatsiya oqimi uchun davr, sana, vaqt va harakat tartibiga mos bo'lsin. Narx va summalar bekor qilish/qaytarish yozuvlarida qanday ishora olishi hujjatlashtirilsin.

Ishlab chiqarish, yetkazib beruvchiga qaytarish va yangi turlar uchun `type` → asl hujjat turi → detail endpoint xaritasi aniq bo'lsin. Masalan, ishlab chiqarish qatoridagi `refId` buyurtmaga, smena hisobotiga yoki xomashyo berish hujjatiga tegishlimi — taxmin qilib endpoint chaqirish mumkin emas. Frontend hozir noma'lum turlarga soxta hujjat ochmaydi.

## 3. Hujjat tafsilotlari va eksport

- GET /sales/{id}: barcha items, customer/clientCompany/walkInCustomerName, responsible, warehouse, payments, currency, totalAmount/paidAmount/debtAmount qaytsin.
- GET /inventory/stock-takes/{id}: responsible, warehouse, type, status, barcha items; `expectedQuantity/systemQuantity`, `actualQuantity` va mahsulot/modifikatsiya ma'lumotlari qaytsin.
- Barcha detail endpointlar workspace/branch ruxsatlarini tekshirsin. 403/404 holatida frontend haqiqiy xatoni ko'rsatadi, hisobot qatoridan zaxira hujjat yasamaydi.
- Backendning /reports/stock-movement/export endpointini ishlatadigan boshqa mijozlar uchun ham valyuta/kurs ustunlari va yagona valyutadagi yoki valyutalar bo'yicha alohida jamlar tuzatilsin. Ushbu frontend sahifasi xavfsiz Excelni o'zi shakllantiradi.

## Backend qabul qilish sinovlari

1. Bir workspace ichida parallel yaratilgan savdolar va importlar bir raqam olmaydi; boshqa workspace bilan raqamlar mustaqil.
2. Migratsiyadan keyin asl `refId` orqali savdo ochiladi, to'lovlar/tovarlar/audit yo'qolmaydi.
3. Bitta raqamli turli eski savdolar hisobotda birlashtirilmaydi.
4. USD va UZS aralash hisobotda bugungi kurs o'zgarsa tarixiy UZS qiymatlari o'zgarmaydi.
5. Inventarizatsiya kamomadi manfiy harakat, savdoni bekor qilish teskari harakat sifatida to'g'ri beriladi.
