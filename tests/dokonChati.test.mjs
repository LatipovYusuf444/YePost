import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { calls, handlers, reset } from './helpers/savdoYuklashClient.mjs';
import { chatIdYuborilsinmi, dokonChatHolati, dokonChatUlandimi } from '../src/lib/telegramXabarnoma.ts';

// Do'kon chati (qarz eslatmalari): bot orqali ulash — POST /integrations/telegram/shop-link, holat GET /integrations/telegram dan.
const fixture = new URL('./helpers/savdoYuklashClient.mjs', import.meta.url).href;
const src = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith(src.href)) {
      if (specifier === './axios') return { url: fixture, shortCircuit: true };
      if (specifier.startsWith('@/')) return { url: new URL(specifier.slice(2) + '.ts', src).href, shortCircuit: true };
      if (specifier.startsWith('.') && !specifier.endsWith('.ts')) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { integratsiyalarApi } = await import('../src/api/integrationsApi.ts');

test('shop chat status: empty → not linked, a word → wrong chat, a delivery error → error, otherwise linked', () => {
  assert.equal(dokonChatHolati({}), 'ulanmagan');
  assert.equal(dokonChatHolati({ chatId: '  ', chatIdValid: false }), 'ulanmagan');
  assert.equal(dokonChatHolati({ chatId: 'dokon guruhi', chatIdValid: false }), 'notogri');
  assert.equal(dokonChatHolati({ chatId: 'dokon guruhi', chatIdValid: false, chatLastError: 'Bad Request: chat not found' }), 'notogri');
  assert.equal(dokonChatHolati({ chatId: '-4001', chatIdValid: true, chatLastError: 'Forbidden: bot was kicked' }), 'xato');
  assert.equal(dokonChatHolati({ chatId: '-1001234567890', chatIdValid: true, chatLastError: '' }), 'ulangan');
  // Old backend without chatIdValid: decided from the id itself.
  assert.equal(dokonChatHolati({ chatId: 'dokon' }), 'notogri');
  assert.equal(dokonChatHolati({ chatId: '7770001' }), 'ulangan');
});

test('linked once chatLinkedAt moves past the value seen when the link was made', () => {
  assert.equal(dokonChatUlandimi(null, null), false);
  assert.equal(dokonChatUlandimi(null, '2026-11-09T10:00:00Z'), true);
  assert.equal(dokonChatUlandimi('2026-11-09T10:00:00Z', '2026-11-09T10:00:00Z'), false);
  assert.equal(dokonChatUlandimi('2026-11-09T10:00:00Z', '2026-11-09T11:00:00Z'), true);
});

test('save sends chatId only when it was changed by hand, so a stale form never overwrites the linked chat', () => {
  assert.equal(chatIdYuborilsinmi('dokon guruhi', 'dokon guruhi'), undefined);
  assert.equal(chatIdYuborilsinmi(' -4001 ', '-4001'), undefined);
  assert.equal(chatIdYuborilsinmi('', null), undefined);
  assert.equal(chatIdYuborilsinmi(' -1001234567890 ', 'dokon'), '-1001234567890');
  assert.equal(chatIdYuborilsinmi('', '-4001'), '');
});

test('shop-link API: POST /integrations/telegram/shop-link, enveloped or bare answer', async () => {
  reset();
  const javob = { url: 'https://t.me/shop_bot?start=abc', groupUrl: 'https://t.me/shop_bot?startgroup=abc', expiresAt: '2026-11-16T10:00:00Z' };
  handlers.set('POST /integrations/telegram/shop-link', () => ({ data: javob }));
  assert.deepEqual(await integratsiyalarApi.dokonChatHavolasi(), javob);
  handlers.set('POST /integrations/telegram/shop-link', () => javob);
  assert.deepEqual(await integratsiyalarApi.dokonChatHavolasi(), javob);
  assert.deepEqual(calls.map((c) => [c.method, c.url]), [['post', '/integrations/telegram/shop-link'], ['post', '/integrations/telegram/shop-link']]);
  handlers.set('POST /integrations/telegram/shop-link', () => ({}));
  await assert.rejects(() => integratsiyalarApi.dokonChatHavolasi());
});

test('every shopChat text the settings use exists in uz and ru', () => {
  const kod = ['DokonChatiKarti.tsx', 'TelegramBotKarti.tsx']
    .map((f) => readFileSync(new URL(`Pages/SozlamalarUchot/${f}`, src), 'utf8'))
    .join('\n');
  const kalitlar = new Set([...kod.matchAll(/"integratsiya\.shopChat\.([\w.]+)"/g)].map((m) => m[1]));
  for (const tur of ['ulangan', 'ulanmagan', 'notogri', 'xato']) kalitlar.add(`status.${tur}`);
  assert.ok(kalitlar.size > 10);
  for (const til of ['uz', 'ru']) {
    const lugat = JSON.parse(readFileSync(new URL(`i18n/locales/${til}/sozlamalar_uchot.json`, src), 'utf8')).integratsiya.shopChat;
    for (const kalit of kalitlar) {
      const qiymat = kalit.split('.').reduce((o, k) => o?.[k], lugat);
      assert.equal(typeof qiymat, 'string', `${til}: integratsiya.shopChat.${kalit}`);
    }
  }
});
