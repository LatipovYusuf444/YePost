// O'tgan sanadagi inventarizatsiya (backend 27.11): movements_after_stock_take — "Davom etasizmi?" (confirmWarnings bilan qayta yuboriladi),
// later_stock_take — xato (qayta yuborilmaydi), matnlar va harakat turlari.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const src = new URL('../src/', import.meta.url);
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
  if (context.parentURL?.startsWith(src.href) && specifier.startsWith('.') && !/\.(ts|mjs|js)$/.test(specifier)) {
    return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
  }
  return next(specifier, context);
} });

const { KEYINGI_HARAKAT_KODI, KEYINGI_INVENTARIZATSIYA_KODI, OGOHLANTIRISH_KODI, harakatMatni, xatoKodiMatni } = await import('../src/api/xatoKodlari.ts');
const { ogohlantirishBilanBajarish, ogohlantirishXatosimi } = await import('../src/api/hujjatOgohlantirishi.ts');
const sorov = await import('../src/lib/ogohlantirishSorovi.ts');
const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

const harakatlar = [{ type: 'purchase', docId: 'p1', date: '2026-11-23', quantity: '44' }, { type: 'sale', docId: 's1', date: '2026-11-24', quantity: '-3' }];
const xato = (code, qoshimcha = {}, url = '/inventory/stock-takes/inv/confirm') =>
  Object.assign(new Error(code), { isAxiosError: true, config: { url }, response: { status: 409, data: { statusCode: 409, code, ...qoshimcha } } });

async function oynaKutish() {
  for (let i = 0; i < 50; i++) {
    const joriy = sorov.joriyOgohlantirish();
    if (joriy) return joriy;
    await new Promise((r) => setTimeout(r, 5));
  }
  return null;
}

test('movements_after_stock_take matni — savol: harakatlar ro\'yxati, "Davom etasizmi?", "bugungi sana" yo\'q', () => {
  const uz = xatoKodiMatni(KEYINGI_HARAKAT_KODI, '/inventory/stock-takes/inv/confirm', 'uz', { movements: harakatlar });
  assert.match(uz, /kirim 23\.11\.2026 \(44\)/);
  assert.match(uz, /sotuv 24\.11\.2026/);
  assert.match(uz, /Davom etasizmi\?$/);
  assert.doesNotMatch(uz, /bugungi sana/);
  assert.match(xatoKodiMatni(KEYINGI_HARAKAT_KODI, '/x', 'ru', { movements: harakatlar }), /Продолжить\?$/);
  // Ro'yxatsiz ham jumla tushunarli.
  assert.match(xatoKodiMatni(KEYINGI_HARAKAT_KODI, '/x', 'uz', {}), /^Inventarizatsiya sanasidan keyin shu tovarlar bo'yicha harakatlar bo'lgan\. Davom etasizmi\?$/);
});

test('later_stock_take matni: raqam va sana bilan (uz/ru), maydonlarsiz ham', () => {
  const tafsilot = { stockTakeId: 'st70', stockTakeNumber: 'INV-000070', stockTakeDate: '2026-11-24' };
  assert.equal(
    xatoKodiMatni(KEYINGI_INVENTARIZATSIYA_KODI, '/inventory/stock-takes/inv/cancel', 'uz', tafsilot),
    'Bu tovar 24.11.2026 sanasida INV-000070 inventarizatsiyada qayta sanalgan. Shu sanadan keyingi sana bilan sanang.'
  );
  assert.equal(
    xatoKodiMatni(KEYINGI_INVENTARIZATSIYA_KODI, '/x', 'ru', tafsilot),
    'Этот товар пересчитан 24.11.2026 в инвентаризации INV-000070. Проведите пересчёт датой после неё.'
  );
  assert.match(xatoKodiMatni(KEYINGI_INVENTARIZATSIYA_KODI, '/x', 'uz', {}), /keyinroq boshqa inventarizatsiyada qayta sanalgan/);
});

test('harakat turlari: ishlab chiqarish va yetkazib beruvchiga qaytarish nomi bilan', () => {
  assert.equal(harakatMatni({ type: 'production_close', date: '2026-11-23', quantity: '5' }, 'uz'), 'ishlab chiqarish 23.11.2026 (5)');
  assert.match(harakatMatni({ type: 'supplier_return', date: '2026-11-23', quantity: '-2' }, 'uz'), /^yetkazib beruvchiga qaytarish/);
  assert.match(harakatMatni({ type: 'write_off', date: '2026-11-23', quantity: '-2' }, 'ru'), /^списание/);
});

