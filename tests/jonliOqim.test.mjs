// 28.11 — Jonli hodisalar oqimi (SSE): ajratgich, backoff va JonliOqim xulqi soxta fetch + qo'lda boshqariladigan soat bilan.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SseAjratgich,
  kutishVaqti,
  JonliOqim,
  JIMLIK_CHEGARASI_MS,
  MAKS_KUTISH_MS,
} from '../src/lib/jonliOqim.ts';

// ---------- yordamchilar ----------

/** Mikrovazifalar va oqim o'qishlarini tugatish (haqiqiy taymer ishlatilmaydi). */
async function kut(n = 30) {
  for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r));
}

/** Qo'lda boshqariladigan soat. */
function soxtaVaqt(tasodif = 0) {
  let t = 0;
  let keyingiId = 1;
  const taymerlar = new Map();
  const rejalar = [];
  const vaqt = {
    hozir: () => t,
    kechiktir: (fn, ms) => {
      const id = keyingiId++;
      taymerlar.set(id, { fn, at: t + ms });
      rejalar.push(ms);
      return id;
    },
    bekorQil: (id) => {
      taymerlar.delete(id);
    },
    tasodif: () => tasodif,
  };
  async function oldinga(ms) {
    const maqsad = t + ms;
    for (;;) {
      let eng = null;
      for (const [id, tm] of taymerlar) if (tm.at <= maqsad && (!eng || tm.at < eng[1].at)) eng = [id, tm];
      if (!eng) break;
      taymerlar.delete(eng[0]);
      t = eng[1].at;
      eng[1].fn();
      await kut();
    }
    t = maqsad;
    await kut();
  }
  return {
    vaqt,
    oldinga,
    /** Qayta ulanish kutishlari (60 s jimlik taymeri chiqarib tashlangan). */
    kutishlar: () => rejalar.filter((ms) => ms !== JIMLIK_CHEGARASI_MS),
    faolTaymerlar: () => taymerlar.size,
  };
}

function oqimYarat() {
  let ctrl;
  const stream = new ReadableStream({
    start(c) {
      ctrl = c;
    },
  });
  const enc = new TextEncoder();
  return {
    stream,
    yoz: (s) => ctrl.enqueue(enc.encode(s)),
    yop: () => ctrl.close(),
    xato: () => ctrl.error(new Error('uzildi')),
  };
}

