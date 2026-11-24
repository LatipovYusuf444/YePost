// 3D Demo v3 — ma'lumot va yuk mashinalari marshrutlari: 10 ta stanok (ikki liniya), 4 ta KAMAZ reysi (4 ta rampa),
// marshrutlar bosqichga sig'ishi, KPP oldida kutish, o'zaro masofa va to'siqlar bilan kesishmaslik (simulyatsiya).
import test from 'node:test';
import assert from 'node:assert/strict';
import { DemoSexManbasi, DEMO_STANOKLAR, LOGISTIKA, REYSLAR_JADVALI, REYS_SILJISHLARI, SSENARIY, reysBosqichi } from '../src/Pages/Demo3DSex/demoManbasi.ts';
import { KIRISH, CHIQISH, KPP, KUTISH_JOYLARI, OFIS, MAISHIY, GALEREYA, TASHQI_TURARGOH, DARVOZA, HUDUD, RAMPALAR, ASOSIY_YOL } from '../src/Pages/Demo3DSex/hudud.ts';
import { MARSHRUTLAR, RAMPA_HOLATI, SHLAGBAUM_VAQTLARI, YUK_MASHINASI, marshrutHolati, yangiHolat } from '../src/Pages/Demo3DSex/yollar.ts';

const YARIM = { u: YUK_MASHINASI.uzunlik / 2, e: YUK_MASHINASI.eni / 2 };
const RAMPA_RAQAMLARI = [1, 2, 3, 4];

function yangi() {
  let hozir = 1_000_000;
  const m = new DemoSexManbasi(() => hozir);
  return { m, vaqt: (s) => { hozir += s * 1000; } };
}
const tikla = (m, vaqt, n) => { for (let i = 0; i < n; i += 1) { vaqt(1); m.tik(); } };
const bosqichUzunligi = (reys, nom) => reys.bosqichlar.find(([b]) => b === nom)[1];

// ── Geometriya: mashina — yo'naltirilgan to'rtburchak (markaz, oldi (sin θ, cos θ)) ──

function mashinaTortburchagi(h) {
  const f = [Math.sin(h.burchak), Math.cos(h.burchak)];
  return { x: h.p.x, z: h.p.z, oqlar: [f, [f[1], -f[0]]], yarim: [YARIM.u, YARIM.e] };
}
function qutiTortburchagi([x0, x1, z0, z1], qisish = 0) {
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, oqlar: [[1, 0], [0, 1]], yarim: [(x1 - x0) / 2 - qisish, (z1 - z0) / 2 - qisish] };
}
/** Ajratuvchi o'q teoremasi (SAT): ikki yo'naltirilgan to'rtburchak kesishadimi. */
function kesishadi(a, b) {
  const d = [b.x - a.x, b.z - a.z];
  const proyeksiya = (q, o) => q.oqlar.reduce((s, oq, i) => s + q.yarim[i] * Math.abs(oq[0] * o[0] + oq[1] * o[1]), 0);
  for (const o of [...a.oqlar, ...b.oqlar]) {
    if (Math.abs(d[0] * o[0] + d[1] * o[1]) >= proyeksiya(a, o) + proyeksiya(b, o)) return false;
  }
  return true;
}

/** Reysning ssenariy soniyasidagi holati (sahna Transport'dagi kabi): yo'q bo'lsa null. */
function reysHolati(reys, soniya) {
  const { bosqich, otgan } = reysBosqichi(soniya, reys.siljish, reys.bosqichlar);
  const M = MARSHRUTLAR[reys.rampa];
  if (bosqich === 'yoq') return null;
  if (bosqich === 'ketmoqda') return otgan > M.ketish.davom ? null : marshrutHolati(M.ketish, otgan, yangiHolat());
  return marshrutHolati(M.kelish, bosqich === 'rampada' ? 1e9 : otgan, yangiHolat());
}

