import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { calls, handlers, katalogTinglovchilari, reset } from './helpers/savdoYuklashClient.mjs';

// 23.11 tezlik: katalog/qoldiq/mijoz ro'yxatlari keraksiz qayta yuklanmaydi va qayta hisoblanmaydi, lekin yangi ma'lumot yo'qolmaydi.
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './catalogApi', './sozlamalarApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi', '@/api/partnersApi', '@/Pages/Savdo/savdoYordamchilari'].includes(specifier)) {
        return { url: fixture, shortCircuit: true };
      }
      if (specifier.startsWith('@/')) {
        return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      }
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
        return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
const { useSavdoStore } = await import('../src/store/savdoStore.ts');
const { mijozlarRoyxatiniOlish } = await import('../src/api/savdoApi.ts');
const { toliqModifikatsiyalar, toliqMahsulotlar, toliqKatalogniEskirtiradimi, TOLIQ_KATALOG_GURUHI } = await import('../src/api/toliqKatalog.ts');
const { malumotnomaKeshiniTozalash } = await import('../src/lib/malumotnomaKeshi.ts');
const initial = useSavdoStore.getState();
const count = url => calls.filter(call => call.url === url).length;
const manba = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
function boshlash() {
  reset();
  malumotnomaKeshiniTozalash();
  useSavdoStore.setState(initial, true);
}
const katalogQatori = (id, nom, narx) => ({ id, productId: `p-${id}`, name: 'Asosiy variant', product: { id: `p-${id}`, name: nom }, price: { retailPrice: narx, wholesalePrice: narx, sellingPrice: narx } });

test('qayta ochishda o\'sha qoldiq + o\'sha katalog qayta birlashtirilmaydi: store o\'sha massivni oladi (oyna hammasini qayta hisoblamaydi)', async () => {
  boshlash();
  const katalog = [katalogQatori('m1', 'Sement', 100), katalogQatori('m2', 'Gips', 50)];
  handlers.set('qidiruv', () => katalog);
  handlers.set('/reports/stock-balance', () => ({ items: [{ modificationId: 'm1', productId: 'p-m1', productName: 'Sement', availableQuantity: 3, retailPrice: 100, warehouseId: 'w1' }], totalPages: 1 }));
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  const birinchi = useSavdoStore.getState().qoldiqlar;
  assert.ok(birinchi.length >= 2);
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  assert.equal(useSavdoStore.getState().qoldiqlar, birinchi, 'o\'sha massiv');
  assert.equal(count('/reports/stock-balance'), 1);
});

test('katalog yangilansa (yangi narx) qoldiq keshi ichida ham yangi narx bilan qayta birlashtiriladi', async () => {
  boshlash();
  let katalog = [katalogQatori('m1', 'Sement', 100)];
  handlers.set('qidiruv', () => katalog);
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  const eski = useSavdoStore.getState().qoldiqlar;
  katalog = [katalogQatori('m1', 'Sement', 120)];
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  const yangi = useSavdoStore.getState().qoldiqlar;
  assert.notEqual(yangi, eski);
  assert.equal(Number(yangi.find(q => q.modificationId === 'm1').price), 120);
  assert.equal(count('/reports/stock-balance'), 1, 'ombor qoldig\'i keshdan (30 s)');
});

test('kesh berilmasa ombor qoldig\'i yangidan olinadi va natija yangilanadi', async () => {
  boshlash();
  const katalog = [katalogQatori('m1', 'Sement', 100)];
  handlers.set('qidiruv', () => katalog);
  let miqdor = 3;
  handlers.set('/reports/stock-balance', () => ({ items: [{ modificationId: 'm1', productId: 'p-m1', productName: 'Sement', availableQuantity: miqdor, retailPrice: 100, warehouseId: 'w1' }], totalPages: 1 }));
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  miqdor = 1;
  await initial.qoldiqlarniYuklash('w1');
  const qator = useSavdoStore.getState().qoldiqlar.find(q => q.warehouseId === 'w1');
  assert.equal(qator.quantity, 1);
  assert.equal(count('/reports/stock-balance'), 2);
});

test('mijozlar ro\'yxati: bir vaqtdagi so\'rovlar bitta, tugagach keyingisi yangi (balans eskirmaydi), har chaqiruvchiga alohida massiv', async () => {
  boshlash();
  let balans = 10;
  handlers.set('/partners/customers', async () => { await new Promise(r => setImmediate(r)); return [{ id: 'c1', balance: balans }]; });
  const [a, b] = await Promise.all([mijozlarRoyxatiniOlish(), mijozlarRoyxatiniOlish()]);
  assert.equal(count('/partners/customers'), 1);
  assert.notEqual(a, b);
  a.push({ id: 'x' });
  assert.equal(b.length, 1);
  balans = 25;
  const c = await mijozlarRoyxatiniOlish();
  assert.equal(count('/partners/customers'), 2);
  assert.equal(c[0].balance, 25);
});