/** navbat: 'oqim' (200 + boshqariladigan tana) | status raqami | 'tarmoq'. Bo'sh bo'lsa — 'oqim'. */
function soxtaFetch(navbat) {
  const chaqiruvlar = [];
  const oqimlar = [];
  const fetchFn = async (url, init) => {
    chaqiruvlar.push({ url, init });
    const keyingi = navbat.length ? navbat.shift() : 'oqim';
    if (keyingi === 'tarmoq') throw new TypeError('Failed to fetch');
    if (typeof keyingi === 'number') return new Response(null, { status: keyingi });
    const o = oqimYarat();
    oqimlar.push(o);
    return new Response(o.stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  };
  return { fetchFn, chaqiruvlar, oqimlar };
}

function sozla({ token = 'eski', yangiToken = 'yangi', tasodif = 0, navbat = [], hodisaXato = false, tokenKechikishi = null } = {}) {
  const s = soxtaVaqt(tasodif);
  const f = soxtaFetch([...navbat]);
  const k = {
    ...s,
    ...f,
    token,
    holatlar: [],
    hodisalar: [],
    hammasi: 0,
    yangilashlar: 0,
    /** n-chaqiruvdagi Authorization. */
    auth: (n) => f.chaqiruvlar[n].init.headers.Authorization,
  };
  k.oqim = new JonliOqim({
    url: 'https://api.test/api/v1/events',
    tokenOl: () => k.token,
    tokenYangila: async () => {
      k.yangilashlar++;
      if (tokenKechikishi) await tokenKechikishi;
      if (yangiToken) k.token = yangiToken;
      return yangiToken;
    },
    hodisa: (h) => {
      k.hodisalar.push(h);
      if (hodisaXato) throw new Error('tinglovchi xatosi');
    },
    hammasiniYangila: () => {
      k.hammasi++;
    },
    holat: (h) => k.holatlar.push(h),
    fetchFn: f.fetchFn,
    vaqt: s.vaqt,
  });
  return k;
}

/** Ulanib, `open` olgan holat. */
async function ulangan(opts) {
  const k = sozla(opts);
  k.oqim.boshla();
  await kut();
  k.oqimlar.at(-1).yoz('event: open\ndata: {}\n\n');
  await kut();
  return k;
}

// ---------- SseAjratgich ----------

test('SseAjratgich: oddiy hodisa, id: va izoh e\'tiborsiz', () => {
  const a = new SseAjratgich();
  assert.deepEqual(a.qosh(': keep-alive\nid: 42\nevent: support.message\ndata: {"ticketId":"t1"}\nretry: 5\n\n'), [
    { nom: 'support.message', data: '{"ticketId":"t1"}' },
  ]);
  // Faqat izoh — hodisa yo'q.
  assert.deepEqual(a.qosh(':ping\n\n'), []);
  // Bo'sh qatorlar — hodisa yo'q.
  assert.deepEqual(a.qosh('\n\n\n'), []);
});

test('SseAjratgich: bo\'lak qator va maydon o\'rtasida uziladi', () => {
  const a = new SseAjratgich();
  const matn = 'event: chat.message\ndata: {"threadId":"x1","messageId":"m9"}\n\nevent: ping\ndata: {}\n\n';
  const natija = [];
  for (const ch of matn) natija.push(...a.qosh(ch));
  assert.deepEqual(natija, [
    { nom: 'chat.message', data: '{"threadId":"x1","messageId":"m9"}' },
    { nom: 'ping', data: '{}' },
  ]);

  const b = new SseAjratgich();
  assert.deepEqual(b.qosh('ev'), []);
  assert.deepEqual(b.qosh('ent: notif'), []);
  assert.deepEqual(b.qosh('ication\nda'), []);
  assert.deepEqual(b.qosh('ta: {"id"'), []);
  assert.deepEqual(b.qosh(':"n1"}\n'), []);
  assert.deepEqual(b.qosh('\n'), [{ nom: 'notification', data: '{"id":"n1"}' }]);
});

test('SseAjratgich: CRLF va CR qator oxirlari (bo\'lak \\r da uzilsa ham)', () => {
  const a = new SseAjratgich();
  assert.deepEqual(a.qosh('event: a\r\ndata: 1\r\n\r\n'), [{ nom: 'a', data: '1' }]);
  // Oxirgi "\r" dan keyin "\n" kelishi mumkin — keyingi bayt kelguncha kutiladi.
  assert.deepEqual(a.qosh('event: b\rdata: 2\r\r'), []);
  assert.deepEqual(a.qosh(':\r'), [{ nom: 'b', data: '2' }]);

  const b = new SseAjratgich();
  assert.deepEqual(b.qosh('event: c\r'), []);
  assert.deepEqual(b.qosh('\ndata: 3\r'), []);
  // "\r" + "\n" ikki bo'lakda — bitta qator oxiri, ortiqcha bo'sh qator emas.
  assert.deepEqual(b.qosh('\n'), []);
  assert.deepEqual(b.qosh('\r\n'), [{ nom: 'c', data: '3' }]);
});

test('SseAjratgich: ko\'p qatorli data \\n bilan, bo\'sh joysiz qiymat, data\'siz hodisa', () => {
  const a = new SseAjratgich();
  assert.deepEqual(a.qosh('event: x\ndata: bir\ndata:ikki\ndata\n\n'), [{ nom: 'x', data: 'bir\nikki\n' }]);
  // event bor, data yo'q — bo'sh data bilan uzatiladi.
  assert.deepEqual(a.qosh('event: open\n\n'), [{ nom: 'open', data: '' }]);
  // event yo'q — "message".
  assert.deepEqual(a.qosh('data: {}\n\n'), [{ nom: 'message', data: '{}' }]);
  // Faqat bir bo'shliq olib tashlanadi.
  assert.deepEqual(a.qosh('event:  y\ndata:  z\n\n'), [{ nom: ' y', data: ' z' }]);
  // Tugallanmagan hodisa keyingi bo'sh qatorgacha saqlanadi.
  assert.deepEqual(a.qosh('event: q\ndata: 1\n'), []);
  assert.deepEqual(a.qosh('\n'), [{ nom: 'q', data: '1' }]);
});

// ---------- kutishVaqti ----------

test('kutishVaqti: 1 s, 2 s, 4 s ... 30 s gacha, jitter 0–999 ms', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 10, 50].map((n) => kutishVaqti(n, 0)),
    [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000, 30000],
  );
  assert.equal(MAKS_KUTISH_MS, 30000);
  assert.equal(kutishVaqti(-3, 0), 1000);
  assert.equal(kutishVaqti(0, 0.5), 1500);
  assert.equal(kutishVaqti(0, 0.9999), 1999);
  assert.equal(kutishVaqti(9, 0.9999), 30999);
});

