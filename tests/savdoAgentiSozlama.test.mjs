// Savdo agenti: sozlamalar formasi (qisman PATCH, tekshiruv) va tasdiq kutayotgan agent buyurtmalari (javobni tozalash) + ulanishlar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/savdoAgentiSozlama.ts';
import { sahifagaRuxsatBormi } from '../src/lib/roles.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

const backendJavobi = {
  isEnabled: true,
  priceType: 'WHOLESALE',
  warehouseId: 'w1',
  draftOwnerId: 'u1',
  debtLimitUzs: '1500000.00',
  debtLimitUsd: null,
  managerQuietMinutes: 0,
  workStart: '09:00',
  workEnd: '18:00',
  extraInstructions: 'Faqat Toshkent',
  customerMessagesPerHour: 20,
  agentRunsPerDay: 500,
};

test('sozlama: javob tozalanadi, yetishmagan maydon standart, noto\'g\'ri vaqt null', () => {
  assert.deepEqual(lib.agentSozlamalariniTozalash(backendJavobi), backendJavobi);
  assert.deepEqual(lib.agentSozlamalariniTozalash(null), lib.STANDART_AGENT_SOZLAMALARI);
  const buzuq = lib.agentSozlamalariniTozalash({ isEnabled: 'true', workStart: '25:00', debtLimitUzs: '-5', managerQuietMinutes: 'x' });
  assert.equal(buzuq.isEnabled, false);
  assert.equal(buzuq.workStart, null);
  assert.equal(buzuq.debtLimitUzs, null);
  assert.equal(buzuq.managerQuietMinutes, 30);
});

test('forma: summa ortiqcha nolsiz, null — bo\'sh; 0 daqiqa "0" bo\'lib qoladi', () => {
  const f = lib.formagaAylantirish(lib.agentSozlamalariniTozalash(backendJavobi));
  assert.equal(f.debtLimitUzs, '1500000');
  assert.equal(f.debtLimitUsd, '');
  assert.equal(f.managerQuietMinutes, '0');
  assert.equal(f.warehouseId, 'w1');
});

test('PATCH qisman: faqat o\'zgargan maydonlar; bo\'sh — null; ish vaqti doim juft', () => {
  const asl = lib.formagaAylantirish(lib.agentSozlamalariniTozalash(backendJavobi));
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl }), {});
  // "1500000" va "1500000.0" bir xil son — o'zgarish emas.
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl, debtLimitUzs: '1500000.0' }), {});
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl, debtLimitUzs: '', debtLimitUsd: '250.5' }), { debtLimitUzs: null, debtLimitUsd: 250.5 });
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl, warehouseId: '', isEnabled: false }), { isEnabled: false, warehouseId: null });
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl, workEnd: '20:00' }), { workStart: '09:00', workEnd: '20:00' });
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl, workStart: '', workEnd: '' }), { workStart: null, workEnd: null });
  assert.deepEqual(lib.agentSozlamaOzgarishlari(asl, { ...asl, managerQuietMinutes: '15', extraInstructions: '  Faqat Toshkent  ' }), { managerQuietMinutes: 15 });
});

test('tekshiruv: yoqish uchun ombor va ega, narx turi, juft ish vaqti, son chegaralari', () => {
  const toza = lib.formagaAylantirish(lib.agentSozlamalariniTozalash(backendJavobi));
  assert.deepEqual(lib.agentSozlamaXatolari(toza, ['RETAIL', 'WHOLESALE']), {});
  const x = lib.agentSozlamaXatolari({ ...toza, warehouseId: '', draftOwnerId: '', workEnd: '', managerQuietMinutes: '1441', agentRunsPerDay: '' }, ['RETAIL']);
  assert.equal(x.warehouseId.kod, 'requiredToEnable');
  assert.equal(x.draftOwnerId.kod, 'requiredToEnable');
  assert.equal(x.priceType.kod, 'priceType', 'sotuv sozlamalarida yoqilmagan tur');
  assert.equal(x.workEnd.kod, 'workHoursPair');
  assert.deepEqual(x.managerQuietMinutes, { kod: 'range', params: { min: 0, max: 1440 } });
  assert.equal(x.agentRunsPerDay.kod, 'range');
  // O'chiq agent uchun ombor/ega shart emas; tannarx hech qachon.
  const ochiq = lib.agentSozlamaXatolari({ ...toza, isEnabled: false, warehouseId: '', draftOwnerId: '', priceType: 'COST' });
  assert.deepEqual(Object.keys(ochiq), ['priceType']);
});

