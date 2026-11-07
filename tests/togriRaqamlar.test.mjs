import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as kassaNomlari from '../src/lib/kassaNomlari.ts';
import * as hujjatSanasi from '../src/lib/hujjatSanasi.ts';
import { sonniTozalash } from '../src/lib/sonFormatlash.ts';
import { yaxlitHalfUp } from '../src/lib/yaxlitlash.ts';
import { chegirmaSummasi } from '../src/lib/savdoNarxlari.ts';

function compile(path, dependencies, DateClass = Date) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const context = { exports: {}, Date: DateClass, Intl, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unmocked dependency: ${name}`);
  } };
  runInNewContext(code, context);
  return context.exports;
}

const valyutaHolati = { kurs: 0, kursBor: false };
const oziValyutadaMatn = (son, valyuta) => (valyuta === 'USD' ? `$${son}` : `${son} so'm`);
const yordam = compile('../src/Pages/Savdo/savdoYordamchilari.ts', {
  '@/lib/valyuta': { pulMatni: son => `${son} so'm`, oziValyutadaMatn, useValyutaStore: { getState: () => valyutaHolati }, valyutaKodi: v => (String(v ?? '').toUpperCase() === 'USD' ? 'USD' : 'UZS') },
  '@/lib/kassaNomlari': kassaNomlari,
});

test('K6: qaytarish summasi backend goodsValue dan (chegirmali savdoda narx x miqdor emas)', () => {
  const qaytarish = { goodsValue: '90000.00', refundAmount: '90000', debtReduction: '0', items: [{ quantity: 1, price: 100000 }] };
  assert.equal(yordam.qaytarishSummasi(qaytarish), 90000);
  // Qoralama: goodsValue yo'q — pul qaytarish + qarzdan ayirilgan, bo'lmasa narx x miqdor.
  assert.equal(yordam.qaytarishSummasi({ refundAmount: '50000', debtReduction: '40000', items: [{ quantity: 1, price: 100000 }] }), 90000);
  assert.equal(yordam.qaytarishSummasi({ items: [{ quantity: 2, price: 100000 }] }), 200000);
});

test('M5: kurs yuklanmagan bo\'lsa dollar qarz so\'mga qo\'shilmaydi', () => {
  const qatorlar = [{ summa: 1000000, valyuta: 'UZS' }, { summa: 200, valyuta: 'USD' }];
  Object.assign(valyutaHolati, { kurs: 0, kursBor: false });
  assert.equal(yordam.aralashJamiMatni(qatorlar), "1000000 so'm + $200");
  assert.equal(yordam.aralashJamiMatni([{ summa: 200, valyuta: 'USD' }]), '$200');
  Object.assign(valyutaHolati, { kurs: 12100, kursBor: true });
  assert.equal(yordam.aralashJamiMatni(qatorlar), "3420000 so'm");
  assert.equal(yordam.aralashJamiMatni([{ summa: 5000, valyuta: 'UZS' }]), "5000 so'm");
});

test('M6: sotuv raqami backend docNumber dan (UUID bo\'lagi emas)', () => {
  assert.equal(yordam.sotuvRaqami({ id: '8f14e45f-ceea-467a-9575-3b7e5e1a6f2c', docNumber: 'SOT-000014' }), 'SOT-000014');
  assert.equal(yordam.sotuvJadvalId({ id: 'x', documentNumber: 'SOT-7' }), 'SOT-7');
  assert.match(yordam.sotuvRaqami({ id: '8f14e45f-ceea-467a-9575-3b7e5e1a6f2c' }), /^\d{8}$/, 'raqamsiz eski hujjat — avvalgidek');
});

test('M4: Excel\'dan "1,234.56" 1234.56 bo\'lib qoladi (1.23 emas)', () => {
  assert.equal(sonniTozalash('1,234.56'), '1234.56');
  assert.equal(sonniTozalash('1.234,56'), '1234.56');
  assert.equal(sonniTozalash('1,234,567'), '1234567');
  assert.equal(sonniTozalash('12 345,5'), '12345.5');
  assert.equal(sonniTozalash('12,5'), '12.5');
  assert.equal(sonniTozalash('12,'), '12.');
  assert.equal(sonniTozalash('1,234.56', 0), '1234');
});

test('M7: yarim tiyin backend HALF_UP bilan bir xil', () => {
  assert.equal(yaxlitHalfUp(1.005), 1.01);
  assert.equal(yaxlitHalfUp(20.1 * 5 / 100), 1.01);
  assert.equal(yaxlitHalfUp(-1.005), -1.01);
  assert.equal(yaxlitHalfUp(2.675), 2.68);
  assert.equal(yaxlitHalfUp(1.004), 1);
  assert.equal(yaxlitHalfUp(1e-7), 0);
  assert.equal(chegirmaSummasi({ miqdor: 1, narx: 20.1, tur: 'foiz', summa: 0, foiz: 5 }), 1.01, '$20.10 ga 5% chegirma');
});

test('M3: hisobot "bugun" va davr chegaralari Toshkent kuni bo\'yicha (UTC 20:30 = Toshkentda ertasi kun)', () => {
  const RealDate = Date;
  const hozir = '2026-10-31T20:30:00Z';
  class Soat extends RealDate {
    constructor(...args) { super(...(args.length ? args : [hozir])); }
    static now() { return new RealDate(hozir).getTime(); }
  }
  const yordamchilar = compile('../src/Pages/HisobotUchot/yordamchilar.ts', {
    '@/lib/hujjatSanasi': { ...hujjatSanasi, bugungiToshkentKuni: () => hujjatSanasi.bugungiToshkentKuni(new RealDate(hozir)) },
    '@/lib/valyuta': { pulMatni: String },
  }, Soat);
  assert.equal(yordamchilar.bugun(), '2026-11-01');
  assert.equal(yordamchilar.bugunMinus(30), '2026-10-02');
  assert.equal(yordamchilar.oyBoshi(), '2026-11-01');
  assert.equal(yordamchilar.oyBoshiMinus(2), '2026-09-01');
  assert.equal(yordamchilar.oyBoshiMinus(11), '2025-12-01');
  // UTC 31.10 20:00 = Toshkent 01.11 01:00 (1-noyabr hujjati); UTC 31.10 18:30 = Toshkent 31.10 23:30.
  assert.equal(yordamchilar.sanadaMi('2026-10-31T20:00:00Z', '2026-11-01', '2026-11-01'), true);
  assert.equal(yordamchilar.sanadaMi('2026-10-31T18:30:00Z', '2026-11-01', '2026-11-01'), false);
  assert.equal(yordamchilar.sanadaMi('2026-11-01', '2026-11-01', '2026-11-01'), true);
});