// ---------- JonliOqim ----------

test('JonliOqim: so\'rov header\'lari, open -> ulangan + hammasiniYangila, resync', async () => {
  const k = sozla();
  k.oqim.boshla();
  await kut();
  assert.equal(k.chaqiruvlar.length, 1);
  const { url, init } = k.chaqiruvlar[0];
  assert.equal(url, 'https://api.test/api/v1/events');
  assert.equal(init.method, 'GET');
  assert.equal(init.headers.Authorization, 'Bearer eski');
  assert.equal(init.headers.Accept, 'text/event-stream');
  assert.deepEqual(k.holatlar, ['ulanmoqda']);

  k.oqimlar[0].yoz('event: open\ndata: {}\n\n');
  await kut();
  assert.equal(k.oqim.holat, 'ulangan');
  assert.deepEqual(k.holatlar, ['ulanmoqda', 'ulangan']);
  assert.equal(k.hammasi, 1);

  k.oqimlar[0].yoz('id: 7\nevent: resync\ndata: {}\n\n');
  await kut();
  assert.equal(k.hammasi, 2);
  assert.equal(k.hodisalar.length, 0, 'boshqaruv hodisalari tinglovchiga uzatilmaydi');
});

test('JonliOqim: domen hodisasi JSON bilan, notanish uzatiladi, buzuq JSON -> {}, ping uzatilmaydi', async () => {
  const k = await ulangan();
  const o = k.oqimlar[0];
  o.yoz('event: support.message\nid: 1\ndata: {"ticketId":"t1","messageId":"m1"}\n\n');
  o.yoz('event: ping\ndata: {}\n\n');
  o.yoz('event: kelajak.hodisa\ndata: {"a":1}\n\n');
  o.yoz('event: notification\ndata: {buzuq\n\n');
  o.yoz('event: chat.thread\ndata: [1,2]\n\n');
  o.yoz('event: chat.message\n\n');
  await kut();
  assert.deepEqual(k.hodisalar, [
    { nom: 'support.message', data: { ticketId: 't1', messageId: 'm1' } },
    { nom: 'kelajak.hodisa', data: { a: 1 } },
    { nom: 'notification', data: {} },
    { nom: 'chat.thread', data: {} },
    { nom: 'chat.message', data: {} },
  ]);
  assert.equal(k.oqim.holat, 'ulangan');
});

test('JonliOqim: tinglovchi xatosi oqimni to\'xtatmaydi', async () => {
  const k = await ulangan({ hodisaXato: true });
  k.oqimlar[0].yoz('event: notification\ndata: {"id":"1"}\n\nevent: notification\ndata: {"id":"2"}\n\n');
  await kut();
  assert.equal(k.hodisalar.length, 2);
  assert.equal(k.oqim.holat, 'ulangan');
  assert.equal(k.chaqiruvlar.length, 1);
});

