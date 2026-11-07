# YePost — Smart Table yakuniy hisobot

Sana: 2026-11-07. Faqat frontend. Dastlabki UI bosqichida push bajarilmadi; keyingi alohida foydalanuvchi topshirig‘i barcha o‘zgarishlarni `main`ga yuborishga ruxsat berdi.

93 ta jadval ishlatilishi topildi: 89 tasiga barcha oltita boshqaruv ulandi; 3 ta guruhlangan jadvalga xavfsiz density/reset va gridlines qo‘shildi, ularning mavjud ustun boshqaruvlari saqlandi; 1 ta chop etiladigan nakladnoy jadvali o‘zgartirilmadi. 92 ta jadval ishlatilishida gorizontal va vertikal chiziqlar bor.

Hisob birligi — alohida sahifa yoki modalda ishlatilgan jadval. 53 ta native table ta’rifi va 45 ta qayta ishlatiladigan komponent chaqiruvi tekshirildi; umumiy komponent ta’riflari alohida ish jadvali deb qayta sanalmadi. Mavjud bo‘lmagan lot/ishonchnoma/mudir/tarozibon sahifalari yaratilmagan.

MOXEN videosi biriktirmalar ichida topilmadi; amalga oshirish yozma talablarga tayandi.

Qo‘shimcha ko‘rib chiqilgan `BoshSahifa/SavatchaJadvali.tsx` native jadval emas, responsive CSS grid asosidagi savatcha formasi. Uning inputlari, narx/miqdor jarayoni va mobil kartalari o‘z holida saqlandi; 93 ta native/reusable jadval hisobiga kiritilmadi. Print HTML shablonlari ham interaktiv jadvalga aylantirilmadi.

## Jadvalma-jadval qamrov

Belgilar: **✓** — yangi umumiy boshqaruv; **Mavjud** — oldingi maxsus boshqaruv saqlandi; **—** — xavfsizlik sababli qo‘shilmadi; **Zichlik** — reset faqat yangi density sozlamasini tiklaydi. To‘liq qamrov to‘g‘ri bir qatorli header va mos cell tuzilmasiga tegishli; runtime guard keyinchalik kutilmagan merged/opaque qator paydo bo‘lsa ustun operatsiyalarini xavfsiz o‘chiradi.

