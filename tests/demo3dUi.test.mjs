import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 3D Demo — UI matnlari, nomi va sahifa ramkasi (manba darajasidagi tekshiruvlar; brauzer kerak emas).
const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

/** matnlar.ts dagi `const <til> = { ... };` obyektini manbadan ajratib oladi (i18next'ni Node'da yuklamaslik uchun). */
function matnlarObyekti(til) {
  const matn = manba('src/Pages/Demo3DSex/matnlar.ts').replace(/\r\n/g, '\n');
  const boshi = matn.search(new RegExp(`^const ${til}(?:: typeof uz)? = \\{`, 'm'));
  assert.ok(boshi >= 0, `${til} obyekti topilmadi`);
  const ochilish = matn.indexOf('{', boshi);
  let chuqurlik = 0;
  for (let i = ochilish; i < matn.length; i++) {
    if (matn[i] === '{') chuqurlik++;
    else if (matn[i] === '}' && --chuqurlik === 0) return new Function(`return (${matn.slice(ochilish, i + 1)});`)();
  }
  throw new Error(`${til} obyekti yopilmagan`);
}

/** Obyektdagi barcha satr qiymatlari (kalit yo'li bilan). */
function satrlar(obyekt, yol = '') {
  return Object.entries(obyekt).flatMap(([kalit, qiymat]) =>
    typeof qiymat === 'string' ? [[`${yol}${kalit}`, qiymat]] : satrlar(qiymat, `${yol}${kalit}.`),
  );
}

test('marshrut: /demo/3d faqat tizimga kirgan ADMIN/DIREKTOR uchun (ProtectedRoute → sahifagaRuxsatBormi), /demo/3d-sex unga yo\'naltiriladi', () => {
  const router = manba('src/routes/AppRouter.tsx');
  assert.match(router, /const Demo3DSex = lazy\(\(\) => import\("@\/Pages\/Demo3DSex"\)\)/);
  assert.match(router, /path="\/demo\/3d"\s+element=\{\s*<ProtectedRoute>\s*<Demo3DSex \/>\s*<\/ProtectedRoute>\s*\}/);
  assert.match(router, /<Route path="\/demo\/3d-sex" element=\{<Navigate to="\/demo\/3d" replace \/>\} \/>/);
  // Rol: ProtectedRoute sahifagaRuxsatBormi orqali tekshiradi — ADMIN/DIREKTOR barcha sahifalarga, KASSIR/OMBORCHI faqat o'z yo'llariga.
  const rollar = manba('src/lib/roles.ts');
  assert.match(rollar, /if \(rol === "ADMIN" \|\| rol === "DIREKTOR"\) return true;/);
  assert.ok(!/demo/.test(rollar), 'kassir/omborchi yo\'llarida demo yo\'q');
});

test('3D Demo tugmasi Bosh sahifada yo\'q — faqat Sozlamalarda (ADMIN/DIREKTOR uchun bo\'lim)', () => {
  const bosh = manba('src/Pages/BoshSahifa/index.tsx');
  assert.ok(!bosh.includes('data-demo-3d'), 'Bosh sahifada tugma qolmagan');
  assert.ok(!bosh.includes('/demo/3d'), 'Bosh sahifada 3D manzil yo\'q');
  const soz = manba('src/Pages/SozlamalarUchot/index.tsx');
  assert.match(soz, /\{ id: "demo3d", icon: Box, faqatAdmin: true \}/);
  assert.match(soz, /const admin = foydalanuvchiAdminmi\(profil\);/);
  assert.match(soz, /\(!b\.faqatAdmin \|\| admin\)/);
  assert.match(soz, /\{bolim === "demo3d" && admin && <Demo3dBolimi \/>\}/);
  const bolim = manba('src/Pages/SozlamalarUchot/Demo3dBolimi.tsx');
  assert.match(bolim, /data-demo-3d\s+onClick=\{\(\) => navigate\("\/demo\/3d"\)\}/);
  for (const til of ['uz', 'ru']) {
    const m = JSON.parse(manba(`src/i18n/locales/${til}/sozlamalar_uchot.json`));
    assert.ok(m.nav.demo3d && m.demo3d.open && m.demo3d.title, til);
    assert.ok(!('demo3d' in JSON.parse(manba(`src/i18n/locales/${til}/bosh_sahifa.json`))), `${til}: bosh sahifa kalitlari olib tashlangan`);
  }
});