/** Hovlidagi to'siqlar [x0, x1, z0, z1]: bino (rampaga tegish mumkin — 5 sm qisilgan), ofis, kutish joylari, KPP oroli, panjara, maishiy blok... */
const TOSIQLAR = [
  { nom: 'ishlab chiqarish binosi', q: [-32, 32, -15, 15], qisish: 0.05 },
  { nom: 'ofis', q: [OFIS.x0, OFIS.x1, OFIS.z0, OFIS.z1] },
  ...KUTISH_JOYLARI.map((k, i) => ({ nom: `kutish joyi ${i + 1}`, q: [k.x - YARIM.e, k.x + YARIM.e, k.z - YARIM.u, k.z + YARIM.u] })),
  { nom: 'KPP oroli', q: [KPP.x - KPP.yarimEni, KPP.x + KPP.yarimEni, KPP.z0, KPP.z1] },
  { nom: 'panjara (chap)', q: [HUDUD.chap, DARVOZA.x - DARVOZA.yarimEni, HUDUD.old - 0.15, HUDUD.old + 0.15] },
  { nom: 'panjara (o‘ng)', q: [DARVOZA.x + DARVOZA.yarimEni, HUDUD.ong, HUDUD.old - 0.15, HUDUD.old + 0.15] },
  { nom: 'maishiy blok', q: [MAISHIY.x0, MAISHIY.x1, MAISHIY.z0, MAISHIY.z1] },
  { nom: 'galereya', q: [GALEREYA.x0, GALEREYA.x1, GALEREYA.z0, GALEREYA.z1] },
  { nom: 'tashqi avtoturargoh', q: [TASHQI_TURARGOH.x0, TASHQI_TURARGOH.x1, TASHQI_TURARGOH.z0, TASHQI_TURARGOH.z1] },
];

// ── Stanoklar ──

test('10 ta stanok: ikki liniya, barqaror va takrorlanmas ID, nomlar va joylar rejadagidek', () => {
  assert.equal(DEMO_STANOKLAR.length, 10);
  assert.equal(new Set(DEMO_STANOKLAR.map((s) => s.id)).size, 10);
  const x = { kesish: -15, cnc: -5, qirra: 5.5, burgilash: 14.5, qadoqlash: 22.5 };
  const nom = { kesish: 'Kesish', cnc: 'CNC', qirra: 'Qirra', burgilash: "Burg'ilash", qadoqlash: 'Qadoqlash' };
  for (const [liniya, z, burilish] of [['01', -7.5, 0], ['02', 7.5, Math.PI]]) {
    for (const tur of Object.keys(x)) {
      const s = DEMO_STANOKLAR.find((st) => st.id === `${tur}-${liniya}`);
      assert.ok(s, `${tur}-${liniya}`);
      assert.equal(s.tur, tur);
      assert.equal(s.nom, `${nom[tur]}-${liniya}`);
      assert.deepEqual(s.joy, [x[tur], z]);
      assert.equal(s.burilish, burilish);
    }
  }
  // Stanoklar bino ichida va bir-biriga tegmaydi (markazlar orasi ≥ 7 m).
  for (const a of DEMO_STANOKLAR) {
    assert.ok(Math.abs(a.joy[0]) < 32 && Math.abs(a.joy[1]) < 15, a.id);
    for (const b of DEMO_STANOKLAR) if (a !== b) assert.ok(Math.hypot(a.joy[0] - b.joy[0], a.joy[1] - b.joy[1]) >= 7, `${a.id} — ${b.id}`);
  }
});

test('boshlang‘ich holat: eski 5 ta o‘zgarmagan, yangi 5 tasi o‘z buyurtmalari bilan; Burg‘ilash-02 ssenariyda ishga tushadi', () => {
  const { m, vaqt } = yangi();
  const h = m.holat();
  assert.equal(Object.keys(h).length, 10);
  assert.equal(h['kesish-01'].joriy.bajarildi, 32);
  assert.equal(h['kesish-01'].joriy.jami, 80);
  assert.equal(h['cnc-01'].holat, 'bosh');
  assert.equal(h['qirra-01'].joriy.buyurtma, '№172');
  for (const id of ['kesish-02', 'cnc-02', 'qirra-02', 'qadoqlash-02']) {
    assert.equal(h[id].holat, 'ishlayapti', id);
    assert.match(h[id].joriy.buyurtma, /^№18[4-8]$/, id);
    assert.ok(h[id].joriy.bajarildi < h[id].joriy.jami, id);
  }
  assert.equal(h['burgilash-02'].holat, 'bosh');
  assert.equal(h['burgilash-02'].joriy, null);
  tikla(m, vaqt, 6);
  assert.ok(m.holat()['kesish-02'].joriy.bajarildi > 18, 'kesish-02 ishlayapti');
  tikla(m, vaqt, SSENARIY.burgilash2Boshlanadi - 6);
  const b2 = m.holat()['burgilash-02'];
  assert.equal(b2.holat, 'ishlayapti');
  assert.equal(b2.joriy.buyurtma, '№184');
  assert.ok(m.hodisalar.some((x) => x.stanokId === 'burgilash-02' && x.tur === 'boshlandi'));
});

