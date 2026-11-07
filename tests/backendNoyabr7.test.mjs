import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';
import { bekorQilishSababi } from '../src/lib/bekorQilishSababi.ts';
import { chatIdNotogrimi } from '../src/lib/telegramXabarnoma.ts';
import { katalogOmborQoldiqlari } from '../src/api/catalogSearch.ts';

// Backend 6–7-noyabr: sotuvni bekor qilish sababi, qidiruvda stockByWarehouse, Telegram Chat ID (Idempotency-Key — tests/tolovQaytimi).
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (['./axios', './catalogApi', './sozlamalarApi', './hujjatOgohlantirishi', '@/api/sozlamalarApi', '@/api/partnersApi', '@/Pages/Savdo/savdoYordamchilari'].includes(specifier)) {
        return { url: fixture, shortCircuit: true };
      }
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
globalThis.window ??= new EventTarget();
const { sotuvniBekorQilish } = await import('../src/api/savdoApi.ts');

test('cancel reason: trimmed, at most 500 characters, an empty reason sends no body (cancelReason stays null)', async () => {
  assert.equal(bekorQilishSababi('  Mijoz fikridan qaytdi  '), 'Mijoz fikridan qaytdi');
  assert.equal(bekorQilishSababi('x'.repeat(600)).length, 500);
  assert.equal(bekorQilishSababi('   '), '');
  assert.equal(bekorQilishSababi(null), '');
  reset();
  handlers.set('POST /sales/s1/cancel', () => ({ id: 's1', status: 'CANCELLED', cancelReason: 'Mijoz fikridan qaytdi' }));
  handlers.set('POST /sales/s2/cancel', () => ({ id: 's2', status: 'CANCELLED', cancelReason: null }));
  assert.equal((await sotuvniBekorQilish('s1', ' Mijoz fikridan qaytdi ')).cancelReason, 'Mijoz fikridan qaytdi');
  await sotuvniBekorQilish('s2', '  ');
  await sotuvniBekorQilish('s2');
  assert.deepEqual(calls.map((call) => [call.url, call.data]), [
    ['/sales/s1/cancel', { reason: 'Mijoz fikridan qaytdi' }],
    ['/sales/s2/cancel', undefined],
    ['/sales/s2/cancel', undefined],
  ]);
});

test('stockByWarehouse: id → quantity map (strings parsed, duplicates summed); missing field = null (old backend)', () => {
  const xarita = katalogOmborQoldiqlari({ modificationId: 'm', stockByWarehouse: [{ warehouseId: 'w1', quantity: '5' }, { warehouseId: 'w2', quantity: '2.5' }, { warehouseId: 'w1', quantity: 1 }, { quantity: 9 }] });
  assert.deepEqual([...xarita.entries()], [['w1', 6], ['w2', 2.5]]);
  assert.equal(katalogOmborQoldiqlari({ modificationId: 'm', stockByWarehouse: [] }).size, 0);
  assert.equal(katalogOmborQoldiqlari({ modificationId: 'm', quantity: 3 }), null);
});

test('Telegram Chat ID: empty or a (negative) number is fine, a word is rejected', () => {
  for (const ok of ['', '   ', '123456789', '-1001234567890', ' -100123 ']) assert.equal(chatIdNotogrimi(ok), false, ok);
  for (const bad of ['dokon', '@dokon_guruhi', 'YePost chat', '-100abc', '12 34']) assert.equal(chatIdNotogrimi(bad), true, bad);
});