test('JonliOqim: ping 60 s taymerni yangilaydi, 60 s jimlik -> uzib qayta ulanish', async () => {
  const k = await ulangan();
  await k.oldinga(59_999);
  assert.equal(k.chaqiruvlar.length, 1);
  k.oqimlar[0].yoz('event: ping\ndata: {}\n\n');
  await kut();
  await k.oldinga(1);
  assert.equal(k.oqim.holat, 'ulangan', 'ping taymerni yangiladi');
  // Istalgan hodisa ham yangilaydi.
  await k.oldinga(50_000);
  k.oqimlar[0].yoz('event: notification\ndata: {"id":"n"}\n\n');
  await kut();
  await k.oldinga(59_999);
  assert.equal(k.oqim.holat, 'ulangan');
  assert.equal(k.chaqiruvlar.length, 1);

  await k.oldinga(1); // 60 s jimlik
  assert.equal(k.oqim.holat, 'kutmoqda');
  assert.equal(k.chaqiruvlar[0].init.signal.aborted, true, 'eski oqim uziladi');
  assert.deepEqual(k.kutishlar(), [1000]);
  await k.oldinga(1000);
  assert.equal(k.chaqiruvlar.length, 2);
  // Eski oqimdan kechikib kelgan hodisa e'tiborsiz.
  const oldin = k.hodisalar.length;
  k.oqimlar[0].yoz('event: notification\ndata: {"id":"eski"}\n\n');
  await kut();
  assert.equal(k.hodisalar.length, oldin);
});

test('JonliOqim: open kelmasa ham ulanish boshidan 60 s jimlik nazorati', async () => {
  const k = sozla();
  k.oqim.boshla();
  await kut();
  await k.oldinga(60_000);
  assert.equal(k.oqim.holat, 'kutmoqda');
  await k.oldinga(1000);
  assert.equal(k.chaqiruvlar.length, 2);
});

test('JonliOqim: closed limit -> holat limit, qayta ulanish yo\'q', async () => {
  const k = await ulangan();
  k.oqimlar[0].yoz('event: closed\ndata: {"reason":"limit"}\n\n');
  await kut();
  assert.equal(k.oqim.holat, 'limit');
  assert.equal(k.chaqiruvlar[0].init.signal.aborted, true);
  await k.oldinga(10 * 60_000);
  assert.equal(k.chaqiruvlar.length, 1);
  assert.equal(k.faolTaymerlar(), 0);
});

test('JonliOqim: closed expired -> tokenYangila va backoffsiz darhol yangi token bilan ulanish', async () => {
  const k = await ulangan();
  k.oqimlar[0].yoz('event: closed\ndata: {"reason":"expired"}\n\n');
  await kut();
  assert.equal(k.yangilashlar, 1);
  assert.equal(k.chaqiruvlar.length, 2, 'soat surilmasdan qayta ulandi');
  assert.deepEqual(k.kutishlar(), []);
  assert.equal(k.chaqiruvlar[0].init.signal.aborted, true);
  assert.equal(k.auth(0), 'Bearer eski');
  assert.equal(k.auth(1), 'Bearer yangi');
  k.oqimlar[1].yoz('event: open\ndata: {}\n\n');
  await kut();
  assert.equal(k.oqim.holat, 'ulangan');
  assert.equal(k.hammasi, 2);
});

test('JonliOqim: closed expired, token yangilanmasa -> toxtagan', async () => {
  const k = await ulangan({ yangiToken: null });
  k.oqimlar[0].yoz('event: closed\ndata: {"reason":"expired"}\n\n');
  await kut();
  assert.equal(k.oqim.holat, 'toxtagan');
  await k.oldinga(10 * 60_000);
  assert.equal(k.chaqiruvlar.length, 1);
});

for (const [nomi, data] of [
  ['shutdown', 'data: {"reason":"shutdown"}\n'],
  ['notanish sabab', 'data: {"reason":"boshqa"}\n'],
  ['sababsiz', ''],
]) {
  test(`JonliOqim: closed ${nomi} -> backoff bilan qayta ulanish`, async () => {
    const k = await ulangan();
    k.oqimlar[0].yoz(`event: closed\n${data}\n`);
    await kut();
    assert.equal(k.oqim.holat, 'kutmoqda');
    assert.equal(k.yangilashlar, 0);
    assert.deepEqual(k.kutishlar(), [1000]);
    await k.oldinga(999);
    assert.equal(k.chaqiruvlar.length, 1);
    await k.oldinga(1);
    assert.equal(k.chaqiruvlar.length, 2);
    assert.equal(k.auth(1), 'Bearer eski');
  });
}

