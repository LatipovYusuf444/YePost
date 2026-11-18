// Ishlab chiqarish 17.11 jarayoni (backend b41b2c7/b76d069): buyurtma → xomashyo berish → kun yakuni → qabul akti → yopish.
// Brak sababi, qabul akti (usta va PM sonlari), qatorli yopish, bosqichlar chizig'i va yangi grant PRODUCTION_ACCEPT.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/ishlabChiqarish.ts';
import { ishlabChiqarishRuxsati, ishlabChiqarishYoliRuxsati } from '../src/lib/roles.ts';

const huquq = (role, ...kodlar) => ({ role, grants: kodlar.map((code) => ({ code, isActive: true })) });
const smena = (qism = {}) => ({ orderId: 'o1', recipeId: '', destWarehouseId: '', shiftEndsAt: '', comment: '', outputs: [{ quantity: '1180', scrapQuantity: '', scrapReasonId: '', serial: '', modificationId: '', role: '' }], inputs: [], downtime: [], ...qism });
const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');

test('smena: brak bo\'lsa sababi majburiy, brak yo\'q bo\'lsa sabab yuborilmaydi', () => {
  const sababsiz = lib.smenaTanasiniYigish(smena({ outputs: [{ quantity: '1180', scrapQuantity: '20', scrapReasonId: '', serial: '', modificationId: '', role: '' }] }));
  assert.deepEqual(sababsiz, { xato: 'errors.scrapReasonRequired', maydon: 'outputs.0.scrapReasonId' });
  const sababli = lib.smenaTanasiniYigish(smena({ outputs: [{ quantity: '1180', scrapQuantity: '20', scrapReasonId: 'kuygan', serial: '', modificationId: '', role: '' }] }));
  assert.deepEqual(sababli.tana.outputs, [{ quantity: 1180, scrapQuantity: 20, scrapReasonId: 'kuygan' }]);
  // Brak 0 — eskidan qolgan sabab yuborilmaydi.
  const brakYoq = lib.smenaTanasiniYigish(smena({ outputs: [{ quantity: '5', scrapQuantity: '0', scrapReasonId: 'kuygan', serial: '', modificationId: '', role: '' }] }));
  assert.equal('scrapReasonId' in brakYoq.tana.outputs[0], false);
  assert.equal(lib.brakSababiKerakmi({ scrapQuantity: '0.5' }), true);
  assert.equal(lib.brakSababiKerakmi({ scrapQuantity: '', scrapReasonId: '' }), false);
});

test('qabul akti: forma ustanikidan to\'ladi, tana har qatorni yuboradi, xatolar so\'rovsiz to\'xtaydi', () => {
  const akt = { lines: [
    { id: 'l1', modificationId: 'm1', masterGood: '1200', masterScrap: '0', good: '1200', scrap: '0', masterScrapReasonId: null, scrapReasonId: null },
    { id: 'l2', modificationId: 'm2', masterGood: '50', masterScrap: '5', good: '50', scrap: '5', masterScrapReasonId: 'xom', scrapReasonId: 'xom' },
  ] };
  const forma = lib.qabulFormasi(akt);
  assert.deepEqual(forma, [{ lineId: 'l1', good: '1200', scrap: '0', scrapReasonId: '' }, { lineId: 'l2', good: '50', scrap: '5', scrapReasonId: 'xom' }]);
  // PM qayta sanadi: 1180 yaroqli, 20 brak (Kuygan).
  forma[0] = { ...forma[0], good: '1180', scrap: '20', scrapReasonId: 'kuygan' };
  assert.deepEqual(lib.qabulTanasiniYigish(forma, '  Qayta sanaldi ').tana, {
    lines: [{ lineId: 'l1', good: 1180, scrap: 20, scrapReasonId: 'kuygan' }, { lineId: 'l2', good: 50, scrap: 5, scrapReasonId: 'xom' }],
    note: 'Qayta sanaldi',
  });
  assert.deepEqual(lib.qabulTanasiniYigish([{ lineId: 'l1', good: '10', scrap: '3', scrapReasonId: '' }]), { xato: 'errors.scrapReasonRequired', maydon: 'lines.0.scrapReasonId' });
  assert.deepEqual(lib.qabulTanasiniYigish([{ lineId: 'l1', good: '', scrap: '0', scrapReasonId: '' }]), { xato: 'errors.acceptGood', maydon: 'lines.0.good' });
  assert.deepEqual(lib.qabulTanasiniYigish([{ lineId: 'l1', good: '0', scrap: '0', scrapReasonId: '' }, { lineId: 'l2', good: '0', scrap: '', scrapReasonId: '' }]), { xato: 'errors.acceptQuantityRequired', maydon: 'lines.0.good' });
  assert.deepEqual(lib.qabulTanasiniYigish([{ lineId: 'l1', good: '0', scrap: '-1', scrapReasonId: '' }]), { xato: 'errors.acceptScrap', maydon: 'lines.0.scrap' });
  assert.equal(lib.brakFoizi(1180, 20), 1.67);
  assert.equal(lib.brakFoizi(0, 0), 0);
});

