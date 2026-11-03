import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { idempotentBajarish, idempotentKalitOlish, natijaNomalummi } from '../src/lib/idempotentKalit.ts';
import { ishlabChiqarishRuxsati, ishlabChiqarishYoliRuxsati, sahifagaRuxsatBormi } from '../src/lib/roles.ts';
import { serverMatniUstunmi, xatoKodiMatni } from '../src/api/xatoKodlari.ts';
import * as lib from '../src/lib/ishlabChiqarish.ts';

const huquq = (role, ...kodlar) => ({ role, grants: kodlar.map((code) => ({ code, isActive: true })) });
const kirim = (qism = {}) => ({ modificationId: 'm1', kind: 'FIXED', quantity: '2', tolerancePercent: '', min: '', max: '', ...qism });
const chiqim = (qism = {}) => ({ modificationId: 'm9', role: 'MAIN', quantity: '1', quantityType: '', ...qism });
const retsept = (qism = {}) => ({ modificationId: 'm9', warehouseId: 'w', baseQuantity: '100', outputMin: '', outputMax: '', normalScrapPercent: '', consumeOnIssue: true, note: ' ', inputs: [kirim()], outputs: [chiqim()], ...qism });
const smena = (qism = {}) => ({ orderId: 'o1', recipeId: '', destWarehouseId: '', shiftEndsAt: '', comment: '', outputs: [{ quantity: '120.5', scrapQuantity: '', serial: '', modificationId: '', role: '' }], inputs: [], downtime: [], ...qism });

test('one logical press keeps its key across unknown outcomes and drops it once the server answered', async () => {
  const kalitlar = [];
  const uzildi = Object.assign(new Error('network'), {});
  const tana = { orderId: 'o1' };
  await assert.rejects(idempotentBajarish('POST /a', tana, async (kalit) => { kalitlar.push(kalit); throw uzildi; }));
  await assert.rejects(idempotentBajarish('POST /a', tana, async (kalit) => { kalitlar.push(kalit); throw { response: { status: 409 } }; }));
  await idempotentBajarish('POST /a', tana, async (kalit) => { kalitlar.push(kalit); return 1; });
  assert.equal(new Set(kalitlar).size, 1, 'noma‘lum natijada shu kalit qayta yuboriladi');
  assert.notEqual(idempotentKalitOlish('POST /a', tana), kalitlar[0], 'muvaffaqiyatdan keyin yangi kalit');
});

test('a validation error frees the key: after writing a comment the close button is a new request', async () => {
  const kalitlar = [];
  await assert.rejects(idempotentBajarish('POST /b', null, async (kalit) => { kalitlar.push(kalit); throw { response: { status: 400 } }; }));
  await idempotentBajarish('POST /b', null, async (kalit) => { kalitlar.push(kalit); });
  assert.notEqual(kalitlar[0], kalitlar[1]);
});

test('different data gets a different key, and keys expire after 24 hours', () => {
  const birinchi = idempotentKalitOlish('POST /c', { a: 1 }, 0);
  assert.notEqual(idempotentKalitOlish('POST /c', { a: 2 }, 0), birinchi);
  assert.equal(idempotentKalitOlish('POST /c', { a: 1 }, 1000), birinchi);
  assert.notEqual(idempotentKalitOlish('POST /c', { a: 1 }, 25 * 3600 * 1000), birinchi);
  assert.equal(natijaNomalummi(new Error('x')), true);
  assert.equal(natijaNomalummi({ response: { status: 500 } }), true);
  assert.equal(natijaNomalummi({ response: { status: 422 } }), false);
});

test('sections follow the documented roles and grants; prices stay behind COSTING', () => {
  assert.equal(ishlabChiqarishRuxsati(huquq('DIRECTOR'), 'kalkulyatsiya'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('ADMIN'), 'kalkulyatsiya'), false, 'ADMIN narxni COSTING huquqisiz ko‘rmaydi');
  assert.equal(ishlabChiqarishRuxsati(huquq('ADMIN', 'COSTING'), 'kalkulyatsiya'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('ADMIN'), 'retseptlar'), false);
  assert.equal(ishlabChiqarishRuxsati(huquq('ADMIN'), 'buyurtmalar'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('STOREKEEPER'), 'buyurtmalar'), false);
  assert.equal(ishlabChiqarishRuxsati(huquq('STOREKEEPER', 'PRODUCTION_ISSUE'), 'sexga-berish'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('CASHIER', 'PRODUCTION_REPORT'), 'smena'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('CASHIER', 'PRODUCTION_REPORT'), 'rulonlar'), true);
  assert.equal(ishlabChiqarishRuxsati({ role: 'CASHIER', grants: [{ code: 'PRODUCTION_REPORT', isActive: false }] }, 'smena'), false);
});