test('JonliOqim: oqim kutilmaganda tugasa yoki uzilsa -> backoff', async () => {
  const k = await ulangan();
  k.oqimlar[0].yop();
  await kut();
  assert.equal(k.oqim.holat, 'kutmoqda');
  await k.oldinga(1000);
  assert.equal(k.chaqiruvlar.length, 2);
  k.oqimlar[1].xato();
  await kut();
  assert.equal(k.oqim.holat, 'kutmoqda');
  assert.deepEqual(k.kutishlar(), [1000, 2000]);
});

test('JonliOqim: 401 -> token yangilanib bir marta qayta urinish', async () => {
  const k = sozla({ navbat: [401] });
  k.oqim.boshla();
  await kut();
  assert.equal(k.yangilashlar, 1);
  assert.equal(k.chaqiruvlar.length, 2);
  assert.equal(k.auth(0), 'Bearer eski');
  assert.equal(k.auth(1), 'Bearer yangi');
  assert.deepEqual(k.kutishlar(), []);
  k.oqimlar[0].yoz('event: open\ndata: {}\n\n');
  await kut();
  assert.equal(k.oqim.holat, 'ulangan');
});

test('JonliOqim: ikkinchi 401 -> toxtagan, boshqa urinish yo\'q', async () => {
  const k = sozla({ navbat: [401, 401] });
  k.oqim.boshla();
  await kut();
  assert.equal(k.oqim.holat, 'toxtagan');
  assert.equal(k.yangilashlar, 1);
  assert.equal(k.chaqiruvlar.length, 2);
  await k.oldinga(10 * 60_000);
  assert.equal(k.chaqiruvlar.length, 2);
});

test('JonliOqim: 401 va token yangilanmasa -> toxtagan', async () => {
  const k = sozla({ navbat: [401], yangiToken: null });
  k.oqim.boshla();
  await kut();
  assert.equal(k.oqim.holat, 'toxtagan');
  assert.equal(k.chaqiruvlar.length, 1);
});

test('JonliOqim: token yo\'q -> so\'rov yuborilmaydi, toxtagan', async () => {
  const k = sozla({ token: null });
  k.oqim.boshla();
  await kut();
  assert.equal(k.chaqiruvlar.length, 0);
  assert.equal(k.oqim.holat, 'toxtagan');
});

test('JonliOqim: 403 -> taqiqlangan, qayta urinish yo\'q', async () => {
  const k = sozla({ navbat: [403] });
  k.oqim.boshla();
  await kut();
  assert.equal(k.oqim.holat, 'taqiqlangan');
  assert.equal(k.yangilashlar, 0);
  await k.oldinga(10 * 60_000);
  assert.equal(k.chaqiruvlar.length, 1);
});

test('JonliOqim: 503 va tarmoq xatosi -> 1 s, 2 s, 4 s ... 30 s', async () => {
  const kutilgan = [1000, 2000, 4000, 8000, 16000, 30000, 30000];
  const k = sozla({ navbat: [503, 'tarmoq', 503, 'tarmoq', 500, 503, 'tarmoq'] });
  k.oqim.boshla();
  await kut();
  for (let i = 0; i < kutilgan.length; i++) {
    assert.equal(k.oqim.holat, 'kutmoqda');
    assert.equal(k.kutishlar().at(-1), kutilgan[i], `urinish ${i}`);
    assert.equal(k.chaqiruvlar.length, i + 1);
    await k.oldinga(kutilgan[i] - 1);
    assert.equal(k.chaqiruvlar.length, i + 1, `urinish ${i}: muddatidan oldin emas`);
    await k.oldinga(1);
  }
  assert.equal(k.chaqiruvlar.length, kutilgan.length + 1);
  assert.equal(k.oqim.holat, 'ulanmoqda');
  assert.equal(k.yangilashlar, 0);
});