test('to\'liq katalog ro\'yxatlari umumiy keshda: bir vaqtda va 1 daqiqa ichida bitta so\'rov, tozalangach yangisi', async () => {
  boshlash();
  handlers.set('/catalog/modifications', () => ({ data: [{ id: 'm1' }] }));
  handlers.set('/catalog/products', () => [{ id: 'p1' }]);
  const [a, b] = await Promise.all([toliqModifikatsiyalar(), toliqModifikatsiyalar()]);
  await toliqModifikatsiyalar();
  await toliqMahsulotlar();
  assert.deepEqual(a, [{ id: 'm1' }]);
  assert.notEqual(a, b, 'har chaqiruvchiga nusxa');
  assert.equal(count('/catalog/modifications'), 1);
  assert.equal(count('/catalog/products'), 1);
  malumotnomaKeshiniTozalash(TOLIQ_KATALOG_GURUHI);
  await toliqModifikatsiyalar();
  assert.equal(count('/catalog/modifications'), 2);
});

test('to\'liq katalog xato bersa (masalan 403) keshda qolmaydi', async () => {
  boshlash();
  let urinish = 0;
  handlers.set('/catalog/modifications', () => { urinish += 1; if (urinish === 1) throw new Error('403'); return []; });
  await assert.rejects(toliqModifikatsiyalar(), /403/);
  await toliqModifikatsiyalar();
  assert.equal(urinish, 2);
});

test('qaysi o\'zgartirishlar to\'liq katalogni eskirtiradi', () => {
  for (const [method, url, kutilgan] of [
    ['patch', '/catalog/modifications/prices', true],
    ['post', '/inventory/purchases/1/confirm', true],
    ['post', '/inventory/transfers', true],
    ['put', '/settings/exchange-rates', true],
    ['post', '/production/orders', true],
    ['get', '/catalog/modifications', false],
    ['post', '/sales', false],
    ['post', '/partners/customers', false],
    [undefined, '/catalog/products', false],
  ]) assert.equal(toliqKatalogniEskirtiradimi({ method, url }), kutilgan, `${method} ${url}`);
});

test('savdo katalogi: narx/kurs/kirim — qattiq tozalash, boshqa ombor hujjatlari — yumshoq; xato javobda ham; sessiya kaliti tokenga bog\'liq emas', () => {
  const kod = manba('src/api/catalogApi.ts');
  assert.match(kod, /\["\/catalog\/", "\/settings\/", "\/inventory\/purchases"\]\.some\(\(prefix\) => yol\.startsWith\(prefix\)\)\) katalogYuklagich\.tozalash\(\);\s*else katalogYuklagich\.eskirtirish\(\);/);
  assert.match(kod, /\(error: unknown\) => \{\s*katalogKeshiniYangilash\(/);
  assert.match(kod, /sessiyaEgasi\(tokenlar\.accessToken, tokenlar\.username \?\? ""\)\}:\$\{apiTiliniOlish\(\)\}:\$\{valyuta\.kursBor \? valyuta\.kurs : 0\}/);
  assert.ok(!kod.includes('authTokenlarniOlish().accessToken ?? ""}:'), 'token yangilanishi katalogni tashlamaydi');
});

test('sahifa almashganda sahifa bir marta mount bo\'ladi (chiqish animatsiyasi yo\'q) va POS sotuvidan keyin katalog qayta yuklanmaydi', () => {
  const panel = manba('src/Components/layout/AsosiyPanel.tsx');
  assert.ok(!/<AnimatePresence/.test(panel));
  assert.match(panel, /<motion\.div\s+key=\{location\.pathname\}/);
  assert.match(manba('src/Pages/BoshSahifa/index.tsx'), /void savdo\.qoldiqlarniYuklash\(birinchi\.warehouseId, \{ kesh: true \}\);/);
});

const tick = () => new Promise(resolve => setImmediate(resolve));
const narxi = id => Number(useSavdoStore.getState().qoldiqlar.find(q => q.modificationId === id)?.price);