test('ogohlantirish: movements_after_stock_take va before_stock_take — ha; later_stock_take — xato (axios toast ham chiqadi)', () => {
  assert.equal(ogohlantirishXatosimi(xato(KEYINGI_HARAKAT_KODI, { movements: harakatlar })), true);
  assert.equal(ogohlantirishXatosimi(xato(OGOHLANTIRISH_KODI)), true);
  assert.equal(ogohlantirishXatosimi(xato(KEYINGI_INVENTARIZATSIYA_KODI)), false);
});

test('"Ha": oyna harakatlar ro\'yxatidan, so\'rov { confirmWarnings: true } bilan qayta yuboriladi', async () => {
  const chaqiruvlar = [];
  const ish = ogohlantirishBilanBajarish(async (tana) => {
    chaqiruvlar.push(tana ?? null);
    if (!tana) throw xato(KEYINGI_HARAKAT_KODI, { movements: harakatlar });
    return { data: { id: 'inv', status: 'CONFIRMED' } };
  });
  const oyna = await oynaKutish();
  assert.ok(oyna, 'savol oynasi chiqdi');
  assert.match(oyna.matn, /kirim 23\.11\.2026 \(44\)/);
  assert.equal(oyna.nom, 'Keyingi harakatlar: 2 ta');
  assert.match(oyna.matnlar.savol, /farq inventarizatsiya sanasiga yoziladi/);
  sorov.ogohlantirishgaJavob(oyna.id, true);
  assert.deepEqual(await ish, { data: { id: 'inv', status: 'CONFIRMED' } });
  assert.deepEqual(chaqiruvlar, [null, { confirmWarnings: true }]);
});

test('"Yo\'q": asl xato qaytadi, qayta yuborilmaydi (hujjat o\'zgarmaydi)', async () => {
  let soni = 0;
  const ish = ogohlantirishBilanBajarish(async () => { soni += 1; throw xato(KEYINGI_HARAKAT_KODI, { movements: harakatlar }, '/inventory/stock-takes/inv/revise'); });
  const oyna = await oynaKutish();
  sorov.ogohlantirishgaJavob(oyna.id, false);
  await assert.rejects(ish, (e) => e.response.data.code === KEYINGI_HARAKAT_KODI);
  assert.equal(soni, 1);
});

test('later_stock_take: savol chiqmaydi, darhol xato, qayta yuborilmaydi', async () => {
  let soni = 0;
  await assert.rejects(
    ogohlantirishBilanBajarish(async () => { soni += 1; throw xato(KEYINGI_INVENTARIZATSIYA_KODI, { stockTakeId: 'st70', stockTakeNumber: 'INV-000070', stockTakeDate: '2026-11-24' }); }),
    (e) => e.response.data.code === KEYINGI_INVENTARIZATSIYA_KODI
  );
  assert.equal(soni, 1);
  assert.equal(sorov.joriyOgohlantirish(), null);
});

test('ulanishlar: confirm va revise ogohlantirish bilan, cancel esa yo\'q; xato bannerlarida keyingi hujjat havolasi; tahrir matni savolga', () => {
  const api = manba('src/api/omborApi.ts');
  assert.match(api, /`\/inventory\/stock-takes\/\$\{id\}\/revise`, \{ \.\.\.data, confirmWarnings: false, \.\.\.tasdiq \}/);
  assert.match(api, /ogohlantirishBilanBajarish\(\(tana\) =>\s*apiClient\.post<InventarizatsiyaHujjati \| ApiEnvelope<InventarizatsiyaHujjati>>\(\s*`\/inventory\/stock-takes\/\$\{id\}\/confirm`,\s*tana/);
  assert.match(manba('src/Pages/Ombor/Inventarizatsiya.tsx'), /\{tahrirHujjati && <KeyingiSanoqHavolasi \/>\}/);
  assert.match(manba('src/Pages/Ombor/Inventarizatsiya.tsx'), /window\.addEventListener\(INVENTARIZATSIYA_OCHISH_HODISASI, ochish\)/);
  assert.match(manba('src/Pages/Ombor/InventoryHujjatModal.tsx'), /<KeyingiSanoqHavolasi \/>/);
  for (const til of ['uz', 'ru']) {
    const d = JSON.parse(manba(`src/i18n/locales/${til}/ombor_harakat.json`));
    assert.doesNotMatch(d.inventarizatsiya.editModal.movementsError, /Yangi inventarizatsiya qiling|Новую инвентаризацию/);
    assert.ok(d.inventarizatsiya.laterStockTake.open.includes('{{raqam}}'), til);
  }
});
