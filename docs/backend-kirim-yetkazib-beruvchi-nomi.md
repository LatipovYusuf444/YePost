# Eski kirimlarda yetkazib beruvchi nomi

Tekshiruv sanasi: 24.10.2026.

Jonli interfeysda `KIR-000005` hujjatining `supplierId` qiymati `bf2bb756-df39-4774-b807-d819e39aa831`. Shu ID eski to'rtta kirimga bog'langan. Yetkazib beruvchilar ma'lumotnomasi va ID bo'yicha olish orqali bu hujjatlar uchun nom olinmadi. Bu holatning o'zi yozuv o'chirilganini isbotlamaydi; backenddagi bog'lanish va ma'lumot tekshirilsin. Mavjud Nestle yetkazib beruvchisi uchun nom chiqmoqda.

Frontend tuzatildi: hujjatdagi to'liq nom, ma'lumotnomadagi mos yozuv va `GET /api/v1/partners/suppliers/{id}` orqali nom olinadi. Nom kelmasa UUID nom sifatida ko'rsatilmaydi. Nomlar kesilmaydi va jadvalda ular bo'yicha qidirish ishlaydi.

Backenddan kerak:

1. `GET /api/v1/inventory/purchases` va `GET /api/v1/inventory/purchases/{id}` javoblarida bog'langan yetkazib beruvchining to'liq `supplier.name` qiymati qaytsin. `supplierId` bilan relation bir xil yetkazib beruvchiga tegishli bo'lsin.
2. Eski hujjatlarda `supplierId` qaysi jadval/partner ID siga tegishli ekanligi tekshirilsin. Eski bog'lanish yo'qolgan bo'lsa, tarixiy ma'lumotdan to'g'ri nom tiklansin; boshqa yetkazib beruvchi nomi bilan almashtirilmasin.
3. Yetkazib beruvchi faolsizlantirilgan yoki soft-delete qilingan bo'lsa ham, tarixiy kirimda uning nomi saqlanib qolsin. Buning uchun tarixiy relation yoki hujjat yaratilgan paytdagi nom nusxasi qaytarilsin.

Kutilgan hujjat qismi:

```json
{
  "supplierId": "bf2bb756-df39-4774-b807-d819e39aa831",
  "supplier": {
    "id": "bf2bb756-df39-4774-b807-d819e39aa831",
    "name": "Yetkazib beruvchining haqiqiy to'liq nomi"
  }
}
```

Kirim summalari, tovarlar, qoldiq va to'lovlarga o'zgartirish kerak emas. Backend shu nomni qaytargach, frontend uni avtomatik ko'rsatadi.