test('qabul javobidagi brak ogohlantirishi o\'qiladi (SCRAP_ABOVE_LIMIT), boshqa shakllar e\'tiborsiz', () => {
  assert.deepEqual(lib.qabulOgohlantirishlari({ id: 'a1', warnings: [{ code: 'SCRAP_ABOVE_LIMIT', percent: '12', limit: '10' }] }), [{ code: 'SCRAP_ABOVE_LIMIT', percent: '12', limit: '10' }]);
  assert.deepEqual(lib.qabulOgohlantirishlari({ warnings: [] }), []);
  assert.deepEqual(lib.qabulOgohlantirishlari({ warnings: [null, 'x', {}] }), []);
  assert.deepEqual(lib.qabulOgohlantirishlari(undefined), []);
});

test('yopish: non misoli — 100 berildi, 92 sarflandi, 5 qaytadi, 1 qoladi → 2 yo\'qotish', () => {
  const oldindan = [{ modificationId: 'un', productName: 'Un', issued: '100', consumed: '92', expected: '8', returned: '8', kept: '0', loss: '0' }];
  const forma = lib.yopishFormasi(oldindan);
  assert.deepEqual(forma, [{ modificationId: 'un', expected: 8, returned: '8', kept: '0' }], 'standart: hammasi qaytadi');
  assert.equal(lib.yopishYoqotishi(forma[0]), 0);
  const qator = { ...forma[0], returned: '5', kept: '1' };
  assert.equal(lib.yopishYoqotishi(qator), 2);
  assert.deepEqual(lib.yopishTanasiniYigish([qator], ' tugadi ').tana, { lines: [{ modificationId: 'un', returned: 5, kept: 1 }], note: 'tugadi' });
  // Ortgandan ko'p qaytarib bo'lmaydi (server close_return_exceeds) — so'rovsiz to'xtaydi.
  assert.deepEqual(lib.yopishTanasiniYigish([{ ...forma[0], returned: '7', kept: '2' }]), { xato: 'errors.closeExceeds', maydon: 'lines.0.returned' });
  assert.deepEqual(lib.yopishTanasiniYigish([{ ...forma[0], kept: '-1' }]), { xato: 'errors.closeNegative', maydon: 'lines.0.kept' });
  // Sexga hech narsa berilmagan (berish bosqichi o'chiq): bo'sh tana — server hammasini o'zi yopadi.
  assert.deepEqual(lib.yopishTanasiniYigish([]).tana, {});
});

test('buyurtma holatlari: tahrir/bekor faqat xomashyo berilgunga qadar, yakunlash ish boshlangach, yopish faqat qabul qilinganda', () => {
  assert.equal(lib.buyurtmaTahrirlanadimi('RELEASED'), true);
  assert.equal(lib.buyurtmaTahrirlanadimi('DRAFT'), true);
  for (const holat of ['MATERIAL_ISSUED', 'IN_PROGRESS', 'AWAITING_ACCEPTANCE', 'RETURNED', 'ACCEPTED', 'CLOSED', 'CANCELLED']) assert.equal(lib.buyurtmaTahrirlanadimi(holat), false, holat);
  assert.equal(lib.buyurtmaYakunlanadimi('RELEASED'), false);
  for (const holat of ['MATERIAL_ISSUED', 'IN_PROGRESS', 'AWAITING_ACCEPTANCE', 'RETURNED']) assert.equal(lib.buyurtmaYakunlanadimi(holat), true, holat);
  assert.deepEqual(lib.YOPILADIGAN_BUYURTMA, ['ACCEPTED', 'DONE']);
  assert.deepEqual(lib.OCHIQ_BUYURTMA, ['RELEASED', 'MATERIAL_ISSUED', 'IN_PROGRESS', 'AWAITING_ACCEPTANCE', 'RETURNED']);
});