test("fonda yangi katalog kelsa ochiq qoldiqlar jimgina yangi narx bilan qayta yig'iladi (yuklanmoqda bayrog'i yoqilmaydi)", async () => {
  boshlash();
  let katalog = [katalogQatori('m1', 'Sement', 100)];
  handlers.set('qidiruv', () => katalog);
  await initial.qoldiqlarniYuklash('w1', { kesh: true });
  assert.equal(narxi('m1'), 100);
  katalog = [katalogQatori('m1', 'Sement', 120)];
  const bayroqlar = [];
  const bekor = useSavdoStore.subscribe(state => bayroqlar.push(state.qoldiqYuklanmoqda));
  for (const fn of katalogTinglovchilari) fn();
  await tick(); await tick();
  bekor();
  assert.equal(narxi('m1'), 120);
  assert.ok(!bayroqlar.includes(true), "ochiq sotuv tugmalari o'chirilmaydi");
  assert.equal(count('/reports/stock-balance'), 1, 'qoldiq keshdan');
});

test("yangi katalog qoldiq yuklanayotgan paytda kelsa, yuklash tugagach qayta yig'iladi (eski narx qolib ketmaydi)", async () => {
  boshlash();
  let katalog = [katalogQatori('m1', 'Sement', 100)];
  handlers.set('qidiruv', () => katalog);
  let tugat;
  handlers.set('/reports/stock-balance', () => new Promise(resolve => { tugat = () => resolve({ items: [], totalPages: 1 }); }));
  const yuklash = initial.qoldiqlarniYuklash('w1', { kesh: true });
  await tick();
  assert.equal(useSavdoStore.getState().qoldiqYuklanmoqda, true);
  katalog = [katalogQatori('m1', 'Sement', 130)];
  for (const fn of katalogTinglovchilari) fn();
  tugat();
  await yuklash;
  assert.equal(narxi('m1'), 100, 'yuklash eski katalogni olgan edi');
  await tick(); await tick();
  assert.equal(narxi('m1'), 130);
  assert.equal(useSavdoStore.getState().qoldiqYuklanmoqda, false);
});

test('POS mahsulotlar royxati ham fonda kelgan katalogga obuna, Yangilash katalogni bir marta majburlaydi', () => {
  const kod = manba('src/Components/layout/usePosMahsulotlar.ts');
  assert.match(kod, /katalogYangilanishigaObuna\(\(\) => setKatalogVersiyasi/);
  assert.match(kod, /\[warehouseId, yangilash, kalit, katalogVersiyasi\]/);
  assert.match(kod, /const majbur = yangilash > 0 && majburlanganYangilash\.current !== yangilash;/);
});

test('qo‘lda Yangilash umumiy katalog keshini chetlab o‘tadi; POS ro‘yxati katalog yangilanganda qoldiqni qayta so‘ramaydi', () => {
  assert.match(manba('src/Pages/Mahsulotlar/index.tsx'), /onClick=\{\(\) => \{ toliqKatalogniTozalash\(\); void yuklash\(\); \}\}/);
  assert.match(manba('src/Pages/Monitoring/index.tsx'), /function yangilash\(\) \{[\s\S]*?toliqKatalogniTozalash\(\);\s*setYangilanish/);
  const pos = manba('src/Components/layout/usePosMahsulotlar.ts');
  assert.match(pos, /if \(qoldiqSorovi\.current\?\.kalit !== kalit\) qoldiqSorovi\.current = \{ kalit, sorov: omborQoldiqlariniOlish\(warehouseId\) \};/);
  assert.match(manba('src/api/savdoApi.ts'), /katalogModifikatsiyalariniQoldiqTanlovigaOlish\(false, true\)\.catch/);
});

test('jim qayta yig‘ish ombor qoldig‘ini qayta so‘ramaydi (30 s kesh tugagan bo‘lsa ham) — faqat yangi katalog bilan qayta birlashtiradi', async () => {
  boshlash();
  const asl = Date.now;
  let hozir = 5_000_000;
  Date.now = () => hozir;
  try {
    let katalog = [katalogQatori('m1', 'Sement', 100)];
    handlers.set('qidiruv', () => katalog);
    await initial.qoldiqlarniYuklash('w1', { kesh: true });
    hozir += 120_000;
    katalog = [katalogQatori('m1', 'Sement', 140)];
    for (const fn of katalogTinglovchilari) fn();
    await tick(); await tick(); await tick();
    assert.equal(narxi('m1'), 140);
    assert.equal(count('/reports/stock-balance'), 1);
    assert.equal(count('/inventory/stock-balance'), 0);
  } finally {
    Date.now = asl;
  }
});