test('route guard: a granted worker reaches their screen, others do not, unknown sections are closed', () => {
  assert.equal(sahifagaRuxsatBormi(huquq('CASHIER', 'PRODUCTION_REPORT'), '/ishlab-chiqarish/smena'), true);
  assert.equal(sahifagaRuxsatBormi(huquq('CASHIER', 'PRODUCTION_REPORT'), '/ishlab-chiqarish/kalkulyatsiya'), false);
  assert.equal(sahifagaRuxsatBormi(huquq('CASHIER'), '/ishlab-chiqarish'), false);
  assert.equal(sahifagaRuxsatBormi(huquq('CASHIER', 'COSTING'), '/ishlab-chiqarish'), true);
  assert.equal(sahifagaRuxsatBormi(huquq('ADMIN'), '/ishlab-chiqarish/kalkulyatsiya'), false);
  assert.equal(ishlabChiqarishYoliRuxsati(huquq('DIRECTOR'), '/ishlab-chiqarish/yoq'), false);
  assert.equal(sahifagaRuxsatBormi(huquq('CASHIER'), '/kassa'), true, 'boshqa bo‘limlar o‘zgarmagan');
  assert.equal(sahifagaRuxsatBormi(huquq('STOREKEEPER'), '/ombor/kirimlar'), true);
});

test('recipe body keeps only the fields of each input kind and validates before sending', () => {
  const { tana } = lib.retseptTanasiniYigish(retsept({ inputs: [kirim({ tolerancePercent: '5' }), kirim({ kind: 'RANGE', quantity: '', min: '1', max: '3' }), kirim({ kind: 'FREE', quantity: '' })], outputs: [chiqim(), chiqim({ role: 'WASTE', quantityType: 'PER_BATCH', quantity: '0,5' })] }));
  assert.deepEqual(tana.inputs, [
    { modificationId: 'm1', kind: 'FIXED', quantity: 2, tolerancePercent: 5 },
    { modificationId: 'm1', kind: 'RANGE', min: 1, max: 3 },
    { modificationId: 'm1', kind: 'FREE' },
  ]);
  assert.deepEqual(tana.outputs[1], { modificationId: 'm9', role: 'WASTE', quantity: 0.5, quantityType: 'PER_BATCH' });
  assert.equal('note' in tana, false);
  assert.equal(tana.consumeOnIssue, true);
  assert.equal(lib.retseptTanasiniYigish(retsept({ modificationId: '' })).xato, 'errors.product');
  assert.equal(lib.retseptTanasiniYigish(retsept({ warehouseId: '' })).xato, 'errors.wipWarehouse');
  assert.equal(lib.retseptTanasiniYigish(retsept({ baseQuantity: '0' })).xato, 'errors.baseQuantity');
  assert.equal(lib.retseptTanasiniYigish(retsept({ inputs: [] })).xato, 'errors.noInputs');
  assert.equal(lib.retseptTanasiniYigish(retsept({ outputs: [chiqim({ role: 'WASTE' })] })).xato, 'errors.noMainOutput');
  assert.equal(lib.retseptTanasiniYigish(retsept({ inputs: [kirim({ kind: 'RANGE', min: '5', max: '1' })] })).xato, 'errors.lineRange');
});

test('costing body requires a rate for USD lines and the estimate converts them', () => {
  const forma = { modificationId: 'm9', recipeId: '', validFrom: '', normalScrapPercent: '', note: '', lines: [{ modificationId: 'm1', quantity: '2', price: '10', currency: 'USD', costingRate: '' }] };
  assert.equal(lib.kalkulyatsiyaTanasiniYigish(forma).xato, 'errors.lineRate');
  forma.lines[0].costingRate = '12000';
  assert.deepEqual(lib.kalkulyatsiyaTanasiniYigish(forma).tana.lines, [{ modificationId: 'm1', quantity: 2, price: 10, currency: 'USD', costingRate: 12000 }]);
  assert.equal(lib.kalkulyatsiyaJami([...forma.lines, { modificationId: 'm2', quantity: '3', price: '100', currency: 'UZS', costingRate: '' }]), 240300);
  const somda = lib.kalkulyatsiyaTanasiniYigish({ ...forma, lines: [{ modificationId: 'm1', quantity: '1', price: '0', currency: 'UZS', costingRate: '999' }] });
  assert.equal('costingRate' in somda.tana.lines[0], false, 'so‘m qatoriga kurs yuborilmaydi');
});