| Sahifa | Jadval | Resize | Reorder | Visibility | Pinning | Density | Reset | Status |
|---|---|---|---|---|---|---|---|---|
| Admin | [Foydalanuvchilar · table-1](../src/Pages/Admin/Foydalanuvchilar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Admin | [Kompaniyalar · table-1](../src/Pages/Admin/Kompaniyalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Admin | [Obunalar · table-1](../src/Pages/Admin/Obunalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [AuditLoglari · table-1](../src/Pages/HisobotUchot/AuditLoglari.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [ChegirmaHisoboti · kengaytiriladiganjadval-1](../src/Pages/HisobotUchot/ChegirmaHisoboti.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [FoydaHisoboti · table-1](../src/Pages/HisobotUchot/FoydaHisoboti.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [HisobKitobHujjatlariModal · kengaytiriladiganjadval-1](../src/Pages/HisobotUchot/HisobKitobHujjatlariModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [HisobKitobModal · kengaytiriladiganjadval-1](../src/Pages/HisobotUchot/HisobKitobModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [KirimChiqimHisoboti · matritsajadval-1](../src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx) | Mavjud | Mavjud | — | — | ✓ | Zichlik | Guruhlangan header; gridlines ✓ |
| Hisobot | [KirimChiqimHisoboti · matritsajadval-2](../src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx) | Mavjud | Mavjud | — | — | ✓ | Zichlik | Guruhlangan header; gridlines ✓ |
| Hisobot | [KunlikKassa · table-1](../src/Pages/HisobotUchot/KunlikKassa.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [omborModallari/ChiqimKorishModal · table-1](../src/Pages/HisobotUchot/omborModallari/ChiqimKorishModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [omborModallari/InventarizatsiyaKorishModal · table-1](../src/Pages/HisobotUchot/omborModallari/InventarizatsiyaKorishModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [omborModallari/KirimKorishModal · table-1](../src/Pages/HisobotUchot/omborModallari/KirimKorishModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [omborModallari/RealizatsiyaKorishModal · table-1](../src/Pages/HisobotUchot/omborModallari/RealizatsiyaKorishModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [OzaroHisobKitob · kengaytiriladiganjadval-1](../src/Pages/HisobotUchot/OzaroHisobKitob.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [QoldiqHisoboti · kengaytiriladiganjadval-1](../src/Pages/HisobotUchot/QoldiqHisoboti.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Hisobot | [TovarHarakati · kengaytiriladiganjadval-1](../src/Pages/HisobotUchot/TovarHarakati.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Buyurtmalar · jadval-1](../src/Pages/IshlabChiqarish/Buyurtmalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Buyurtmalar · jadval-2](../src/Pages/IshlabChiqarish/Buyurtmalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Buyurtmalar · jadval-3](../src/Pages/IshlabChiqarish/Buyurtmalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Buyurtmalar · jadval-4](../src/Pages/IshlabChiqarish/Buyurtmalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Kalkulyatsiya · jadval-1](../src/Pages/IshlabChiqarish/Kalkulyatsiya.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Kalkulyatsiya · jadval-2](../src/Pages/IshlabChiqarish/Kalkulyatsiya.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Retseptlar · jadval-1](../src/Pages/IshlabChiqarish/Retseptlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Retseptlar · jadval-2](../src/Pages/IshlabChiqarish/Retseptlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Retseptlar · jadval-3](../src/Pages/IshlabChiqarish/Retseptlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Retseptlar · jadval-4](../src/Pages/IshlabChiqarish/Retseptlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Retseptlar · jadval-5](../src/Pages/IshlabChiqarish/Retseptlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Rulonlar · jadval-1](../src/Pages/IshlabChiqarish/Rulonlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [SexgaBerish · jadval-1](../src/Pages/IshlabChiqarish/SexgaBerish.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [SexgaBerish · jadval-2](../src/Pages/IshlabChiqarish/SexgaBerish.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [SexgaBerish · jadval-3](../src/Pages/IshlabChiqarish/SexgaBerish.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Smena · jadval-1](../src/Pages/IshlabChiqarish/Smena.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Smena · jadval-2](../src/Pages/IshlabChiqarish/Smena.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Smena · jadval-3](../src/Pages/IshlabChiqarish/Smena.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Smena · jadval-4](../src/Pages/IshlabChiqarish/Smena.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ishlab chiqarish | [Smena · jadval-5](../src/Pages/IshlabChiqarish/Smena.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Kassa | [Asosiy ro‘yxat · kengaytiriladiganjadval-1](../src/Pages/KassaUchot/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Kassa | [ZavodBonusi · kengaytiriladiganjadval-1](../src/Pages/KassaUchot/ZavodBonusi.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Mahsulotlar | [Asosiy ro‘yxat · table-1](../src/Pages/Mahsulotlar/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Mahsulotlar | [Asosiy ro‘yxat · table-2](../src/Pages/Mahsulotlar/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Mahsulotlar | [Asosiy ro‘yxat · table-3](../src/Pages/Mahsulotlar/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Mahsulotlar | [KategoriyaQoldigiModal · table-1](../src/Pages/Mahsulotlar/KategoriyaQoldigiModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Monitoring | [Asosiy ro‘yxat · table-1](../src/Pages/Monitoring/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Monitoring | [Asosiy ro‘yxat · table-2](../src/Pages/Monitoring/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Monitoring | [Asosiy ro‘yxat · table-3](../src/Pages/Monitoring/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [AmalgaOshirilganlar · table-1](../src/Pages/Ombor/AmalgaOshirilganlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [Chiqim · table-1](../src/Pages/Ombor/Chiqim.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [ChiqimTafsilotModal · table-1](../src/Pages/Ombor/ChiqimTafsilotModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [FiliallarBoshqaruvi · table-1](../src/Pages/Ombor/FiliallarBoshqaruvi.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [Asosiy ro‘yxat · table-1](../src/Pages/Ombor/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [Inventarizatsiya · table-1](../src/Pages/Ombor/Inventarizatsiya.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [InventarizatsiyaKorinish · table-1](../src/Pages/Ombor/InventarizatsiyaKorinish.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [InventoryHujjatModal · table-1](../src/Pages/Ombor/InventoryHujjatModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [KirimTafsilotModal · table-1](../src/Pages/Ombor/KirimTafsilotModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [Kochirish · table-1](../src/Pages/Ombor/Kochirish.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [KochirishKorishModal · table-1](../src/Pages/Ombor/KochirishKorishModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [KochirishYaratishModal · table-1](../src/Pages/Ombor/KochirishYaratishModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Ombor | [OmborQoldigi · table-1](../src/Pages/Ombor/OmborQoldigi.tsx) | Mavjud | — | Mavjud filtr | — | ✓ | Zichlik | rowSpan/colSpan; gridlines ✓ |
| Ombor | [Xaridlar · table-1](../src/Pages/Ombor/Xaridlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Qarzdorlik | [Asosiy ro‘yxat · table-1](../src/Pages/Qarzdorlik/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [BekorQilinganlar · table-1](../src/Pages/Savdo/BekorQilinganlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [Buyurtmalar · table-1](../src/Pages/Savdo/Buyurtmalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [Asosiy ro‘yxat · sotuvlarjadvali-1](../src/Pages/Savdo/index.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [OmbordanChiqqanlarOynasi · table-1](../src/Pages/Savdo/OmbordanChiqqanlarOynasi.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [Qaytarish · table-1](../src/Pages/Savdo/Qaytarish.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [QaytarishTafsilotlariModal · table-1](../src/Pages/Savdo/QaytarishTafsilotlariModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [Savatcha · table-1](../src/Pages/Savdo/Savatcha.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [SotuvHujjatlariTab · table-1](../src/Pages/Savdo/SotuvHujjatlariTab.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [SotuvOmbordanChiqqanlar · table-1](../src/Pages/Savdo/SotuvOmbordanChiqqanlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [SotuvTafsilotlariModal · table-1](../src/Pages/Savdo/SotuvTafsilotlariModal.tsx) | — | — | — | — | — | — | Chop etish shakli saqlandi |
| Savdo | [SotuvTafsilotlariModal · table-2](../src/Pages/Savdo/SotuvTafsilotlariModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [Tarix · sotuvlarjadvali-1](../src/Pages/Savdo/Tarix.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Savdo | [Tolovlar · table-1](../src/Pages/Savdo/Tolovlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Sozlamalar | [BirlikMahsulotlari · table-1](../src/Pages/SozlamalarUchot/BirlikMahsulotlari.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Sozlamalar | [VakolatlarBolimi · table-1](../src/Pages/SozlamalarUchot/VakolatlarBolimi.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Sozlamalar | [ValyutaBolimi · table-1](../src/Pages/SozlamalarUchot/ValyutaBolimi.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [BoshlangichQarzImportModal · table-1](../src/Pages/XaridorUchot/BoshlangichQarzImportModal.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [Kompaniyalar · kengaytiriladiganjadval-1](../src/Pages/XaridorUchot/Kompaniyalar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [MijozQarzlariTab · kengaytiriladiganjadval-1](../src/Pages/XaridorUchot/MijozQarzlariTab.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [Xaridorlar · kengaytiriladiganjadval-1](../src/Pages/XaridorUchot/Xaridorlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [XaridorTablari · kengaytiriladiganjadval-1](../src/Pages/XaridorUchot/XaridorTablari.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [XaridorTablari · kengaytiriladiganjadval-2](../src/Pages/XaridorUchot/XaridorTablari.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [XaridorTablari · kengaytiriladiganjadval-3](../src/Pages/XaridorUchot/XaridorTablari.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [XaridorTolovlariTab · kengaytiriladiganjadval-1](../src/Pages/XaridorUchot/XaridorTolovlariTab.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [YetkazibBeruvchilar · kengaytiriladiganjadval-1](../src/Pages/XaridorUchot/YetkazibBeruvchilar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xaridorlar / hamkorlar | [YetkazibBoshlangichQarzTab · table-1](../src/Pages/XaridorUchot/YetkazibBoshlangichQarzTab.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xodimlar | [Davomat · table-1](../src/Pages/XodimUchot/Davomat.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xodimlar | [Lavozimlar · kengaytiriladiganjadval-1](../src/Pages/XodimUchot/Lavozimlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xodimlar | [Vakolatlar · table-1](../src/Pages/XodimUchot/Vakolatlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xodimlar | [Xodimlar · kengaytiriladiganjadval-1](../src/Pages/XodimUchot/Xodimlar.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |
| Xodimlar | [XodimTablari · kengaytiriladiganjadval-1](../src/Pages/XodimUchot/XodimTablari.tsx) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Ulandi; gridlines ✓ |

## Maxsus holatlar

- **Kirim/chiqim kassa matritsasi va uning aylanma tafsiloti modali:** ikki qatorli guruhlangan header, uchlik katak renderer va o‘z resize/reorder boshqaruvi bor. Guruhlarni generic leaf-column tartibiga aylantirish bajarilmadi. Mavjud resize/reorder saqlandi; yangi density, uning reset’i va gridlines ishlaydi.
- **Ombor qoldig‘i:** rowSpan/colSpan, guruhlangan miqdor/narx sarlavhalari va guruhlangan jami qatori mavjud. Mavjud filtr va OmborJadval resize saqlandi; density/gridlines qo‘shildi. Generic reorder/pin/visibility qo‘shilmadi.
- **Sotuv tafsilotlari — chop etiladigan nakladnoy:** belgilangan hujjat geometriyasi saqlandi. Toolbar va grid uslubi ushbu jadvalga qo‘llanmagan. Shu sahifadagi oddiy mahsulotlar jadvali to‘liq ulandi.

## Amalga oshirish

- SmartTable mavjud React elementlarini original ustun identifikatori bo‘yicha joylashtiradi; data massivi va backend obyektlariga yozmaydi. Hidden editable kataklar mounted holatda saqlanadi. Row keys va original renderer/callbacklar saqlanadi.
- Pointer resize requestAnimationFrame orqali CSS o‘zgaruvchilarini yangilaydi va tugaganda React state’ga yozadi. Escape/pointercancel bekor qiladi, unmount listenerlarni tozalaydi. Klaviatura resize va ustunlarni tugmalar bilan ko‘chirish imkoniyati bor.
- Pin chap/o‘ng offsetlari ResizeObserver orqali o‘lchangan haqiqiy header kengliklaridan olinadi. Matn sababli ustun saqlangan kenglikdan kattaroq bo‘lsa ham header/body pin offsetlari mos qoladi. 640px va kichik ekranda sticky ko‘rinish to‘xtatiladi; saqlangan pin tanlovi o‘zgarmaydi.
- Har bir usage uchun explicit tableId mavjud. Oldindan mavjud IDs saqlandi; ishlab chiqarishning IDs bo‘lmagan column definitions’lariga 105 ta faqat UI identifikatori qo‘shildi. Bular backend payloadlariga kirmaydi.
- LocalStorage kalitlari mavjud sessiya egasining workspace/user kontekstidan SHA-256 hash va tableId orqali olinadi. Token, username, row ID, cell qiymati yoki backend record saqlanmaydi. Akkaunt almashganda eski state yangi scope’ga o‘tmaydi. Storage/crypto mavjud bo‘lmasa in-memory boshqaruv ishlaydi.
- Reset faqat column order/width/visibility/pin/density’ni tiklaydi. Search, filter, biznes sorting, selection, pagination va kiritilgan form qiymatlarini qabul qilmaydi yoki o‘zgartirmaydi.
- Light/dark borderlar, header separator, sticky fon/shadow, focus-visible va reduced-motion uslublari umumiy qatlamda. Mavjud action ustunlari va kamida bitta asosiy ustunni yashirish cheklangan.
- Matnlar, summalar, sana va statuslar bo‘linmasdan bir qatorda turadi. Table auto/max-content layout’dan foydalanadi: eski tor kengliklar kontentni siqmaydi, uzun qiymatlar ustunni kengaytiradi va mavjud jadval konteynerida gorizontal scroll chiqadi. Flex ism/avatar va action guruhlari pastga tushmaydi; inline menyular o‘z o‘lchamini saqlaydi. Scroll egasi o‘zgarmaydi — Ombor arrow/track ref’lari ishlashda davom etadi. Vertikal padding kamaytirildi; savdo to‘lov/progress/qarz va sana/vaqt ko‘rinishi yonma-yon ixchamlashtirildi, formulalar va qiymatlar o‘zgarmadi.
- “Ustunlar” popover’i ixchamlashtirildi: ekrandagi Radix available-height/width chegaralariga moslanadi, header/density va reset o‘zgarmas qismlarda qoladi, faqat ustun ro‘yxati scroll bo‘ladi. Har ustunning kenglik/pin/reorder boshqaruvi kichik sozlama tugmasidan ochiladi; bir paytda faqat bitta ustun tafsiloti ko‘rinadi. Yopish/Escape orqali yopilganda table preferences saqlanadi.

Savdo jadvalidagi mas?ul ism/telefon ko?rinishi ham tuzatildi: `responsible` to?liq bo?lmasa, mavjud xodimlar ro?yxati va faqat mos ID?li joriy profil tekshiriladi. Ism/familiya va username formatlari qo?llanadi. Mijoz telefoni yoki boshqa profil o?rniga qo?yilmaydi; haqiqiy ma?lumot topilmasa `-` saqlanadi. Bu faqat read-only display resolution; yangi API so?rovi yoki backend yozuvi yo?q. 7 ta pure resolver testi va real jadvalning reactive/reorder DOM testi o?tdi.

## Data integrity va chegaralar

- Backend, database, migration va API contract o‘zgartirilmadi. Backend repozitoriysi ochilmadi yoki tahrirlanmadi; backend testlari ishga tushirilmadi.
- 156 ta api/lib/store/types/routes fayli boshlang‘ich snapshot bilan byte darajasida bir xil.
- 71 ta integratsiya fayli: faqat yangi wrapper/UI metadata olib tashlangach syntax tree boshlang‘ich nusxaga teng. Kutilmagan biznes o‘zgarishi yo‘q. Qolgan 5 umumiy presentation adapter (jumladan savdo jadvalidagi ixcham class o‘zgarishlari) alohida ko‘rib chiqildi va regressiya testlari bilan tekshirildi.
- Oldindan mavjud login/auth/index.css o‘zgarishlari va untracked login aktivlari saqlandi.
- Production UI’ga yangi biznes ustun, biznes qator yoki fake data qo‘shilmadi. Test fixture’lari faqat tests/ ichida va production build entrypoint’iga ulanmagan.
- Real backend yozuvlari test uchun o‘zgartirilmadi. Ularning live qiymatlari bo‘yicha tekshiruv da’vo qilinmaydi; renderer/row/callback va source-level yaxlitlik tekshirildi.

## Tekshiruvlar

- Boshlang‘ich production build: muvaffaqiyatli.
- `npm run test:tables`: **21/21** tekshiruv muvaffaqiyatli. 1 000 qator, header/cell/totals mosligi, stale/corrupt storage, account/table isolation, resize cancel/unmount, editable input state/focus, hide/show, reset, pagination, action permissionlari va kech yuklanadigan permission-dependent headerlar qamrab olindi. Uzun qiymatlar nowrap bo‘lib qolishi, auto/max-content layout, konteyner scroll’i va haqiqiy kengliklar bo‘yicha chap/o‘ng pin offsetlari DOM/computed-style testidan o‘tdi. Suzuvchi menyu kengligi, callbacklari va kiritilgan input qiymati saqlanishi ham tekshirildi. Ixcham menyuning mavjud balandlik chegarasi, alohida scroll ro‘yxati, bitta ochiq column paneli va yopish/reset xatti-harakati ham tekshirildi.
- To‘liq frontend regression: **704/704 muvaffaqiyatli**, 0 failure, 0 skipped. `backendNoyabr7.test.mjs` ataylab ishga tushirilmadi. API testlari mavjud frontend mock transportidan foydalandi; real production backendga mutatsiya yuborilmadi.
- Typecheck (`tsc -b`): **muvaffaqiyatli**.
- `npm run lint`: **muvaffaqiyatli**, 0 error / 0 warning.
- `npm run build`: **muvaffaqiyatli**; mavjud katta chunk ogohlantirishi saqlangan.
- `git diff --check`: **muvaffaqiyatli**. Keyingi `main`ga yuborish topshirig‘ining yakuniy commit/push holati chatdagi tasdiqda beriladi.
- Browser tekshiruvi: bajarilmadi. Browser access host mavjud emas edi; native Chrome’ga o‘tishda Computer Use joriy URL’ni ishonchli aniqlay olmagani uchun tekshiruvni xavfsizlik sababli to‘xtatdi. DOM komponent testlari o‘tdi, lekin ular real brauzer layout tekshiruvining o‘rnini to‘liq bosmaydi.

## Tekshirilmagan holatlar va risklar

- Real brauzerda drag preview/drop indicator, pixel-level pin/resize alignment, sticky header scroll, touch interaction, menu focus va light/dark kontrast vizual tekshirilmagan. Bular qo‘lda acceptance tekshiruviga muhtoj.
- CSS sticky ishlashi modal va parent scroll konteyneriga bog‘liq; ayniqsa bir nechta pinned ustun, uzun tarjima va uzun mahsulot nomini real ekranlarda tekshirish kerak.
- Guruhlangan 3 usage’da barcha oltita yangi column boshqaruvi bor deb da’vo qilinmaydi. Yangi UI reset mavjud maxsus filter/resize/reorder sozlamalarini tiklamaydi.
- Virtualized row implementatsiyasi topilmadi; mavjud bo‘lmagan virtualization qo‘shilmadi. 1 000 qator uchun data projection testi bor, real browser FPS benchmark bajarilmadi.
- Build’da 500 kB dan katta chunklar haqidagi Vite ogohlantirishi boshlang‘ich build’da ham bor edi; task doirasida code-splitting o‘zgartirilmadi.

## O‘zgargan frontend fayllari

Quyidagi 76 ta mavjud src fayli ushbu vazifada o‘zgardi; boshlang‘ich foydalanuvchi o‘zgarishlari bu ro‘yxatga qo‘shilmagan.

- [src/Components/ui/table.tsx](../src/Components/ui/table.tsx)
- [src/Pages/Admin/Foydalanuvchilar.tsx](../src/Pages/Admin/Foydalanuvchilar.tsx)
- [src/Pages/Admin/Kompaniyalar.tsx](../src/Pages/Admin/Kompaniyalar.tsx)
- [src/Pages/Admin/Obunalar.tsx](../src/Pages/Admin/Obunalar.tsx)
- [src/Pages/HisobotUchot/AuditLoglari.tsx](../src/Pages/HisobotUchot/AuditLoglari.tsx)
- [src/Pages/HisobotUchot/ChegirmaHisoboti.tsx](../src/Pages/HisobotUchot/ChegirmaHisoboti.tsx)
- [src/Pages/HisobotUchot/FoydaHisoboti.tsx](../src/Pages/HisobotUchot/FoydaHisoboti.tsx)
- [src/Pages/HisobotUchot/HisobKitobHujjatlariModal.tsx](../src/Pages/HisobotUchot/HisobKitobHujjatlariModal.tsx)
- [src/Pages/HisobotUchot/HisobKitobModal.tsx](../src/Pages/HisobotUchot/HisobKitobModal.tsx)
- [src/Pages/HisobotUchot/KengaytiriladiganJadval.tsx](../src/Pages/HisobotUchot/KengaytiriladiganJadval.tsx)
- [src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx](../src/Pages/HisobotUchot/KirimChiqimHisoboti.tsx)
- [src/Pages/HisobotUchot/KunlikKassa.tsx](../src/Pages/HisobotUchot/KunlikKassa.tsx)
- [src/Pages/HisobotUchot/omborModallari/ChiqimKorishModal.tsx](../src/Pages/HisobotUchot/omborModallari/ChiqimKorishModal.tsx)
- [src/Pages/HisobotUchot/omborModallari/InventarizatsiyaKorishModal.tsx](../src/Pages/HisobotUchot/omborModallari/InventarizatsiyaKorishModal.tsx)
- [src/Pages/HisobotUchot/omborModallari/KirimKorishModal.tsx](../src/Pages/HisobotUchot/omborModallari/KirimKorishModal.tsx)
- [src/Pages/HisobotUchot/omborModallari/RealizatsiyaKorishModal.tsx](../src/Pages/HisobotUchot/omborModallari/RealizatsiyaKorishModal.tsx)
- [src/Pages/HisobotUchot/OzaroHisobKitob.tsx](../src/Pages/HisobotUchot/OzaroHisobKitob.tsx)
- [src/Pages/HisobotUchot/QoldiqHisoboti.tsx](../src/Pages/HisobotUchot/QoldiqHisoboti.tsx)
- [src/Pages/HisobotUchot/TovarHarakati.tsx](../src/Pages/HisobotUchot/TovarHarakati.tsx)
- [src/Pages/IshlabChiqarish/Buyurtmalar.tsx](../src/Pages/IshlabChiqarish/Buyurtmalar.tsx)
- [src/Pages/IshlabChiqarish/Kalkulyatsiya.tsx](../src/Pages/IshlabChiqarish/Kalkulyatsiya.tsx)
- [src/Pages/IshlabChiqarish/Retseptlar.tsx](../src/Pages/IshlabChiqarish/Retseptlar.tsx)
- [src/Pages/IshlabChiqarish/Rulonlar.tsx](../src/Pages/IshlabChiqarish/Rulonlar.tsx)
- [src/Pages/IshlabChiqarish/SexgaBerish.tsx](../src/Pages/IshlabChiqarish/SexgaBerish.tsx)
- [src/Pages/IshlabChiqarish/Smena.tsx](../src/Pages/IshlabChiqarish/Smena.tsx)
- [src/Pages/IshlabChiqarish/umumiy.tsx](../src/Pages/IshlabChiqarish/umumiy.tsx)
- [src/Pages/KassaUchot/index.tsx](../src/Pages/KassaUchot/index.tsx)
- [src/Pages/KassaUchot/ZavodBonusi.tsx](../src/Pages/KassaUchot/ZavodBonusi.tsx)
- [src/Pages/Mahsulotlar/index.tsx](../src/Pages/Mahsulotlar/index.tsx)
- [src/Pages/Mahsulotlar/KategoriyaQoldigiModal.tsx](../src/Pages/Mahsulotlar/KategoriyaQoldigiModal.tsx)
- [src/Pages/Monitoring/index.tsx](../src/Pages/Monitoring/index.tsx)
- [src/Pages/Ombor/AmalgaOshirilganlar.tsx](../src/Pages/Ombor/AmalgaOshirilganlar.tsx)
- [src/Pages/Ombor/Chiqim.tsx](../src/Pages/Ombor/Chiqim.tsx)
- [src/Pages/Ombor/ChiqimTafsilotModal.tsx](../src/Pages/Ombor/ChiqimTafsilotModal.tsx)
- [src/Pages/Ombor/FiliallarBoshqaruvi.tsx](../src/Pages/Ombor/FiliallarBoshqaruvi.tsx)
- [src/Pages/Ombor/index.tsx](../src/Pages/Ombor/index.tsx)
- [src/Pages/Ombor/Inventarizatsiya.tsx](../src/Pages/Ombor/Inventarizatsiya.tsx)
- [src/Pages/Ombor/InventarizatsiyaKorinish.tsx](../src/Pages/Ombor/InventarizatsiyaKorinish.tsx)
- [src/Pages/Ombor/InventoryHujjatModal.tsx](../src/Pages/Ombor/InventoryHujjatModal.tsx)
- [src/Pages/Ombor/KirimTafsilotModal.tsx](../src/Pages/Ombor/KirimTafsilotModal.tsx)
- [src/Pages/Ombor/Kochirish.tsx](../src/Pages/Ombor/Kochirish.tsx)
- [src/Pages/Ombor/KochirishKorishModal.tsx](../src/Pages/Ombor/KochirishKorishModal.tsx)
- [src/Pages/Ombor/KochirishYaratishModal.tsx](../src/Pages/Ombor/KochirishYaratishModal.tsx)
- [src/Pages/Ombor/OmborJadval.tsx](../src/Pages/Ombor/OmborJadval.tsx)
- [src/Pages/Ombor/OmborQoldigi.tsx](../src/Pages/Ombor/OmborQoldigi.tsx)
- [src/Pages/Ombor/Xaridlar.tsx](../src/Pages/Ombor/Xaridlar.tsx)
- [src/Pages/Qarzdorlik/index.tsx](../src/Pages/Qarzdorlik/index.tsx)
- [src/Pages/Savdo/BekorQilinganlar.tsx](../src/Pages/Savdo/BekorQilinganlar.tsx)
- [src/Pages/Savdo/Buyurtmalar.tsx](../src/Pages/Savdo/Buyurtmalar.tsx)
- [src/Pages/Savdo/index.tsx](../src/Pages/Savdo/index.tsx)
- [src/Pages/Savdo/OmbordanChiqqanlarOynasi.tsx](../src/Pages/Savdo/OmbordanChiqqanlarOynasi.tsx)
- [src/Pages/Savdo/Qaytarish.tsx](../src/Pages/Savdo/Qaytarish.tsx)
- [src/Pages/Savdo/QaytarishTafsilotlariModal.tsx](../src/Pages/Savdo/QaytarishTafsilotlariModal.tsx)
- [src/Pages/Savdo/Savatcha.tsx](../src/Pages/Savdo/Savatcha.tsx)
- [src/Pages/Savdo/SotuvHujjatlariTab.tsx](../src/Pages/Savdo/SotuvHujjatlariTab.tsx)
- [src/Pages/Savdo/SotuvlarJadvali.tsx](../src/Pages/Savdo/SotuvlarJadvali.tsx)
- [src/Pages/Savdo/SotuvOmbordanChiqqanlar.tsx](../src/Pages/Savdo/SotuvOmbordanChiqqanlar.tsx)
- [src/Pages/Savdo/SotuvTafsilotlariModal.tsx](../src/Pages/Savdo/SotuvTafsilotlariModal.tsx)
- [src/Pages/Savdo/Tarix.tsx](../src/Pages/Savdo/Tarix.tsx)
- [src/Pages/Savdo/Tolovlar.tsx](../src/Pages/Savdo/Tolovlar.tsx)
- [src/Pages/SozlamalarUchot/BirlikMahsulotlari.tsx](../src/Pages/SozlamalarUchot/BirlikMahsulotlari.tsx)
- [src/Pages/SozlamalarUchot/VakolatlarBolimi.tsx](../src/Pages/SozlamalarUchot/VakolatlarBolimi.tsx)
- [src/Pages/SozlamalarUchot/ValyutaBolimi.tsx](../src/Pages/SozlamalarUchot/ValyutaBolimi.tsx)
- [src/Pages/XaridorUchot/BoshlangichQarzImportModal.tsx](../src/Pages/XaridorUchot/BoshlangichQarzImportModal.tsx)
- [src/Pages/XaridorUchot/Kompaniyalar.tsx](../src/Pages/XaridorUchot/Kompaniyalar.tsx)
- [src/Pages/XaridorUchot/MijozQarzlariTab.tsx](../src/Pages/XaridorUchot/MijozQarzlariTab.tsx)
- [src/Pages/XaridorUchot/Xaridorlar.tsx](../src/Pages/XaridorUchot/Xaridorlar.tsx)
- [src/Pages/XaridorUchot/XaridorTablari.tsx](../src/Pages/XaridorUchot/XaridorTablari.tsx)
- [src/Pages/XaridorUchot/XaridorTolovlariTab.tsx](../src/Pages/XaridorUchot/XaridorTolovlariTab.tsx)
- [src/Pages/XaridorUchot/YetkazibBeruvchilar.tsx](../src/Pages/XaridorUchot/YetkazibBeruvchilar.tsx)
- [src/Pages/XaridorUchot/YetkazibBoshlangichQarzTab.tsx](../src/Pages/XaridorUchot/YetkazibBoshlangichQarzTab.tsx)
- [src/Pages/XodimUchot/Davomat.tsx](../src/Pages/XodimUchot/Davomat.tsx)
- [src/Pages/XodimUchot/Lavozimlar.tsx](../src/Pages/XodimUchot/Lavozimlar.tsx)
- [src/Pages/XodimUchot/Vakolatlar.tsx](../src/Pages/XodimUchot/Vakolatlar.tsx)
- [src/Pages/XodimUchot/Xodimlar.tsx](../src/Pages/XodimUchot/Xodimlar.tsx)
- [src/Pages/XodimUchot/XodimTablari.tsx](../src/Pages/XodimUchot/XodimTablari.tsx)

Yangi umumiy frontend fayllari:

- [SmartTable.tsx](../src/Components/common/smart-table/SmartTable.tsx)
- [model.tsx](../src/Components/common/smart-table/model.tsx)
- [preferences.ts](../src/Components/common/smart-table/preferences.ts)
- [sotuvMasulMalumoti.ts](../src/lib/sotuvMasulMalumoti.ts)
- [smart-table.css](../src/Components/common/smart-table/smart-table.css)

Test/qo‘llab-quvvatlash fayllari: package.json, package-lock.json (faqat dev-test jsdom dependency va test:tables buyrug‘i), tests/smartTable.test.mjs, tests/smartTableComponent.test.mjs, tests/smartTableCoverage.test.mjs, tests/smart-table.browser.html, tests/smart-table.browser.tsx. tests/qarzdorlikMijoz.test.mjs yangi presentation dependency’ni taniydi; tests/skanerVaTartib.test.mjs URL yo‘lini Windows’da fileURLToPath bilan oladi.

Har bir jadval uchun data source, column definition, renderer, editable cell, sorting/filtering, sticky, pagination, permission va export audit tafsilotlari [smart-table-audit.json](smart-table-audit.json) faylida. Unda biznes qatorlari yoki live qiymatlar yo‘q.
