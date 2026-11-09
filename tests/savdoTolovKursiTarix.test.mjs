import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import ts from 'typescript';

const src = new URL('../src/', import.meta.url);
const stub = new URL('./helpers/valyutaApiStub.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === '@/api/valyutaApi') return { url: stub, shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const lib = await import('../src/Pages/Savdo/savdoYordamchilari.ts');
const { useValyutaStore, valyutaKodi } = await import('../src/lib/valyuta.ts');
const payment = overrides => ({ paymentType: 'CASH', amount: '60', currency: 'USD', rate: '12000', settledAmount: '0', ...overrides });
const sale = overrides => ({ id: 'af17baa3-1e7a-4d1f-bec0-6685376d8297', status: 'DRAFT', currency: 'UZS', totalAmount: '720000', payments: [payment()], ...overrides });
const setRate = rate => useValyutaStore.setState({ kurs: rate, kursBor: rate > 0 });

test('reported draft: $60 at 12000 stays 720000 with no debt regardless of global rate', () => {
  for (const rate of [11980, 12000, 12500, 0]) {
    setRate(rate);
    assert.equal(lib.sotuvTolanganSummasi(sale()), 720000);
    assert.equal(lib.sotuvQarzdorlikSummasi(sale()), 0);
    assert.equal(lib.sotuvOrtiqchaTolovSummasi(sale()), 0);
  }
});

test('each payment uses its own rate, including reverse UZS to USD conversion', () => {
  setRate(11980);
  assert.equal(lib.sotuvTolanganSummasi(sale({ payments: [payment({ amount: 30 }), payment({ amount: 30, rate: 12500 })] })), 735000);
  assert.equal(lib.sotuvTolanganSummasi(sale({ currency: 'USD', totalAmount: 60, payments: [payment({ currency: 'UZS', amount: 720000 })] })), 60);
});

test('settled amount remains authoritative even when rate differs (change or partial settlement)', () => {
  const document = sale({ payments: [payment({ amount: 100, settledAmount: 720000 })] });
  assert.equal(lib.sotuvTolanganSummasi(document), 720000);
  assert.equal(lib.sotuvQarzdorlikSummasi(document), 0);
});

test('same-currency and missing-currency payments keep their original amount', () => {
  for (const currency of ['UZS', null, undefined]) {
    assert.equal(lib.tolovSotuvValyutasida(payment({ currency, amount: 720000, settledAmount: 123 }), sale()), 720000);
  }
});

test('document conversion uses saved rate before inferring it from a capped settlement', () => {
  setRate(11980);
  const document = sale({ payments: [payment({ amount: 100, settledAmount: 720000 })] });
  assert.equal(lib.sotuvValyutasigaOgirish(60, 'USD', document), 720000);
  assert.equal(lib.sotuvValyutasigaOgirish(720000, 'UZS', { ...document, currency: 'USD', payments: [payment({ currency: 'UZS', amount: 720000 })] }), 60);
});

test('legacy payment fallback still infers settlement rate, then uses global rate', () => {
  setRate(11980);
  const old = sale({ payments: [payment({ rate: null, settledAmount: 720000 })] });
  assert.equal(lib.sotuvValyutasigaOgirish(60, 'USD', old), 720000);
  for (const rate of [null, undefined, 0, -1, 'invalid']) {
    const document = sale({ payments: [payment({ rate })] });
    assert.equal(lib.sotuvTolanganSummasi(document), 718800);
  }
  setRate(0);
  assert.equal(lib.sotuvValyutasigaOgirish(60, 'USD', sale({ payments: [] })), null);
});

test('confirmed backend totals and cancelled debt behavior remain unchanged', () => {
  const document = sale({ status: 'CONFIRMED', paidAmount: 700000, debtAmount: 20000 });
  assert.equal(lib.sotuvTolanganSummasi(document), 700000);
  assert.equal(lib.sotuvQarzdorlikSummasi(document), 20000);
  assert.equal(lib.sotuvQarzdorlikSummasi({ ...document, status: 'CANCELLED' }), 0);
});

test('100 percent requires no remaining debt; ordinary rounding is preserved', () => {
  assert.equal(lib.tolovFoizi(718800, 720000), 99);
  assert.equal(lib.tolovFoizi(719999.99, 720000), 99);
  assert.equal(lib.tolovFoizi(720000, 720000, 1200), 99);
  assert.equal(lib.tolovFoizi(720000, 720000, 0), 100);
  assert.equal(lib.tolovFoizi(750000, 720000), 100);
  assert.equal(lib.tolovFoizi(335, 1000), 34);
  assert.equal(lib.tolovFoizi(0, 720000), 0);
  assert.equal(lib.tolovFoizi(0, 0), 0);
});

// Execute the actual modal's audit formatter without mounting unrelated UI or calling the API.
const modalUrl = new URL('../src/Pages/Savdo/SotuvTafsilotlariModal.tsx', import.meta.url);
const modal = ts.createSourceFile(modalUrl.pathname, readFileSync(modalUrl, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = new Set(['TARIX_MAYDON_NOMLARI', 'TARIX_PUL_MAYDONLARI', 'tarixHolatMatni', 'tarixMaydonNomi', 'tarixQiymatMatni', 'tarixHolatOhangi', 'tarixPulChipi', 'tarixChiplari']);
const declarations = modal.statements.filter(node =>
  (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) ||
  (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => names.has(d.name.getText(modal))))
).map(node => node.getText(modal)).join('\n');
const js = ts.transpileModule(declarations, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
const historyChips = new Function('pulniFormatlash', 'valyutaKodi', 'tolovTuriMatni', 'sotuvHolatiMatni', js + '\nreturn tarixChiplari;')(
  lib.pulniFormatlash, valyutaKodi, lib.tolovTuriMatni, lib.sotuvHolatiMatni
);
const t = (key, values) => key + (values ? ':' + JSON.stringify(values) : '');

test('history renders a raw date string and other primitive changes without crashing', () => {
  const chips = historyChips({ diff: { date: '2026-11-05T18:59:59.999Z', totalAmount: 720000, enabled: true, disabled: false, count: 0, note: '', customerId: null } }, t, 'UZS');
  assert.equal(chips.length, 7);
  assert.equal(chips[0].value, '2026-11-05T18:59:59.999Z');
  assert.equal(chips[2].value, 'true');
  assert.equal(chips[3].value, 'false');
  assert.equal(chips[4].value, '0');
  assert.equal(chips[6].value, '—');
});

test('history preserves from/to, from-only and to-only changes', () => {
  const chips = historyChips({ diff: { date: { from: '2026-11-04', to: '2026-11-05' }, note: { to: 'new note' }, status: { from: 'DRAFT', to: 'CONFIRMED' }, customerId: { from: 'old' } } }, t, 'UZS');
  assert.equal(chips[0].value, '2026-11-04 → 2026-11-05');
  assert.equal(chips[1].value, 'new note');
  assert.equal(chips[2].ohang, 'yashil');
});

test('history preserves payment arrays, before/after snapshots and empty logs', () => {
  const chips = historyChips({ diff: { payments: [payment()] } }, t, 'UZS');
  assert.equal(chips.length, 1);
  assert.equal(chips[0].ohang, 'yashil');
  assert.match(chips[0].value, /\$60/);
  const snapshot = historyChips({ diff: { before: { status: 'DRAFT' }, after: { status: 'CONFIRMED', totalAmount: 720000, paidAmount: 720000, debtAmount: 0 } } }, t, 'UZS');
  assert.equal(snapshot.length, 4);
  assert.equal(snapshot[0].ohang, 'yashil');
  assert.equal(historyChips({}, t, 'UZS').length, 1);
});