// ── Reyslar ──

test('4 ta reys: 1, 2 — jo‘natish (old rampa), 3, 4 — qabul (chap rampa); bosqichlar davrni to‘ldiradi; boshlanishda bosqichlar', () => {
  assert.deepEqual(REYSLAR_JADVALI.map((r) => [r.id, r.rampa, r.yonalish]), [
    ['reys-1', 1, 'jonatish'], ['reys-2', 2, 'jonatish'], ['reys-3', 3, 'qabul'], ['reys-4', 4, 'qabul'],
  ]);
  assert.equal(new Set(REYSLAR_JADVALI.map((r) => r.raqam)).size, 4);
  for (const r of REYSLAR_JADVALI) {
    assert.deepEqual(r.bosqichlar.map(([b]) => b), ['kelmoqda', 'rampada', 'ketmoqda', 'yoq'], r.id);
    assert.equal(r.bosqichlar.reduce((s, [, d]) => s + d, 0), LOGISTIKA.davr, r.id);
    assert.ok(r.bosqichlar.every(([, d]) => d > 0), r.id);
    assert.equal(REYS_SILJISHLARI[r.id], r.siljish);
  }
  assert.equal(LOGISTIKA.bosqichlar, REYSLAR_JADVALI[0].bosqichlar);
  const { m } = yangi();
  assert.deepEqual(m.reyslar().map((r) => [r.id, r.bosqich]), [['reys-1', 'kelmoqda'], ['reys-2', 'kelmoqda'], ['reys-3', 'ketmoqda'], ['reys-4', 'rampada']]);
  assert.equal(m.reyslar()[0].boshlangan, 1_000_000, '1-reys aynan 0-soniyada kelishni boshlaydi');
});

test('butun davr: har reys kelmoqda → rampada → ketmoqda → yoq aylanadi, har almashishda hodisa va yangi boshlanish vaqti; paletlar', () => {
  const { m, vaqt } = yangi();
  const tarix = Object.fromEntries(REYSLAR_JADVALI.map((r) => [r.id, [m.reyslar().find((x) => x.id === r.id).bosqich]]));
  const hodisalar = [];
  m.obuna((_, h) => { if (h?.obyekt === 'reys') hodisalar.push(h); });
  for (let s = 1; s <= LOGISTIKA.davr; s += 1) {
    const oldingi = m.reyslar();
    vaqt(1); m.tik();
    for (const r of m.reyslar()) {
      const eski = oldingi.find((x) => x.id === r.id);
      if (eski.bosqich !== r.bosqich) {
        tarix[r.id].push(r.bosqich);
        assert.ok(r.boshlangan > eski.boshlangan, `${r.id}: yangi boshlanish vaqti`);
      } else assert.equal(r.boshlangan, eski.boshlangan, `${r.id}: bosqich ichida o'zgarmaydi`);
      if (r.bosqich === 'rampada') {
        const otgan = (1_000_000 + s * 1000 - r.boshlangan) / 1000;
        assert.equal(r.palet, Math.min(r.jamiPalet, 2 * Math.floor((otgan + 2.95) / 7.5)), `${r.id} palet`);
      }
      if (r.bosqich === 'ketmoqda') assert.equal(r.palet, r.jamiPalet);
    }
  }
  const tartib = ['kelmoqda', 'rampada', 'ketmoqda', 'yoq'];
  for (const [id, b] of Object.entries(tarix)) {
    assert.equal(b.length, 5, `${id}: davrda 4 ta almashish (${b.join(' → ')})`);
    for (let i = 1; i < b.length; i++) assert.equal(tartib.indexOf(b[i]), (tartib.indexOf(b[i - 1]) + 1) % 4, `${id}: ${b.join(' → ')}`);
  }
  for (const r of REYSLAR_JADVALI) {
    assert.ok(hodisalar.some((h) => h.stanokId === r.id && h.tur === 'reys_rampada' && h.matn.includes(`${r.raqam} ${r.rampa}-rampada`)), r.id);
    assert.ok(hodisalar.some((h) => h.stanokId === r.id && h.tur === 'reys_keldi'), r.id);
    assert.ok(hodisalar.some((h) => h.stanokId === r.id && h.tur === 'reys_ketdi'), r.id);
  }
  // Rampada turish oxirigacha barcha paletlar (6 ta ~19.6 s da).
  assert.ok(2 * Math.floor((LOGISTIKA.rampada - 1 + 2.95) / 7.5) >= 6);
});