test('matnlar: sarlavha, yuklanish va kamera tugmalari — "sex"/"цех" so\'zi ko\'rinmaydi; uz va ru kalitlari bir xil', () => {
  const uz = matnlarObyekti('uz');
  const ru = matnlarObyekti('ru');
  assert.equal(uz.title, '3D Demo');
  assert.equal(ru.title, '3D Демо');
  assert.equal(uz.demoBadge, "Demo — sinov ma'lumotlari");
  assert.equal(uz.camera.overview, 'Ishlab chiqarish');
  assert.equal(ru.camera.overview, 'Производство');
  assert.equal(uz.camera.office, 'Ofis');
  assert.equal(uz.camera.household, 'Maishiy blok');
  assert.equal(uz.camera.site, 'Hudud');
  assert.equal(uz.camera.top, 'Yuqoridan');
  assert.match(uz.credits, /Quaternius.*Kenney.*CC0/);
  assert.match(ru.credits, /Quaternius.*Kenney.*CC0/);
  for (const [kalit, qiymat] of satrlar(uz)) assert.ok(!/\bsex/i.test(qiymat), `uz.${kalit}: ${qiymat}`);
  for (const [kalit, qiymat] of satrlar(ru)) assert.ok(!/цех/i.test(qiymat), `ru.${kalit}: ${qiymat}`);
  // Mashina nomlari va "Hududda" matnlari o'zgarmagan.
  assert.equal(uz.logistics.show, "Hududda ko'rsatish");
  assert.deepEqual(satrlar(ru).map(([kalit]) => kalit), satrlar(uz).map(([kalit]) => kalit));
});

test('sahifa: 5 ta kamera tugmasi (data-kamera, aria-pressed), o\'raladigan panel, liniyalar bo\'yicha stanoklar, mualliflar qatori', () => {
  const sahifa = manba('src/Pages/Demo3DSex/index.tsx');
  for (const [tur, kalit] of [['umumiy', 'overview'], ['yuqori', 'top'], ['ofis', 'office'], ['maishiy', 'household'], ['hudud', 'site']]) {
    assert.match(sahifa, new RegExp(`\\{ tur: "${tur}", kalit: "camera\\.${kalit}"`), tur);
  }
  assert.match(sahifa, /data-kamera=\{tur\}/);
  assert.match(sahifa, /aria-pressed=\{faol\}/);
  // Kamera paneli tor ekranda o'raladi (gorizontal aylantirish yo'q).
  assert.match(sahifa, /role="group" aria-label=\{t\("camera\.title"\)\}/);
  assert.match(sahifa, /flex max-w-full flex-wrap gap-1/);
  // KameraBuyrugi turi yangi ko'rinishlarni qo'llaydi.
  const sahna = manba('src/Pages/Demo3DSex/SexSahnasi.tsx');
  assert.match(sahna, /export type KameraBuyrugi = \{ tur: [^}]*"ofis"[^}]*"maishiy"/);
  // Stanoklar ro'yxati: liniyalar (z < 0 — 1-liniya), data-stanok-royxat va aria-pressed saqlangan.
  assert.match(sahifa, /stanok\.joy\[1\] < 0/);
  assert.match(sahifa, /data-liniya=\{liniya\.raqam\}/);
  assert.match(sahifa, /t\("list\.line", \{ n: liniya\.raqam \}\)/);
  assert.match(sahifa, /data-stanok-royxat=\{stanok\.id\}/);
  assert.match(sahifa, /data-logistika/);
  assert.match(sahifa, /data-mualliflar[^>]*>\{t\("credits"\)\}/);
  assert.match(sahifa, /data-demo-belgi/);
  assert.ok(!/https?:\/\//.test(sahifa + manba('src/Pages/Demo3DSex/matnlar.ts')), 'tashqi havola yo\'q');
});
