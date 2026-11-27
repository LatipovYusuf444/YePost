// Savdo agenti: suhbat rejimi (🤖 agent / 👤 menejer / 🔴 menejer kerak), xabar muallifi (author), suhbatni olish/qaytarish,
// agent amallari va "agent menejerni chaqirdi" bildirishnomasi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as lib from '../src/lib/savdoAgenti.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');

test('xabar muallifi: author ustun, yo\'q bo\'lsa direction/sentById bo\'yicha', () => {
  assert.equal(lib.xabarMuallifi({ author: 'CUSTOMER', direction: 'IN' }), 'mijoz');
  assert.equal(lib.xabarMuallifi({ author: 'MANAGER', direction: 'OUT', sentById: 'u1' }), 'xodim');
  assert.equal(lib.xabarMuallifi({ author: 'SHOP_ACCOUNT', direction: 'OUT', sentById: null }), 'akkaunt');
  assert.equal(lib.xabarMuallifi({ author: 'AGENT', direction: 'OUT', sentById: null }), 'agent', 'agent ham sentById null — akkaunt emas');
  assert.equal(lib.xabarMuallifi({ author: 'TEMPLATE', direction: 'OUT', sentById: 'u1' }), 'shablon');
  // Eski xabar (author null): avvalgi qoida.
  assert.equal(lib.xabarMuallifi({ author: null, direction: 'IN' }), 'mijoz');
  assert.equal(lib.xabarMuallifi({ author: null, direction: 'OUT', sentById: null }), 'akkaunt');
  assert.equal(lib.xabarMuallifi({ direction: 'OUT', sentById: 'u2' }), 'xodim');
  assert.equal(lib.xabarMuallifi({ author: 'NOMALUM', direction: 'OUT', sentById: 'u2' }), 'xodim');
});

test('rejim: faqat Telegram Business suhbatida; bot va eski backend (mode yo\'q) — belgi yo\'q', () => {
  assert.equal(lib.suhbatRejimi({ channel: 'TELEGRAM_BUSINESS', mode: 'AGENT' }), 'AGENT');
  assert.equal(lib.suhbatRejimi({ channel: 'TELEGRAM_BUSINESS', mode: 'NEEDS_MANAGER' }), 'NEEDS_MANAGER');
  assert.equal(lib.suhbatRejimi({ channel: 'TELEGRAM_BOT', mode: 'AGENT' }), null);
  assert.equal(lib.suhbatRejimi({ channel: 'TELEGRAM_BUSINESS' }), null);
  assert.equal(lib.suhbatRejimi({ channel: 'TELEGRAM_BUSINESS', mode: 'BOSHQA' }), null);
  assert.equal(lib.suhbatRejimi(null), null);
});

test('agent jim: managerActiveUntil kelajakda bo\'lsa — vaqt, o\'tgan yoki null — jim emas', () => {
  const hozir = Date.parse('2026-11-27T10:00:00Z');
  assert.equal(lib.agentJimTurishi('2026-11-27T10:30:00.000Z', hozir), '2026-11-27T10:30:00.000Z');
  assert.equal(lib.agentJimTurishi('2026-11-27T09:59:00.000Z', hozir), null);
  assert.equal(lib.agentJimTurishi(null, hozir), null);
  assert.equal(lib.agentJimTurishi('buzuq', hozir), null);
});

test('tugmalar: AGENT — olish; MANAGER/PAUSED — qaytarish; NEEDS_MANAGER — ikkalasi; rejim yo\'q — hech biri', () => {
  assert.deepEqual(lib.rejimAmallari('AGENT'), { olish: true, qaytarish: false });
  assert.deepEqual(lib.rejimAmallari('MANAGER'), { olish: false, qaytarish: true });
  assert.deepEqual(lib.rejimAmallari('PAUSED'), { olish: false, qaytarish: true });
  assert.deepEqual(lib.rejimAmallari('NEEDS_MANAGER'), { olish: true, qaytarish: true });
  assert.deepEqual(lib.rejimAmallari(null), { olish: false, qaytarish: false });
});

test('bildirishnoma: AGENT_NEEDS_MANAGER / refType ChatThread — suhbat id; boshqasi null', () => {
  assert.equal(lib.bildirishnomaSuhbatiId({ kind: 'AGENT_NEEDS_MANAGER', refType: 'ChatThread', refId: 't1' }), 't1');
  assert.equal(lib.bildirishnomaSuhbatiId({ refType: 'ChatThread', refId: ' t2 ' }), 't2');
  assert.equal(lib.bildirishnomaSuhbatiId({ kind: 'CUSTOMER_FEEDBACK', refType: 'Sale', refId: 's1' }), null);
  assert.equal(lib.bildirishnomaSuhbatiId({ kind: 'AGENT_NEEDS_MANAGER', refType: 'ChatThread' }), null);
  assert.equal(lib.bildirishnomaSuhbatiId(null), null);
});

test('ulanishlar: takeover/release/agent-calls yo\'llari, rejim chizig\'i, pufakcha, bildirishnoma, faoliyat paneli', () => {
  const api = manba('src/api/crmApi.ts');
  assert.match(api, /`\/crm\/chat\/threads\/\$\{threadId\}\/takeover`/);
  assert.match(api, /`\/crm\/chat\/threads\/\$\{threadId\}\/release`/);
  assert.match(api, /`\/crm\/chat\/threads\/\$\{threadId\}\/agent-calls`/);
  const suhbat = manba('src/Pages/SavdoAgenti/Suhbatlar.tsx');
  assert.match(suhbat, /\{tanlangan && suhbatRejimi\(tanlangan\) && \(\s*<AgentRejimChizigi/);
  assert.match(suhbat, /<RejimBelgisi suhbat=\{suhbat\} \/>/);
  assert.match(suhbat, /muallif === "agent" && <Bot size=\{12\} \/>/);
  // `/chat/` global toastsiz: takeover/release xatosi shu yerda ko'rsatiladi.
  assert.match(suhbat, /catch \(error\) \{\s*xatolikXabari\(getApiErrorMessage\(error\)\);\s*\} finally \{\s*setRejimBand\(null\);/);
  const panel = manba('src/Components/layout/YuqoriPanel.tsx');
  assert.match(panel, /`\/savdo-agenti\/suhbatlar\?thread=\$\{encodeURIComponent\(suhbatId\)\}`/);
  assert.match(panel, /navigate\(manzil\);/);
  assert.match(manba('src/Pages/XaridorUchot/FaoliyatPaneli.tsx'), /const muallif = xabarMuallifi\(item\);/);
  for (const til of ['uz', 'ru']) {
    const d = JSON.parse(manba(`src/i18n/locales/${til}/savdo_agenti.json`));
    for (const rejim of ['AGENT', 'MANAGER', 'NEEDS_MANAGER', 'PAUSED']) assert.ok(d.agentRejim.mode[rejim] && d.agentRejim.text[rejim], `${til} ${rejim}`);
    for (const tool of ['search_products', 'check_stock', 'get_price', 'order_status', 'create_order', 'add_lead_note', 'handoff']) assert.ok(d.agentRejim.tools[tool], `${til} ${tool}`);
    assert.ok(d.suhbat.author.agent && d.suhbat.author.shablon, til);
    const x = JSON.parse(manba(`src/i18n/locales/${til}/xaridor_uchot.json`));
    assert.ok(x.faoliyatPaneli.chatFromAgent && x.faoliyatPaneli.chatTemplate, til);
  }
});