// ── Marshrutlar ──

test('har marshrut o‘z bosqichiga sig‘adi; rampada to‘g‘ri joy va yo‘nalishda turadi', () => {
  for (const r of REYSLAR_JADVALI) {
    const M = MARSHRUTLAR[r.rampa];
    assert.ok(M.kelish.davom <= bosqichUzunligi(r, 'kelmoqda'), `${r.id} kelish ${M.kelish.davom.toFixed(1)} s`);
    assert.ok(M.ketish.davom <= bosqichUzunligi(r, 'ketmoqda'), `${r.id} ketish ${M.ketish.davom.toFixed(1)} s`);
  }
  const kutilgan = {
    1: { x: RAMPALAR[1].x, z: 19.3, burchak: 0 },
    2: { x: RAMPALAR[2].x, z: 19.3, burchak: 0 },
    3: { x: -36.3, z: RAMPALAR[3].z, burchak: -Math.PI / 2 },
    4: { x: -36.3, z: RAMPALAR[4].z, burchak: -Math.PI / 2 },
  };
  for (const rampa of RAMPA_RAQAMLARI) {
    const h = marshrutHolati(MARSHRUTLAR[rampa].kelish, 1e9, yangiHolat());
    const k = kutilgan[rampa];
    assert.deepEqual(RAMPA_HOLATI[rampa], k);
    assert.ok(Math.abs(h.p.x - k.x) < 0.05 && Math.abs(h.p.z - k.z) < 0.05, `${rampa}-rampa: (${h.p.x.toFixed(2)}, ${h.p.z.toFixed(2)})`);
    assert.ok(Math.abs(h.burchak - k.burchak) < 0.03, `${rampa}-rampa yo'nalishi ${h.burchak.toFixed(3)}`);
    assert.equal(h.orqaga, true, `${rampa}-rampaga orqa bilan kiradi`);
    // Ketish rampadagi joydan boshlanadi.
    const k0 = marshrutHolati(MARSHRUTLAR[rampa].ketish, 0, yangiHolat());
    assert.ok(k0.p.distanceTo(h.p) < 0.05, `${rampa}-rampadan ketish boshi`);
  }
});

test('ko‘chadan keladi va ko‘chaga ketadi: z = 66 qatori (−x), kirish x = −4.5, chiqish x = 4.5', () => {
  const qator = ASOSIY_YOL.qatorlar[0].z;
  for (const rampa of RAMPA_RAQAMLARI) {
    const { kelish, ketish } = MARSHRUTLAR[rampa];
    const bosh = marshrutHolati(kelish, 0, yangiHolat());
    assert.ok(bosh.p.x >= 100 && Math.abs(bosh.p.z - qator) < 0.05 && Math.abs(bosh.burchak + Math.PI / 2) < 0.03, `${rampa}: kelish boshi`);
    const oxir = marshrutHolati(ketish, ketish.davom, yangiHolat());
    assert.ok(oxir.p.x <= -100 && Math.abs(oxir.p.z - qator) < 0.05 && Math.abs(oxir.burchak + Math.PI / 2) < 0.03, `${rampa}: ketish oxiri`);
    // Darvoza chizig'idan (z = 48) o'tishda — o'z qatorida, to'g'ri yo'nalishda.
    for (const [m, x, burchak] of [[kelish, KIRISH.x, Math.PI], [ketish, CHIQISH.x, 0]]) {
      let topildi = false;
      for (let t = 0; t <= m.davom; t += 0.05) {
        const h = marshrutHolati(m, t, yangiHolat());
        if (Math.abs(h.p.z - 48) < 0.3) {
          topildi = true;
          assert.ok(Math.abs(h.p.x - x) < 0.1, `${rampa}: darvozada x = ${h.p.x.toFixed(2)}`);
          assert.ok(Math.abs(Math.cos(h.burchak) - Math.cos(burchak)) < 0.01, `${rampa}: darvozada yo'nalish`);
        }
      }
      assert.ok(topildi, `${rampa}: darvozadan o'tadi`);
    }
  }
});