test('bosqichlar chizig\'i: har bosqich o\'z hujjatidan sana va kim; berish o\'chiq bo\'lsa o\'tkazib yuboriladi', () => {
  const buyurtma = { id: 'o1', status: 'AWAITING_ACCEPTANCE', docNumber: 'ICHB-000007', createdAt: '2026-11-17T05:00:00Z', close: null };
  const hujjatlar = {
    berishlar: [
      { orderId: 'o1', status: 'CONFIRMED', date: '2026-11-17T07:00:00Z', docNumber: 'SXB-1' },
      { orderId: 'o1', status: 'CONFIRMED', date: '2026-11-17T09:00:00Z', docNumber: 'SXB-2' },
      { orderId: 'o2', status: 'CONFIRMED', date: '2026-11-18T09:00:00Z', docNumber: 'SXB-9' },
      { orderId: 'o1', status: 'DRAFT', date: '2026-11-18T09:00:00Z', docNumber: '' },
    ],
    hisobotlar: [{ orderId: 'o1', status: 'CONFIRMED', date: '2026-11-17T18:00:00Z', docNumber: 'SMH-3' }],
    aktlar: [{ orderId: 'o1', status: 'DRAFT', acceptedAt: null }],
  };
  const bosqichlar = lib.buyurtmaBosqichlari(buyurtma, hujjatlar);
  assert.deepEqual(bosqichlar.map((b) => [b.kalit, b.holat, b.raqam ?? '']), [
    ['order', 'done', 'ICHB-000007'], ['issue', 'done', 'SXB-2'], ['report', 'done', 'SMH-3'], ['acceptance', 'current', ''], ['close', 'pending', ''],
  ]);
  const yopilgan = lib.buyurtmaBosqichlari({ ...buyurtma, status: 'CLOSED', close: { date: '2026-11-18T10:00:00Z', createdById: 'u9' } }, {
    ...hujjatlar, aktlar: [{ orderId: 'o1', status: 'CONFIRMED', acceptedAt: '2026-11-18T08:00:00Z', acceptedById: 'u5', docNumber: 'QAB-1' }],
  });
  assert.deepEqual(yopilgan.slice(3).map((b) => [b.kalit, b.holat, b.kim]), [['acceptance', 'done', 'u5'], ['close', 'done', 'u9']]);
  // Ko'p kunlik buyurtma: kechagi smena qabul qilingan, bugungisi qabul kutmoqda — joriy bosqich "Qabul" (yopish emas).
  const takror = lib.buyurtmaBosqichlari(buyurtma, { ...hujjatlar, aktlar: [{ orderId: 'o1', status: 'CONFIRMED', acceptedAt: '2026-11-17T16:00:00Z', docNumber: 'QAB-3' }] });
  assert.deepEqual(takror.slice(3).map((b) => [b.kalit, b.holat, b.raqam ?? '']), [['acceptance', 'current', 'QAB-3'], ['close', 'pending', '']]);
  assert.equal(lib.buyurtmaBosqichlari({ ...buyurtma, status: 'ACCEPTED' }, {}).find((b) => b.holat === 'current').kalit, 'close');
  assert.equal(lib.buyurtmaBosqichlari({ ...buyurtma, status: 'RETURNED' }, {}).find((b) => b.holat === 'current').kalit, 'report');
  const berishsiz = lib.buyurtmaBosqichlari({ ...buyurtma, status: 'RELEASED' }, {}, true);
  assert.deepEqual(berishsiz.map((b) => b.holat), ['done', 'skipped', 'current', 'pending', 'pending']);
  const bekor = lib.buyurtmaBosqichlari({ ...buyurtma, status: 'CANCELLED' }, {});
  assert.equal(bekor.some((b) => b.holat === 'current'), false, 'bekor qilingan buyurtmada joriy bosqich yo\'q');
});

test('qabul akti bo\'limi: PRODUCTION_ACCEPT yoki direktor (ADMIN avtomatik emas)', () => {
  assert.equal(ishlabChiqarishRuxsati(huquq('DIRECTOR'), 'qabul'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('ADMIN'), 'qabul'), false);
  assert.equal(ishlabChiqarishRuxsati(huquq('ADMIN', 'PRODUCTION_ACCEPT'), 'qabul'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('STOREKEEPER', 'PRODUCTION_ACCEPT'), 'qabul'), true);
  assert.equal(ishlabChiqarishRuxsati(huquq('STOREKEEPER', 'PRODUCTION_REPORT'), 'qabul'), false);
  assert.equal(ishlabChiqarishYoliRuxsati(huquq('STOREKEEPER', 'PRODUCTION_ACCEPT'), '/ishlab-chiqarish/qabul'), true);
  assert.equal(ishlabChiqarishYoliRuxsati(huquq('STOREKEEPER'), '/ishlab-chiqarish/qabul'), false);
});

