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

test('marshrut: /demo/3d asosiy (lazy, ochiq), /demo/3d-sex unga yo\'naltiriladi (replace)', () => {
  const router = manba('src/routes/AppRouter.tsx');
  assert.match(router, /const Demo3DSex = lazy\(\(\) => import\("@\/Pages\/Demo3DSex"\)\)/);
  assert.match(router, /<Route path="\/demo\/3d" element=\{<Demo3DSex \/>\} \/>/);
  assert.match(router, /<Route path="\/demo\/3d-sex" element=\{<Navigate to="\/demo\/3d" replace \/>\} \/>/);
  // Ochiq: ProtectedRoute ichida emas — Routes ichidagi birinchi yo'llardan.
  const routes = router.indexOf('<Routes>');
  const demo = router.indexOf('path="/demo/3d"');
  const himoya = router.indexOf('<ProtectedRoute>', routes);
  assert.ok(routes >= 0 && demo > routes && (himoya < 0 || demo < himoya), 'demo marshruti himoyalanmagan');
});

test('bosh sahifa tugmasi /demo/3d ga olib boradi, yorlig\'i i18n demo3d.label', () => {
  const bosh = manba('src/Pages/BoshSahifa/index.tsx');
  assert.match(bosh, /data-demo-3d\s+onClick=\{\(\) => navigate\("\/demo\/3d"\)\}/);
  assert.ok(!bosh.includes('navigate("/demo/3d-sex")'), 'eski manzil qolmagan');
  assert.match(bosh, /\{t\("demo3d\.label"\)\}/);
  assert.match(bosh, /title=\{t\("demo3d\.title"\)\}/);
});

test('i18n: bosh_sahifa demo3d kalitlari uz/ru — "3D Demo" / "3D Демо", "sex"/"цех" so\'zisiz', () => {
  const uz = JSON.parse(manba('src/i18n/locales/uz/bosh_sahifa.json')).demo3d;
  const ru = JSON.parse(manba('src/i18n/locales/ru/bosh_sahifa.json')).demo3d;
  assert.equal(uz.label, '3D Demo');
  assert.equal(ru.label, '3D Демо');
  for (const qiymat of [uz.label, uz.title]) assert.ok(!/\bsex/i.test(qiymat), qiymat);
  for (const qiymat of [ru.label, ru.title]) assert.ok(!/цех/i.test(qiymat), qiymat);
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