test('shift body: stock is left to the norm when empty, off-recipe is flagged, serial characters are checked', () => {
  const { tana } = lib.smenaTanasiniYigish(smena({ shiftEndsAt: '2026-11-02T20:00' }));
  assert.equal(tana.orderId, 'o1');
  assert.deepEqual(tana.outputs, [{ quantity: 120.5 }]);
  assert.equal('inputs' in tana, false, 'inputs berilmasa server normadan to‘ldiradi');
  assert.equal('downtime' in tana, false);
  assert.match(tana.shiftEndsAt, /^2026-11-02T\d\d:00:00\.000Z$/);
  const toliq = lib.smenaTanasiniYigish(smena({ inputs: [{ modificationId: 'm1', quantity: '5', entryMethod: 'ACTUAL', offRecipe: true }], downtime: [{ reason: 'NO_POWER', hours: '1.5', note: '' }] })).tana;
  // offRecipe serverda aniqlanadi (2026-11-02): formada belgilangan bo'lsa ham yuborilmaydi.
  assert.deepEqual(toliq.inputs, [{ modificationId: 'm1', quantity: 5, entryMethod: 'ACTUAL' }]);
  assert.deepEqual(toliq.downtime, [{ reason: 'NO_POWER', hours: 1.5 }]);
  assert.deepEqual(lib.smenaTanasiniYigish(smena({ orderId: '', recipeId: 'r1', destWarehouseId: 'w2' })).tana.recipeId, 'r1');
  assert.equal(lib.smenaTanasiniYigish(smena({ orderId: '', recipeId: 'r1' })).xato, 'errors.orderOrRecipe');
  assert.equal(lib.smenaTanasiniYigish(smena({ outputs: [] })).xato, 'errors.noOutputs');
  assert.equal(lib.smenaTanasiniYigish(smena({ outputs: [{ quantity: '1', scrapQuantity: '', serial: 'J 10', modificationId: '', role: '' }] })).xato, 'errors.serialFormat');
  assert.equal(lib.smenaTanasiniYigish(smena({ downtime: [{ reason: 'OTHER', hours: '', note: '' }] })).xato, 'errors.downtimeHours');
});

test('serial charset, names from either response shape and availability fallback', () => {
  for (const seriya of ['J-1031-01', 'SMH-000001-01', 'a.b_c']) assert.equal(lib.seriyaYaroqlimi(seriya), true);
  for (const seriya of ['J 10', 'рулон', 'a/b', '']) assert.equal(lib.seriyaYaroqlimi(seriya), false);
  assert.equal(lib.qatorNomi({ productName: 'Sement' }), 'Sement');
  assert.equal(lib.qatorNomi({ modification: { name: 'Asosiy', product: { name: 'Plyonka' } } }), 'Plyonka');
  assert.equal(lib.qatorNomi({}), '—');
  const javob = { orderId: 'o1', items: [{ productName: 'Jumbo roll', required: '2300', issued: '0', available: '1150', shortage: '1150' }], hasShortage: true };
  assert.deepEqual(lib.mavjudlikOqish(javob), { items: javob.items, hasShortage: true });
  assert.equal(lib.mavjudlikOqish({ items: [], hasShortage: false }).hasShortage, false);
  assert.deepEqual(lib.mavjudlikOqish(undefined), { items: [], hasShortage: false });
  const portlash = lib.portlashOqish({ recipeId: 'r1', quantity: '300', inputs: [{ productName: 'Jumbo roll', kind: 'FIXED', quantity: '138', min: null, max: null }], outputs: [{ productName: 'Skotch', role: 'MAIN', quantity: '300' }, { productName: 'Kromka', role: 'WASTE', quantity: '1.8' }] });
  assert.equal(portlash.inputs.length, 1);
  assert.equal(portlash.outputs.length, 2);
  assert.equal(lib.portlashMiqdori(portlash.outputs[1]), 1.8);
  assert.equal(lib.portlashMiqdori({ kind: 'FREE', quantity: null }), undefined);
  assert.deepEqual(lib.portlashOqish(undefined), { inputs: [], outputs: [] });
});