test('grant, menyu, marshrut va API yo\'llari backend shartnomasi bo\'yicha', () => {
  assert.match(manba('src/types/account.ts'), /"PRODUCTION_ACCEPT"/);
  assert.match(manba('src/Pages/SozlamalarUchot/VakolatlarBolimi.tsx'), /code: "PRODUCTION_ACCEPT", nom: t\("vakolatlar\.codes\.productionAccept"\)/);
  assert.match(manba('src/Pages/XodimUchot/backendMetadata.ts'), /kod: "PRODUCTION_ACCEPT", nom: "Qabul akti", izoh: "Ishlab chiqarilgan mahsulotni qabul qilish"/);
  assert.match(manba('src/Components/layout/YonPanel.tsx'), /key: "icQabul", path: "\/ishlab-chiqarish\/qabul"/);
  assert.match(manba('src/routes/AppRouter.tsx'), /path="\/ishlab-chiqarish\/qabul" element={<IshlabChiqarish bolim="qabul" \/>}/);
  for (const til of ['uz', 'ru']) {
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/nav.json`)).menu?.icQabul ?? Object.values(JSON.parse(manba(`src/i18n/locales/${til}/nav.json`))).some((q) => q?.icQabul), til);
    assert.ok(JSON.parse(manba(`src/i18n/locales/${til}/sozlamalar_uchot.json`)).vakolatlar.codes.productionAccept, til);
  }
  const api = manba('src/api/ishlabChiqarishApi.ts');
  for (const yol of ['/scrap-reasons`', '/acceptances`', '/acceptances/${id}/accept`', '/acceptances/${id}/return`', '/orders/${id}/close-preview`', '/orders/${id}/close`, tana)']) assert.ok(api.includes(yol), yol);
  // Qabul planshetdan bosiladi: bir bosishga bitta Idempotency-Key.
  assert.match(api, /idempotent<QabulAkti & \{ warnings\?: unknown \}>\(`\$\{YOL\}\/acceptances\/\$\{id\}\/accept`, tana\)/);
});

test('sozlamalar: yangi maydonlar yuboriladi, bo\'sh ombor null bo\'ladi; brak omboriga sozlama bo\'limi', () => {
  const sozlama = manba('src/Pages/SozlamalarUchot/IshlabChiqarishBolimi.tsx');
  for (const maydon of ['scrapAlertPercent: sonMaydoni(scrapAlertPercent)', 'issueStageEnabled,', 'defaultSourceWarehouseId: defaultSourceWarehouseId || null', 'defaultDestWarehouseId: defaultDestWarehouseId || null', 'scrapWarehouseId: scrapWarehouseId || null']) assert.ok(sozlama.includes(maydon), maydon);
  assert.match(sozlama, /ishlabChiqarishApi\.brakSabablari\.yaratish\(toza\)/);
  const retsept = lib.retseptTanasiniYigish({ modificationId: 'non', warehouseId: 'sex', baseQuantity: '100', outputMin: '', outputMax: '', normalScrapPercent: '', consumeOnIssue: false, scrapModificationId: 'brak-non', note: '', inputs: [{ modificationId: 'un', kind: 'FIXED', quantity: '92', tolerancePercent: '', min: '', max: '' }], outputs: [{ modificationId: 'non', role: 'MAIN', quantity: '100', quantityType: '' }] });
  assert.equal(retsept.tana.scrapModificationId, 'brak-non');
  const retseptSahifa = manba('src/Pages/IshlabChiqarish/Retseptlar.tsx');
  assert.match(retseptSahifa, /scrapModificationId: null, note: ""/, 'tahrirda tozalangan brak mahsuloti null bo\'lib ketadi');
});

test('buyurtma sahifasi: sexga berish tugmasi bosqich o\'chiq bo\'lsa yashirin, yopish qatorli forma bilan', () => {
  const sahifa = manba('src/Pages/IshlabChiqarish/Buyurtmalar.tsx');
  assert.match(sahifa, /const berishYoq = sozlama\?\.issueStageEnabled === false;/);
  assert.match(sahifa, /\{ochiq && !berishYoq && <button/);
  assert.match(sahifa, /YOPILADIGAN_BUYURTMA\.includes\(status\) && <button[^>]*onClick=\{\(\) => setYopishOchiq\(true\)\}/);
  assert.match(sahifa, /ishlabChiqarishApi\.buyurtmalar\.yopish\(buyurtma\.id, natija\.tana\)/);
  // Tahrirlash va bekor qilish faqat xomashyo berilgunga qadar.
  assert.match(sahifa, /\{tahrirlanadi && <button[^\n]*buyurtmalar\.bekorQilish/);
});
