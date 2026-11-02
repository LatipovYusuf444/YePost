import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { idempotentBajarish, idempotentKalitOlish, natijaNomalummi } from '../src/lib/idempotentKalit.ts';
import { ishlabChiqarishRuxsati, ishlabChiqarishYoliRuxsati, sahifagaRuxsatBormi } from '../src/lib/roles.ts';
import { xatoKodiMatni } from '../src/api/xatoKodlari.ts';
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
  assert.deepEqual(toliq.inputs, [{ modificationId: 'm1', quantity: 5, entryMethod: 'ACTUAL', offRecipe: true }]);
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
  assert.deepEqual(lib.mavjudlikOqish({ items: [{ shortage: '3' }] }), { items: [{ shortage: '3' }], hasShortage: true });
  assert.equal(lib.mavjudlikOqish({ items: [{ shortage: '3' }], hasShortage: false }).hasShortage, false);
  assert.deepEqual(lib.mavjudlikOqish(undefined), { items: [], hasShortage: false });
  assert.equal(lib.portlashQatorlari({ items: [{ quantity: 2 }] }).length, 1);
  assert.equal(lib.portlashQatorlari({ data: { requirements: [{ required: 2 }] } }).length, 1);
  assert.equal(lib.portlashMiqdori({ required: '4.5' }), 4.5);
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