test('KPP: kirishda shlagbaum oldida to‘xtab kutadi (oldi z ≈ 44.2), chiqishda ham shlagbaum oldida to‘xtaydi', () => {
  for (const rampa of RAMPA_RAQAMLARI) {
    const { kelish, ketish } = MARSHRUTLAR[rampa];
    const [k0, k1] = SHLAGBAUM_VAQTLARI[rampa].kirish;
    assert.ok(k1 - k0 >= 1, `${rampa}: kirishda ≥ 1 s kutadi`);
    const h = marshrutHolati(kelish, (k0 + k1) / 2, yangiHolat());
    assert.equal(h.harakatda, false);
    assert.ok(Math.abs(h.p.x - KIRISH.x) < 0.05, `kirish qatori x = ${h.p.x.toFixed(2)}`);
    assert.ok(Math.abs(h.p.z - 48.5) < 0.15, `markaz z = ${h.p.z.toFixed(2)}`);
    const old = h.p.z + YARIM.u * Math.cos(h.burchak);
    assert.ok(old > KIRISH.shlagbaumZ + 0.3 && old < KIRISH.shlagbaumZ + 1.2, `mashina oldi z = ${old.toFixed(2)} (shlagbaumdan o'tmaydi)`);
    // Kutishdan keyin yuradi va shlagbaumdan o'tadi.
    const keyin = marshrutHolati(kelish, k1 + 3, yangiHolat());
    assert.ok(keyin.harakatda && keyin.p.z < h.p.z - 1);
    // Kutishgacha mashina oldi hech qachon shlagbaumdan o'tmagan.
    for (let t = 0; t < k1; t += 0.1) {
      const q = marshrutHolati(kelish, t, yangiHolat());
      if (Math.abs(q.p.x - KIRISH.x) < 3) assert.ok(q.p.z - YARIM.u > KIRISH.shlagbaumZ, `t = ${t.toFixed(1)}`);
    }
    const [c0, c1] = SHLAGBAUM_VAQTLARI[rampa].chiqish;
    assert.ok(c1 - c0 >= 0.8, `${rampa}: chiqishda to'xtaydi`);
    const c = marshrutHolati(ketish, (c0 + c1) / 2, yangiHolat());
    assert.equal(c.harakatda, false);
    assert.ok(Math.abs(c.p.x - CHIQISH.x) < 0.1 && Math.abs(c.burchak) < 0.05, `chiqish qatori (${c.p.x.toFixed(2)}, ${c.burchak.toFixed(2)})`);
    const cOld = c.p.z + YARIM.u;
    assert.ok(cOld < CHIQISH.shlagbaumZ && cOld > CHIQISH.shlagbaumZ - 1.2, `chiqishda oldi z = ${cOld.toFixed(2)}`);
  }
});

test('to‘rt mashina butun davr davomida: markazlar orasi ≥ 6 m va to‘rtburchaklari kesishmaydi (0.25 s qadam)', () => {
  let eng = Infinity;
  let qayerda = '';
  for (let s = 0; s < LOGISTIKA.davr; s += 0.25) {
    const holatlar = REYSLAR_JADVALI.map((r) => [r.id, reysHolati(r, s)]).filter(([, h]) => h);
    for (let i = 0; i < holatlar.length; i++) {
      for (let j = i + 1; j < holatlar.length; j++) {
        const [ai, a] = holatlar[i];
        const [bi, b] = holatlar[j];
        const d = a.p.distanceTo(b.p);
        if (d < eng) { eng = d; qayerda = `${ai}–${bi}, ${s} s`; }
        assert.ok(!kesishadi(mashinaTortburchagi(a), mashinaTortburchagi(b)), `${ai} va ${bi} ${s} s da kesishadi`);
      }
    }
  }
  assert.ok(eng >= 6, `eng yaqin masofa ${eng.toFixed(2)} m (${qayerda})`);
});