test('JonliOqim: backoff jitter tasodif() dan', async () => {
  const k = sozla({ navbat: [503, 503], tasodif: 0.25 });
  k.oqim.boshla();
  await kut();
  await k.oldinga(1250);
  assert.deepEqual(k.kutishlar(), [1250, 2250]);
});

for (const [umr, kutilgan] of [
  [30_000, 1000],
  [29_999, 4000],
]) {
  test(`JonliOqim: oqim ${umr} ms yashagach uzilsa -> keyingi kutish ${kutilgan}`, async () => {
    const k = sozla({ navbat: [503, 503] });
    k.oqim.boshla();
    await kut();
    await k.oldinga(1000);
    await k.oldinga(2000);
    assert.deepEqual(k.kutishlar(), [1000, 2000]);
    k.oqimlar[0].yoz('event: open\ndata: {}\n\n');
    await kut();
    await k.oldinga(umr);
    k.oqimlar[0].yop();
    await kut();
    assert.deepEqual(k.kutishlar(), [1000, 2000, kutilgan]);
  });
}

test('JonliOqim: closed shutdown ham 30 s dan keyin backoff\'ni nolga qaytaradi', async () => {
  const k = sozla({ navbat: [503, 503] });
  k.oqim.boshla();
  await kut();
  await k.oldinga(3000);
  await k.oldinga(30_000);
  k.oqimlar[0].yoz('event: closed\ndata: {"reason":"shutdown"}\n\n');
  await kut();
  assert.deepEqual(k.kutishlar(), [1000, 2000, 1000]);
});

test('JonliOqim: toxtat() hammasini to\'xtatadi', async () => {
  const k = await ulangan();
  k.oqim.toxtat();
  assert.equal(k.oqim.holat, 'toxtagan');
  assert.equal(k.chaqiruvlar[0].init.signal.aborted, true);
  k.oqimlar[0].yoz('event: notification\ndata: {"id":"1"}\n\n');
  await kut();
  assert.equal(k.hodisalar.length, 0);
  await k.oldinga(10 * 60_000);
  assert.equal(k.chaqiruvlar.length, 1);
  assert.equal(k.faolTaymerlar(), 0);

  // Backoff paytida.
  const b = sozla({ navbat: [503] });
  b.oqim.boshla();
  await kut();
  assert.equal(b.oqim.holat, 'kutmoqda');
  b.oqim.toxtat();
  await b.oldinga(10 * 60_000);
  assert.equal(b.chaqiruvlar.length, 1);
  assert.equal(b.faolTaymerlar(), 0);

  // Token yangilanayotganda (401) to'xtatilsa — qayta ulanmaydi.
  let ochish;
  const c = sozla({ navbat: [401], tokenKechikishi: new Promise((r) => (ochish = r)) });
  c.oqim.boshla();
  await kut();
  assert.equal(c.yangilashlar, 1);
  c.oqim.toxtat();
  ochish();
  await kut();
  assert.equal(c.chaqiruvlar.length, 1);
  assert.equal(c.oqim.holat, 'toxtagan');
});

test('JonliOqim: hozirUlan() backoff paytida darhol ulanadi va backoff nolga qaytadi', async () => {
  const k = sozla({ navbat: [503, 503] });
  k.oqim.boshla();
  await kut();
  await k.oldinga(1000);
  assert.deepEqual(k.kutishlar(), [1000, 2000]);
  k.oqim.hozirUlan();
  await kut();
  assert.equal(k.chaqiruvlar.length, 3);
  await k.oldinga(2000);
  assert.equal(k.chaqiruvlar.length, 3, 'eski backoff taymeri bekor qilindi');
  k.oqimlar[0].yoz('event: closed\ndata: {"reason":"shutdown"}\n\n');
  await kut();
  assert.equal(k.kutishlar().at(-1), 1000);
});

