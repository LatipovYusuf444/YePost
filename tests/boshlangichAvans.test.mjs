// Teskari boshlang'ich qarz (backend 18.11 c2a9926): direction DEBT (standart) / CREDIT — mijoz avansi (AVB-) va yetkazib beruvchining bizga
// qarzi (YAB-); mijoz avanslari ro'yxati va bekor qilish; Excel importda "Turi" ustuni.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boshlangichQarzMalumoti } from '../src/lib/boshlangichQarz.ts';
import { avansJavobimi, boshlangichQoldiqTuri, mijozAvansi, mijozAvanslari } from '../src/lib/mijozAvansi.ts';
import { xatoKodiMatni } from '../src/api/xatoKodlari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8');
const forma = (qism = {}) => ({ amount: '500', currency: 'USD', date: '2026-11-01', note: ' oldindan ', ...qism });

test('yo\'nalish: DEBT da so\'rov o\'zgarmaydi (direction yuborilmaydi), CREDIT da direction: "CREDIT"', () => {
  assert.deepEqual(boshlangichQarzMalumoti(forma(), '2026-11-19').payload, { amount: 500, currency: 'USD', date: '2026-11-01', note: 'oldindan' });
  assert.deepEqual(boshlangichQarzMalumoti(forma({ direction: 'DEBT' }), '2026-11-19').payload, { amount: 500, currency: 'USD', date: '2026-11-01', note: 'oldindan' });
  assert.deepEqual(boshlangichQarzMalumoti(forma({ direction: 'CREDIT' }), '2026-11-19').payload, { amount: 500, currency: 'USD', date: '2026-11-01', note: 'oldindan', direction: 'CREDIT' });
  // Tekshiruv ikkala yo'nalishda bir xil.
  assert.deepEqual(boshlangichQarzMalumoti(forma({ amount: '0', direction: 'CREDIT' }), '2026-11-19'), { error: 'amount' });
});

test('mijoz avansi javobi: bitta (o\'rovli yoki oddiy), ro\'yxat, CREDIT javobini ajratish', () => {
  const avans = { id: 'c1', docNumber: 'AVB-000001', status: 'CONFIRMED', amount: '500', currency: 'USD', date: '2026-11-01T00:00:00.000Z', note: 'oldindan', direction: 'CREDIT', createdAt: '2026-11-19T05:00:00Z' };
  assert.deepEqual(mijozAvansi({ success: true, data: avans }), { id: 'c1', docNumber: 'AVB-000001', status: 'CONFIRMED', amount: 500, currency: 'USD', date: '2026-11-01T00:00:00.000Z', note: 'oldindan', createdAt: '2026-11-19T05:00:00Z' });
  assert.equal(mijozAvansi({ amount: 1 }), null);
  const royxat = [avans, { ...avans, id: 'c0', status: 'cancelled' }];
  for (const raw of [royxat, { data: royxat }, { items: royxat }, { data: { items: royxat } }]) {
    assert.deepEqual(mijozAvanslari(raw).map((a) => [a.id, a.status]), [['c1', 'CONFIRMED'], ['c0', 'CANCELLED']]);
  }
  assert.equal(avansJavobimi({ data: avans }), true);
  assert.equal(avansJavobimi({ id: 's1', isOpeningDebt: true, status: 'CONFIRMED' }), false, 'DEBT javobi — boshlang\'ich qarz sotuvi');
});

test('hisob-kitob hisobotida boshlang\'ich qoldiq turi hujjat raqamidan: AVB- avans, YAB- bizga qarz, qolgani qarz', () => {
  assert.equal(boshlangichQoldiqTuri('AVB-000003'), 'avans');
  assert.equal(boshlangichQoldiqTuri('yab-000001'), 'bizgaQarz');
  assert.equal(boshlangichQoldiqTuri('YQB-000001'), 'qarz');
  assert.equal(boshlangichQoldiqTuri('SAV-000010'), 'qarz');
});

test('API yo\'llari, oynalar va xato matnlari', () => {
  const api = manba('src/api/boshlangichQarzApi.ts');
  assert.ok(api.includes('/opening-credits`'), 'ro\'yxat');
  assert.ok(api.includes('/opening-credits/${encodeURIComponent(creditId)}/cancel`'), 'bekor qilish');
  for (const fayl of ['src/Pages/XaridorUchot/BoshlangichQarzModal.tsx', 'src/Pages/XaridorUchot/YetkazibBoshlangichQarzModal.tsx']) {
    const m = manba(fayl);
    assert.match(m, /<YonalishTanlovi/, fayl);
    assert.match(m, /, direction \}, bugungiToshkentKuni\(\)\)/, `${fayl}: yo'nalish so'rovga uzatiladi`);
  }
  assert.match(manba('src/Pages/XaridorUchot/MijozQarzlariTab.tsx'), /<MijozAvanslari xaridorId=\{xaridorId\} yangilanish=\{yangilanish\} \/>/);
  assert.match(manba('src/Pages/XaridorUchot/YetkazibBoshlangichQarzTab.tsx'), /qarz\.direction === "CREDIT"/);
  // Avanslar ro'yxati faqat admin/direktorga so'raladi; umumiy toast chiqmaydi (oyna o'z xabarini beradi).
  assert.match(manba('src/Pages/XaridorUchot/MijozAvanslari.tsx'), /if \(!boshqaradi\) return;/);
  assert.match(manba('src/api/axios.ts'), /"\/opening-credits"\]/);
  assert.match(xatoKodiMatni('errors.wallet.insufficient_balance', '/partners/customers/c1/opening-credits/a1/cancel', 'uz'), /Avansni bekor qilib bo'lmaydi/);
  assert.ok(xatoKodiMatni('errors.partners.customer_opening_credit_not_found', '/x', 'ru'));
  for (const til of ['uz', 'ru']) {
    const j = JSON.parse(manba(`src/i18n/locales/${til}/xaridor_uchot.json`));
    for (const kalit of ['label', 'customerDebt', 'customerCredit', 'supplierDebt', 'supplierCredit']) assert.ok(j.openingDebt.direction[kalit], `${til} ${kalit}`);
    assert.ok(j.openingDebt.import.directionHint && j.openingCredits.cancelConfirm.description && j.yetkazibDetails.openingDebt.columns.direction, til);
  }
});