test('every documented production error has a clear text in both languages', () => {
  const kodlar = ['disabled', 'idempotency_mismatch', 'request_in_progress', 'serial_needs_on_issue', 'costing_card_date_taken', 'completion_reason_required', 'costing_card_missing', 'report_output_sold'];
  for (const kod of kodlar) {
    assert.ok(xatoKodiMatni(`errors.production.${kod}`, '/production/x', 'uz'), kod);
    assert.ok(xatoKodiMatni(`errors.production.${kod}`, '/production/x', 'ru'), kod);
  }
  for (const kod of ['serial_required', 'serial_tracking_in_use', 'draft_only_confirmable']) assert.ok(xatoKodiMatni(`errors.inventory.${kod}`, '/x', 'uz'), kod);
  assert.match(xatoKodiMatni('errors.production.comment_required', '/x', 'uz', { name: 'Plyonka', percent: 12 }), /Plyonka 12%/);
  assert.ok(xatoKodiMatni('errors.production.comment_required', '/x', 'ru', {}));
});

test('uz and ru module texts have the same keys and every key used in the screens exists', () => {
  const oqish = (til) => JSON.parse(readFileSync(new URL(`../src/i18n/locales/${til}/ishlab_chiqarish.json`, import.meta.url), 'utf8'));
  const tekis = (obyekt, yol = '') => Object.entries(obyekt).flatMap(([kalit, qiymat]) => (typeof qiymat === 'object' ? tekis(qiymat, `${yol}${kalit}.`) : [`${yol}${kalit}`]));
  const uz = tekis(oqish('uz')).sort();
  assert.deepEqual(tekis(oqish('ru')).sort(), uz);
  const fayllar = ['umumiy', 'Retseptlar', 'Kalkulyatsiya', 'Buyurtmalar', 'SexgaBerish', 'Smena', 'Rulonlar', 'index'].map((nom) => `src/Pages/IshlabChiqarish/${nom}.tsx`).concat('src/Pages/SozlamalarUchot/IshlabChiqarishBolimi.tsx');
  const kalitlar = new Set(uz);
  for (const fayl of fayllar) {
    const manba = readFileSync(new URL(`../${fayl}`, import.meta.url), 'utf8');
    for (const [, kalit] of manba.matchAll(/\bt\("([a-zA-Z.]+)"/g)) assert.ok(kalitlar.has(kalit), `${fayl}: ${kalit}`);
  }
});

test('real response shapes: empty draft number, linked document numbers, corrected output', () => {
  assert.equal(lib.hujjatRaqami({ docNumber: '' }), '');
  assert.equal(lib.hujjatRaqami({ docNumber: 'ICHB-000001' }), 'ICHB-000001');
  assert.equal(lib.hujjatRaqami(null), '');
  assert.equal(lib.raqamXaritasi([{ id: 'o1', docNumber: 'ICHB-000001' }]).get('o1'), 'ICHB-000001');
  assert.equal(lib.raqamXaritasi(null).size, 0);
  const chiqim = { quantity: '1920', corrections: [{ delta: '-5', reason: 'Qayta sanaldi' }] };
  assert.equal(lib.chiqimMiqdori(chiqim), 1915);
  assert.equal(lib.chiqimMiqdori({ quantity: '12.5' }), 12.5);
  const chiqindi = { role: 'WASTE', productName: 'Kromka' };
  const asosiy = { role: 'MAIN', productName: 'Skotch 48x100' };
  assert.equal(lib.hisobotMahsuloti({ outputs: [chiqindi, asosiy] }), asosiy);
  assert.equal(lib.hisobotMahsuloti({ outputs: [chiqindi] }), chiqindi);
  assert.equal(lib.hisobotMahsuloti({}), undefined);
});

test('production errors show the server message in the user language; the code only drives branching', () => {
  assert.equal(serverMatniUstunmi('errors.production.report_output_sold', "Hisobotdagi mahsulot sotilgan"), true);
  assert.equal(serverMatniUstunmi('errors.production.report_output_sold', 'errors.production.report_output_sold'), false, 'message kod bo‘lsa mahalliy matn');
  assert.equal(serverMatniUstunmi('errors.production.report_output_sold', ''), false);
  assert.equal(serverMatniUstunmi('errors.inventory.serial_required', 'Seriya kerak'), false);
  assert.equal(serverMatniUstunmi(undefined, 'Matn'), false);
});

test('order pages use the backend status names', () => {
  const sahifa = readFileSync(new URL('../src/Pages/IshlabChiqarish/Buyurtmalar.tsx', import.meta.url), 'utf8');
  assert.equal(sahifa.includes('COMPLETED'), false);
  assert.match(sahifa, /"IN_PROGRESS", "DONE", "CLOSED", "CANCELLED"/);
  for (const til of ['uz', 'ru']) {
    const matnlar = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${til}/ishlab_chiqarish.json`, import.meta.url), 'utf8'));
    for (const holat of ['DRAFT', 'RELEASED', 'IN_PROGRESS', 'DONE', 'CLOSED', 'CANCELLED', 'CONFIRMED', 'ACTIVE', 'ARCHIVED', 'IN_STOCK', 'USED']) assert.ok(matnlar.status[holat], `${til} ${holat}`);
    assert.equal(matnlar.status.COMPLETED, undefined);
  }
});

test('list search and status-group filter used by the production tables', () => {
  assert.equal(lib.qidiruvgaMos('', ['x']), true);
  assert.equal(lib.qidiruvgaMos('ichb-0002', ['ICHB-0002', 'Skotch']), true);
  assert.equal(lib.qidiruvgaMos('rulon', [null, undefined, 'Skotch']), false);
  const qatorlar = [{ status: 'DRAFT' }, { status: 'RELEASED' }, { status: 'IN_PROGRESS' }, { status: 'DONE' }];
  assert.equal(lib.holatBoyicha(qatorlar, null).length, 4);
  assert.deepEqual(lib.holatBoyicha(qatorlar, ['RELEASED', 'IN_PROGRESS']).map((q) => q.status), ['RELEASED', 'IN_PROGRESS']);
});

test('editing a draft sends cleared optional fields so the server does not keep the old value', () => {
  const tana = lib.tahrirTanasi({ modificationId: 'm1', quantity: 5 }, { recipeId: null, dueDate: null, note: '' });
  assert.deepEqual(JSON.parse(JSON.stringify(tana)), { recipeId: null, dueDate: null, note: '', modificationId: 'm1', quantity: 5 });
  assert.equal(lib.tahrirTanasi({ recipeId: 'r2' }, { recipeId: null }).recipeId, 'r2', 'filled field wins');
});

test('a reopened draft whose inputs all came from the norm lets the server recompute the norm', () => {
  const norma = smena({ inputs: [{ modificationId: 'm1', quantity: '883.2', entryMethod: 'NORM', offRecipe: false }] });
  assert.equal(lib.smenaTanasiniYigish(norma).tana.inputs, undefined);
  const aralash = smena({ inputs: [{ modificationId: 'm1', quantity: '883.2', entryMethod: 'NORM', offRecipe: false }, { modificationId: 'm2', quantity: '3', entryMethod: 'ACTUAL', offRecipe: false }] });
  assert.equal(lib.smenaTanasiniYigish(aralash).tana.inputs.length, 2);
});

test('server errors are attached to the form field they belong to', () => {
  const qoidalar = {
    retsept: { maydonlar: ['recipeId'], kodlar: ['recipe'], sozlar: ['retsept'] },
    mahsulot: { maydonlar: ['modificationId'], kodlar: ['modification'], sozlar: ['mahsulot'] },
    miqdor: { maydonlar: ['quantity'], kodlar: ['quantity'], sozlar: ['miqdor'] },
  };
  assert.deepEqual(lib.serverXatoMaydonlari({ code: 'errors.production.recipe_not_active', message: 'Retsept faol emas' }, qoidalar), { retsept: 'Retsept faol emas' });
  assert.deepEqual(lib.serverXatoMaydonlari({ code: 'errors.http.400', message: 'Input validation failed', errors: [{ field: 'quantity', constraints: [{ message: "Miqdor musbat bo'lishi kerak" }] }] }, qoidalar), { miqdor: "Miqdor musbat bo'lishi kerak" });
  assert.deepEqual(lib.serverXatoMaydonlari({ code: 'errors.x', message: 'Mahsulot retsepti faol emas' }, qoidalar), { retsept: 'Mahsulot retsepti faol emas' }, 'xabarda ikkalasi bo‘lsa retsept birinchi');
  assert.deepEqual(lib.serverXatoMaydonlari({ code: 'errors.production.disabled', message: 'Modul yoqilmagan' }, qoidalar), {});
  assert.deepEqual(lib.serverXatoMaydonlari(undefined, qoidalar), {});
  const mahsulotli = { ...qoidalar, mahsulot: { maydonlar: ["modificationId"], kodlar: ["product"], sozlar: [] } };
  assert.deepEqual(lib.serverXatoMaydonlari({ code: "errors.production.recipe_not_active", message: "Retsept faol emas" }, mahsulotli), { retsept: "Retsept faol emas" }, "modul nomi production mahsulotga tushmaydi");
});

test('client validators point at the exact field, including the row index', () => {
  assert.equal(lib.retseptTanasiniYigish(retsept({ modificationId: '' })).maydon, 'modificationId');
  assert.equal(lib.retseptTanasiniYigish(retsept({ inputs: [kirim(), kirim({ quantity: '' })] })).maydon, 'inputs.1.quantity');
  assert.equal(lib.retseptTanasiniYigish(retsept({ inputs: [kirim({ kind: 'RANGE', quantity: '', min: '5', max: '2' })] })).maydon, 'inputs.0.max');
  assert.equal(lib.retseptTanasiniYigish(retsept({ outputs: [chiqim({ role: 'WASTE' })] })).maydon, 'outputs');
  const karta = { modificationId: 'm9', recipeId: '', validFrom: '', normalScrapPercent: '', note: '', lines: [{ modificationId: 'm1', quantity: '1', price: '5', currency: 'USD', costingRate: '' }] };
  assert.equal(lib.kalkulyatsiyaTanasiniYigish(karta).maydon, 'lines.0.costingRate');
  assert.equal(lib.smenaTanasiniYigish(smena({ orderId: '', recipeId: 'r1', destWarehouseId: '' })).maydon, 'destWarehouseId');
  assert.equal(lib.smenaTanasiniYigish(smena({ downtime: [{ reason: 'OTHER', hours: '', note: '' }] })).maydon, 'downtime.0.hours');
});

test('server validation paths map to row fields when no rule claims them', () => {
  const tafsilot = { message: 'Input validation failed', errors: [{ field: 'inputs[1].quantity', constraints: [{ message: 'Musbat son' }] }, { field: 'lines.0.price', constraints: [] }] };
  assert.deepEqual(lib.serverXatoMaydonlari(tafsilot, {}), { 'inputs.1.quantity': 'Musbat son', 'lines.0.price': 'Input validation failed' });
});

test('butunMiqdorXatolari: quantity_not_whole qator yo‘lisiz — yagona kasr miqdorli qator belgilanadi', () => {
  const xato = { code: 'errors.catalog.quantity_not_whole', message: 'not whole' };
  const qatorlar = [{ yol: 'lines.0.quantity', miqdor: '3' }, { yol: 'lines.1.quantity', miqdor: '2,5' }];
  assert.deepEqual(lib.butunMiqdorXatolari(xato, qatorlar, 'butun'), { 'lines.1.quantity': 'butun' });
  // Kasr qator bir nechta (12,5 kg va 2,5 dona): qaysi biri dona ekani noma'lum — kg qatori qizil bo'lmasin, xabar tepada.
  assert.equal(lib.butunMiqdorXatolari(xato, [...qatorlar, { yol: 'lines.2.quantity', miqdor: 12.5 }], 'butun'), null);
  // Boshqa xato yoki kasr qator yo'q — null (odatdagi bog'lash ishlaydi).
  assert.equal(lib.butunMiqdorXatolari({ code: 'errors.production.comment_required' }, qatorlar, 'butun'), null);
  assert.equal(lib.butunMiqdorXatolari(xato, [{ yol: 'lines.0.quantity', miqdor: '4' }], 'butun'), null);
  // Server qator yo'lini bergan bo'lsa — uning o'zi ishlatiladi.
  const maydonli = { ...xato, errors: [{ field: 'lines.1.quantity', constraints: [{ message: 'x' }] }] };
  assert.equal(lib.butunMiqdorXatolari(maydonli, qatorlar, 'butun'), null);
});