test('JonliOqim: hozirUlan() ulangan holatda hech narsa qilmaydi; boshla() ikki marta — bitta ulanish', async () => {
  const k = await ulangan();
  k.oqim.boshla();
  k.oqim.hozirUlan();
  await kut();
  assert.equal(k.chaqiruvlar.length, 1);
  assert.equal(k.oqim.holat, 'ulangan');
});

// limit va 403 yakuniy: jonliHodisalar.ts "online" hodisasida hozirUlan() chaqiradi — bu tab qayta ulanmasligi kerak
// (aks holda tablar bir-birining joyini olib, limitni aylantiradi).
for (const [nomi, sozlama, yozuv] of [
  ['limit', {}, 'event: closed\ndata: {"reason":"limit"}\n\n'],
  ['taqiqlangan (403)', { navbat: [403] }, null],
]) {
  test(
    `JonliOqim: ${nomi} dan keyin hozirUlan() qayta ulanmasligi kerak`,
    async () => {
      const k = yozuv ? await ulangan(sozlama) : sozla(sozlama);
      if (!yozuv) k.oqim.boshla();
      await kut();
      if (yozuv) {
        k.oqimlar[0].yoz(yozuv);
        await kut();
      }
      const oldin = k.chaqiruvlar.length;
      k.oqim.hozirUlan();
      await kut();
      assert.equal(k.chaqiruvlar.length, oldin);
    },
  );
}

test('JonliOqim: fetch javob bermasa (osilgan ulanish) ham 60 s dan keyin uzib qayta ulanadi', async () => {
  const k = sozla();
  let osilgan;
  const asl = k.oqim;
  // Birinchi so'rov hech qachon tugamaydi (faqat abort bilan), keyingilari oddiy.
  let birinchi = true;
  const jonli = new (asl.constructor)({
    url: 'https://api.test/api/v1/events',
    tokenOl: () => 't',
    tokenYangila: async () => 't',
    hodisa: () => {},
    hammasiniYangila: () => {},
    holat: (h) => k.holatlar.push(h),
    vaqt: k.vaqt,
    fetchFn: (url, init) => {
      k.chaqiruvlar.push({ url, init });
      if (birinchi) {
        birinchi = false;
        return new Promise((_, rad) => {
          osilgan = init.signal;
          init.signal.addEventListener('abort', () => rad(new DOMException('aborted', 'AbortError')));
        });
      }
      return k.fetchFn(url, init);
    },
  });
  jonli.boshla();
  await kut();
  assert.equal(jonli.holat, 'ulanmoqda');
  await k.oldinga(59_999);
  assert.equal(jonli.holat, 'ulanmoqda');
  await k.oldinga(1);
  assert.equal(osilgan.aborted, true, "osilgan so'rov uziladi");
  assert.equal(jonli.holat, 'kutmoqda');
  await k.oldinga(1000);
  assert.ok(k.chaqiruvlar.length >= 2, 'qayta ulanish');
});

test('JonliOqim: 30 s dan uzoq ishlagan oqim jim qolib uzilsa (watchdog) backoff nolga qaytadi', async () => {
  const k = sozla({ navbat: [503, 503, 503] });
  k.oqim.boshla();
  await kut();
  await k.oldinga(1000);
  await k.oldinga(2000);
  await k.oldinga(4000); // 4-urinish: oqim ochiladi
  assert.equal(k.chaqiruvlar.length, 4);
  k.oqimlar.at(-1).yoz('event: open\ndata: {}\n\n');
  await kut();
  // 20 daqiqa ping bilan ishlaydi, keyin jim qoladi.
  for (let i = 0; i < 48; i++) {
    await k.oldinga(25_000);
    k.oqimlar.at(-1).yoz('event: ping\ndata: {}\n\n');
    await kut();
  }
  const oldingiKutishlar = k.kutishlar().length;
  await k.oldinga(60_000);
  assert.equal(k.oqim.holat, 'kutmoqda');
  assert.deepEqual(k.kutishlar().slice(oldingiKutishlar), [1000], 'barqaror oqimdan keyin kutish 1 s');
});