test('agent qoralamasi: mijoz kartasi yoki walk-in, jami, qarz belgisi, suhbat', () => {
  const kartali = lib.agentQoralamasiniTozalash({
    id: 's1',
    currency: 'UZS',
    totalAmount: '0',
    createdAt: '2026-11-27T08:00:00Z',
    note: '',
    customer: { id: 'c1', firstName: 'Aziz', lastName: 'Market', phone: '+998901112233' },
    delivery: { source: 'TELEGRAM_AGENT', chatThreadId: 't1', debtWarning: true, recipientName: 'Aziz Market', address: 'Chilonzor 5', note: 'Kechqurun', approvedAt: null },
    items: [
      { id: 'i1', quantity: '2.000', price: '8500.00', total: '17000.00', currency: 'UZS', priceType: 'RETAIL', modification: { id: 'm1', name: 'Asosiy variant', product: { name: 'Skotch' } } },
      { id: 'i2', quantity: '1', price: '9000', modification: { id: 'm2', name: 'Skotch', product: { name: 'Skotch' } } },
    ],
  });
  assert.equal(kartali.mijozNomi, 'Aziz Market');
  assert.equal(kartali.yangiMijoz, false);
  assert.equal(kartali.suhbatId, 't1');
  assert.equal(kartali.qarzOgohlantirishi, true);
  assert.equal(kartali.jami, 26000, 'totalAmount 0 bo\'lsa qatorlardan');
  assert.equal(kartali.qatorlar[0].variant, 'Asosiy variant');
  assert.equal(kartali.qatorlar[1].variant, '', 'nomi mahsulot bilan bir xil variant takrorlanmaydi');
  assert.equal(kartali.qatorlar[1].total, 9000);

  const walkIn = lib.agentQoralamasiniTozalash({ id: 's2', currency: 'USD', totalAmount: '12.50', customer: null, walkInCustomerName: 'Ali', walkInCustomerPhone: '+998907778899', delivery: { chatThreadId: 't2' }, items: [] });
  assert.equal(walkIn.yangiMijoz, true);
  assert.equal(walkIn.mijozNomi, 'Ali');
  assert.equal(walkIn.mijozTelefoni, '+998907778899');
  assert.equal(walkIn.jami, 12.5);
  assert.equal(walkIn.qarzOgohlantirishi, false);
  assert.equal(lib.agentQoralamasiniTozalash({}), null);
});

test('ruxsat: Savdo agenti sozlamalari faqat ADMIN/DIREKTOR, qolgan tablar kassirga ham', () => {
  assert.equal(sahifagaRuxsatBormi({ role: 'CASHIER' }, '/savdo-agenti/sozlamalar'), false);
  assert.equal(sahifagaRuxsatBormi({ role: 'STOREKEEPER' }, '/savdo-agenti/sozlamalar'), false);
  assert.equal(sahifagaRuxsatBormi({ role: 'CASHIER' }, '/savdo-agenti/tasdiq-kutayotganlar'), true);
  assert.equal(sahifagaRuxsatBormi({ role: 'DIRECTOR' }, '/savdo-agenti/sozlamalar'), true);
  assert.equal(sahifagaRuxsatBormi({ role: 'ADMIN' }, '/savdo-agenti/sozlamalar'), true);
});

test('ulanishlar: backend yo\'llari, "Tez orada" olib tashlangan, qaror tugmalari faqat rahbarga', () => {
  const api = manba('src/api/savdoAgentiApi.ts');
  assert.match(api, /"\/settings\/sales-agent"/);
  assert.match(api, /apiClient\.patch<unknown>\("\/settings\/sales-agent", patch, JIM\)/);
  assert.match(api, /"\/sales-agent\/drafts"/);
  assert.match(api, /`\/sales-agent\/drafts\/\$\{saleId\}\/approve`, undefined, JIM/);
  assert.match(api, /`\/sales-agent\/drafts\/\$\{saleId\}\/reject`, body, JIM/);
  // Sahifaning o'z xabari bor: umumiy muvaffaqiyat toasti takrorlanmaydi (xato toasti qoladi).
  assert.match(api, /const JIM = \{ muvaffaqiyatniYashirish: true \};/);
  assert.match(manba('src/api/axios.ts'), /toastKerakmi\(response\.config\.url\) && !response\.config\.muvaffaqiyatniYashirish/);
  const index = manba('src/Pages/SavdoAgenti/index.tsx');
  assert.doesNotMatch(index, /TezOrada|tezOrada/);
  assert.match(index, /<TasdiqKutayotganlar onSoni=\{setKutayotganSoni\} \/>/);
  assert.match(index, /<AgentSozlamalari \/>/);
  const tasdiq = manba('src/Pages/SavdoAgenti/TasdiqKutayotganlar.tsx');
  assert.match(tasdiq, /const qarorBera = foydalanuvchiAdminmi\(profil\);/);
  assert.match(tasdiq, /\{qarorBera \? \(/);
  for (const til of ['uz', 'ru']) {
    const d = JSON.parse(manba(`src/i18n/locales/${til}/savdo_agenti.json`));
    assert.equal(d.tezOrada, undefined);
    assert.ok(d.tasdiq.reject.title && d.sozlama.errors.workHoursPair && d.suhbat.pendingOrders, til);
  }
});