test('jadval kichik vaqt siljishiga chidamli: har reys ±2 s siljisa ham markazlar orasi ≥ 6 m', () => {
  for (const r of REYSLAR_JADVALI) {
    for (const d of [-2, -1, 1, 2]) {
      const jadval = REYSLAR_JADVALI.map((x) => (x === r ? { ...x, siljish: x.siljish + d } : x));
      for (let s = 0; s < LOGISTIKA.davr; s += 0.5) {
        const holatlar = jadval.map((x) => reysHolati(x, s)).filter(Boolean);
        for (let i = 0; i < holatlar.length; i++) for (let j = i + 1; j < holatlar.length; j++) {
          assert.ok(holatlar[i].p.distanceTo(holatlar[j].p) >= 6, `${r.id} ${d > 0 ? '+' : ''}${d} s, ${s} s`);
        }
      }
    }
  }
});

test('marshrutlar bino, ofis, kutish joylari, KPP oroli, panjara, maishiy blok va turargohga tegmaydi', () => {
  const tosiqlar = TOSIQLAR.map((t) => ({ ...t, r: qutiTortburchagi(t.q, t.qisish) }));
  for (const rampa of RAMPA_RAQAMLARI) {
    for (const [nom, m] of Object.entries(MARSHRUTLAR[rampa])) {
      for (let t = 0; t <= m.davom + 0.05; t += 0.05) {
        const h = marshrutHolati(m, t, yangiHolat());
        const q = mashinaTortburchagi(h);
        for (const tosiq of tosiqlar) {
          assert.ok(!kesishadi(q, tosiq.r), `${rampa}-rampa ${nom}, t = ${t.toFixed(2)} s: ${tosiq.nom} (${h.p.x.toFixed(1)}, ${h.p.z.toFixed(1)})`);
        }
      }
    }
  }
});

test('rampada turgan mashina orqasi devorga tegadi (rampa chizig‘ida), bino ichiga kirmaydi', () => {
  for (const rampa of RAMPA_RAQAMLARI) {
    const h = marshrutHolati(MARSHRUTLAR[rampa].kelish, 1e9, yangiHolat());
    const orqa = [h.p.x - YARIM.u * Math.sin(h.burchak), h.p.z - YARIM.u * Math.cos(h.burchak)];
    const devor = RAMPALAR[rampa];
    if (devor.devor === 'old') assert.ok(Math.abs(orqa[1] - devor.z) < 0.06 && Math.abs(orqa[0] - devor.x) < 0.06, `${rampa}: orqa (${orqa.map((v) => v.toFixed(2))})`);
    else assert.ok(Math.abs(orqa[0] - devor.x) < 0.06 && Math.abs(orqa[1] - devor.z) < 0.06, `${rampa}: orqa (${orqa.map((v) => v.toFixed(2))})`);
  }
});

test('harakat silliq: yo‘nalish keskin sakramaydi, mashina yonlab sirpanmaydi, ko‘chada ~43 km/soatdan oshmaydi', () => {
  const QADAM = 0.05;
  for (const rampa of RAMPA_RAQAMLARI) {
    for (const [nom, m] of Object.entries(MARSHRUTLAR[rampa])) {
      let oldingi = null;
      for (let t = 0; t <= m.davom; t += QADAM) {
        const h = marshrutHolati(m, t, yangiHolat());
        if (oldingi) {
          const farq = Math.abs(Math.atan2(Math.sin(h.burchak - oldingi.b), Math.cos(h.burchak - oldingi.b)));
          assert.ok(farq < 0.07, `${rampa}-rampa ${nom}, t = ${t.toFixed(2)}: burilish ${farq.toFixed(3)} rad / ${QADAM} s`);
          const yol = Math.hypot(h.p.x - oldingi.x, h.p.z - oldingi.z);
          assert.ok(yol / QADAM <= 12.5, `${rampa}-rampa ${nom}: tezlik ${(yol / QADAM).toFixed(1)} m/s`);
          if (yol / QADAM > 0.5) {
            // Harakat yo'nalishi mashina o'qi bo'ylab (oldinga yoki orqaga).
            const harakat = Math.atan2(h.p.x - oldingi.x, h.p.z - oldingi.z);
            const sirpanish = Math.abs(Math.sin(harakat - h.burchak));
            assert.ok(sirpanish < 0.05, `${rampa}-rampa ${nom}, t = ${t.toFixed(2)}: yonlab sirpanish ${sirpanish.toFixed(3)}`);
          }
        }
        oldingi = { x: h.p.x, z: h.p.z, b: h.burchak };
      }
    }
  }
});
