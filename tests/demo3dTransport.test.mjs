// 3D Demo v3 — transport ko'rinishi: shlagbaumlar mantig'i, tashqi avtoturargoh (band joylar, qatnovchilar jadvali va izlari),
// avtobus bekati qarori, ko'cha harakati, GLB avtomobillarni tayyorlash va manba tekshiruvlari (havolasiz, brend nomisiz).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  AVTOBUS,
  AVTOBUS_TOXTASH_X,
  AVTOMOBIL_OLCHAMI,
  AVTOMOBIL_TURLARI,
  BEKAT_OYNALARI,
  JOY_SONI,
  YUK,
  KOCHA_CHEGARASI,
  KOCHA_QATORLARI,
  KUTAYOTGAN_MASHINALAR,
  QATNOV,
  QATNOVCHI_JOYLARI,
  QATNOVCHI_TURLARI,
  QATNOV_KECHIKISH_CHEGARASI,
  SHLAGBAUMLAR,
  SHLAGBAUM_OLDIN,
  STRELA,
  TRAFIK,
  TURGAN_AVTOMOBILLAR,
  YOLAK_Z,
  avtobusToxtaydimi,
  eshikOchiqmi,
  glbAvtomobili,
  kochadami,
  kuzovdagiPalet,
  oldindagiMasofa,
  orqagaBoshlanishi,
  qatnovBosqichi,
  qatnovchiMarshrutlari,
  reysKorinishi,
  shlagbaumOchiqmi,
  strelaBurchagi,
  strelaQadami,
  tortburchakKesishadimi,
  turargohJoyi,
} from '../src/Pages/Demo3DSex/avtomobilModellari.ts';
import { AVTOBUS_BEKATI, KUTISH_JOYLARI, RAMPALAR, TASHQI_TURARGOH } from '../src/Pages/Demo3DSex/hudud.ts';
import { MARSHRUTLAR, RAMPA_HOLATI, SHLAGBAUM_VAQTLARI, YUK_MASHINASI, marshrutHolati, yangiHolat } from '../src/Pages/Demo3DSex/yollar.ts';

const manba = (fayl) => fs.readFileSync(new URL(`../${fayl}`, import.meta.url), 'utf8');
const RAMPA_RAQAMLARI = [1, 2, 3, 4];
const QADAM = 0.05;

/** Yuk mashinasi to'rtburchagi (markaz, oldi (sin θ, cos θ)). */
const mashinaIzi = (h) => ({ x: h.p.x, z: h.p.z, burchak: h.burchak, uzunlik: YUK_MASHINASI.uzunlik, eni: YUK_MASHINASI.eni });
/** Yopiq strela izi (qator ustida, x bo'ylab). */
const strelaIzi = (s) => ({ x: s.ustunX + Math.sign(s.x - s.ustunX) * STRELA.uzunlik / 2, z: s.z, burchak: Math.PI / 2, uzunlik: STRELA.uzunlik, eni: 0.12 });

/** Marshrut bo'yicha ikkala shlagbaumni simulyatsiya qiladi: [t, holat, {kirish, chiqish}: {nishon, ulush}]. */
function shlagbaumSimulyatsiyasi(marshrut, toxtashKirish, toxtashChiqish, bosqich) {
  const h = yangiHolat();
  const ulush = { kirish: 0, chiqish: 0 };
  const natija = [];
  for (let t = 0; t <= marshrut.davom + 2; t += QADAM) {
    marshrutHolati(marshrut, t, h);
    const toxtash = bosqich === 'kelmoqda' ? toxtashKirish : toxtashChiqish;
    const m = [{ x: h.p.x, z: h.p.z, burchak: h.burchak, t, toxtash }];
    const qadam = {};
    for (const nom of ['kirish', 'chiqish']) {
      const nishon = shlagbaumOchiqmi(m, SHLAGBAUMLAR[nom]);
      ulush[nom] = strelaQadami(ulush[nom], nishon, QADAM);
      qadam[nom] = { nishon, ulush: ulush[nom] };
    }
    natija.push({ t, h: { p: h.p.clone(), burchak: h.burchak }, ...qadam });
  }
  return natija;
}

test('shlagbaum: kirishda mashina to\'xtab kutadi, kutish tugashidan oldin strela ko\'tariladi, o\'tib ketgach yopiladi', () => {
  for (const rampa of RAMPA_RAQAMLARI) {
    const [a, b] = SHLAGBAUM_VAQTLARI[rampa].kirish;
    const sim = shlagbaumSimulyatsiyasi(MARSHRUTLAR[rampa].kelish, [a, b], [0, 0], 'kelmoqda');
    for (const q of sim) {
      // Kutishning boshida (to'xtab turibdi) strela yopiq.
      if (q.t >= a && q.t < b - SHLAGBAUM_OLDIN - 0.05) assert.equal(q.kirish.nishon, false, `${rampa}-rampa: ${q.t.toFixed(2)} s da kirish ochilmasligi kerak`);
      // Strela tekisligini kesib o'tayotganda — deyarli tik ko'tarilgan.
      if (tortburchakKesishadimi(mashinaIzi(q.h), strelaIzi(SHLAGBAUMLAR.kirish))) {
        assert.ok(strelaBurchagi(q.kirish.ulush) > 1.35, `${rampa}-rampa: ${q.t.toFixed(2)} s da strela mashinaga tegadi (${strelaBurchagi(q.kirish.ulush).toFixed(2)} rad)`);
      }
      // Kelayotgan mashina chiqish shlagbaumini ochmaydi.
      assert.equal(q.chiqish.nishon, false);
    }
    // Kutish tugaganda strela to'liq ochiq, marshrut oxirida yopiq.
    const oxiri = sim.find((q) => q.t >= b);
    assert.ok(oxiri.kirish.ulush > 0.95, `${rampa}-rampa: kutish tugaganda strela ochilmagan (${oxiri.kirish.ulush.toFixed(2)})`);
    assert.equal(sim.at(-1).kirish.nishon, false);
    assert.equal(sim.at(-1).kirish.ulush, 0);
  }
});

test('shlagbaum: chiqishda ham xuddi shunday (kirish shlagbaumi ochilmaydi)', () => {
  for (const rampa of RAMPA_RAQAMLARI) {
    const [a, b] = SHLAGBAUM_VAQTLARI[rampa].chiqish;
    const sim = shlagbaumSimulyatsiyasi(MARSHRUTLAR[rampa].ketish, [0, 0], [a, b], 'ketmoqda');
    for (const q of sim) {
      if (q.t >= a && q.t < b - SHLAGBAUM_OLDIN - 0.05) assert.equal(q.chiqish.nishon, false);
      if (tortburchakKesishadimi(mashinaIzi(q.h), strelaIzi(SHLAGBAUMLAR.chiqish))) {
        assert.ok(strelaBurchagi(q.chiqish.ulush) > 1.35, `${rampa}-rampa: ${q.t.toFixed(2)} s da chiqish strelasi mashinaga tegadi`);
      }
      assert.equal(q.kirish.nishon, false);
    }
    assert.ok(sim.find((q) => q.t >= b).chiqish.ulush > 0.95);
    assert.equal(sim.at(-1).chiqish.ulush, 0);
  }
});

test('shlagbaum: boshqa qatordagi, teskari yo\'nalishdagi yoki uzoqdagi mashina strelani ochmaydi; strela navesga tegmaydi', () => {
  const s = SHLAGBAUMLAR.kirish;
  const toxtash = [10, 12];
  const yaqin = { x: s.x, z: s.z + YUK.yarimUzunlik + 0.7, burchak: Math.PI, t: 11, toxtash };
  assert.equal(shlagbaumOchiqmi([yaqin], s), true);
  assert.equal(shlagbaumOchiqmi([{ ...yaqin, x: SHLAGBAUMLAR.chiqish.x }], s), false, 'boshqa qator');
  assert.equal(shlagbaumOchiqmi([{ ...yaqin, burchak: 0 }], s), false, 'teskari yo\'nalish');
  assert.equal(shlagbaumOchiqmi([{ ...yaqin, z: s.z + 20 }], s), false, 'uzoqda');
  assert.equal(shlagbaumOchiqmi([{ ...yaqin, t: 9 }], s), false, 'kutish hali tugamagan');
  assert.equal(shlagbaumOchiqmi([], s), false);
  // KPP navesi ostki tekisligi 5.4 m: tik strela uchi undan past; yopiq strela qator markazidan mashina chetigacha yopadi.
  assert.ok(STRELA.oqBalandligi + STRELA.uzunlik < 5.35);
  for (const t of Object.values(SHLAGBAUMLAR)) assert.ok(STRELA.uzunlik >= Math.abs(t.x - t.ustunX) + YUK_MASHINASI.eni / 2 + 0.2);
  // Strela harakati: ~1.3 s da to'liq ochiladi, burchagi 0…ochiqBurchak.
  let u = 0;
  for (let i = 0; i < 30; i++) u = strelaQadami(u, true, 0.05);
  assert.equal(u, 1);
  assert.ok(Math.abs(strelaBurchagi(1) - STRELA.ochiqBurchak) < 1e-9 && strelaBurchagi(0) === 0);
});

test('yuk mashinasi: o\'lchamlar, ko\'rinish, eshiklar rampaga kirishdan oldin ochiladi, paletlar', () => {
  assert.equal(YUK.yarimUzunlik * 2, YUK_MASHINASI.uzunlik);
  assert.equal(YUK.kuzov.orqa, -YUK.yarimUzunlik);
  assert.ok(YUK.kabina.old <= YUK.yarimUzunlik && YUK.kabina.yarimEni <= YUK.yarimEni);
  // Orqadagi juft g'ildiraklar kuzov enidan chiqmaydi (tashqi g'ildirak markazi 1.1, eni 0.28).
  assert.ok(1.1 + 0.14 <= YUK.yarimEni);
  assert.equal(reysKorinishi(1, 'jonatish').kuzov, 'furgon');
  assert.equal(reysKorinishi(3, 'qabul').kuzov, 'tent');
  assert.equal(KUTAYOTGAN_MASHINALAR.length, KUTISH_JOYLARI.length);
  KUTAYOTGAN_MASHINALAR.forEach((k, i) => assert.deepEqual([k.x, k.z], [KUTISH_JOYLARI[i].x, KUTISH_JOYLARI[i].z]));
  assert.equal(new Set(KUTAYOTGAN_MASHINALAR.map((k) => k.kuzov)).size, 2, 'turli kuzovlar');
  const h = yangiHolat();
  for (const rampa of RAMPA_RAQAMLARI) {
    const t0 = orqagaBoshlanishi(rampa) - 0.6;
    assert.equal(eshikOchiqmi(rampa, 'kelmoqda', 0), false);
    assert.equal(eshikOchiqmi(rampa, 'kelmoqda', t0 + 0.01), true);
    assert.equal(eshikOchiqmi(rampa, 'rampada', 5), true);
    assert.equal(eshikOchiqmi(rampa, 'ketmoqda', 5), false);
    // Eshiklar ochila boshlaganda mashina orqasi rampa devoridan ≥ 6 m uzoqda (eshik 270° aylanib ochiladi).
    marshrutHolati(MARSHRUTLAR[rampa].kelish, t0, h);
    const orqa = { x: h.p.x - Math.sin(h.burchak) * YUK.yarimUzunlik, z: h.p.z - Math.cos(h.burchak) * YUK.yarimUzunlik };
    const devor = RAMPALAR[rampa];
    const masofa = devor.devor === 'old' ? orqa.z - devor.z : devor.x - orqa.x;
    assert.ok(masofa >= 6, `${rampa}-rampa: eshik ochilganda orqasi devordan ${masofa.toFixed(2)} m`);
    // Marshrut oxiri — rampadagi joy.
    marshrutHolati(MARSHRUTLAR[rampa].kelish, MARSHRUTLAR[rampa].kelish.davom, h);
    assert.ok(Math.hypot(h.p.x - RAMPA_HOLATI[rampa].x, h.p.z - RAMPA_HOLATI[rampa].z) < 0.05);
  }
  const reys = { yonalish: 'jonatish', bosqich: 'rampada', palet: 4, jamiPalet: 6 };
  assert.equal(kuzovdagiPalet(reys), 4);
  assert.equal(kuzovdagiPalet({ ...reys, bosqich: 'ketmoqda' }), 6);
  assert.equal(kuzovdagiPalet({ ...reys, bosqich: 'kelmoqda' }), 0);
  assert.equal(kuzovdagiPalet({ ...reys, yonalish: 'qabul', bosqich: 'kelmoqda' }), 6);
  assert.equal(kuzovdagiPalet({ ...reys, yonalish: 'qabul' }), 2);
  assert.equal(kuzovdagiPalet({ ...reys, yonalish: 'qabul', bosqich: 'ketmoqda' }), 0);
});

// ── Tashqi avtoturargoh ──

const turganIzi = (a) => ({ x: a.x, z: a.z, burchak: a.burchak, ...AVTOMOBIL_OLCHAMI[a.tur] });

test('turargoh: band joylar — takrorlanmaydi, qatnovchilar joyi bo\'sh, ~70 % to\'la, avtomobil joyiga va asfaltga sig\'adi', () => {
  assert.equal(JOY_SONI, 15);
  const kalitlar = TURGAN_AVTOMOBILLAR.map((a) => `${a.qator}:${a.j}`);
  assert.equal(new Set(kalitlar).size, kalitlar.length);
  for (const q of QATNOVCHI_JOYLARI) assert.ok(!kalitlar.includes(`${q.qator}:${q.j}`), 'qatnovchi joyi band');
  const tola = (TURGAN_AVTOMOBILLAR.length + QATNOVCHI_JOYLARI.length) / (JOY_SONI * 2);
  assert.ok(tola >= 0.6 && tola <= 0.85, `to'lalik ${(tola * 100).toFixed(0)} %`);
  for (const a of [...TURGAN_AVTOMOBILLAR, ...QATNOVCHI_JOYLARI.map((q, k) => ({ ...q, tur: QATNOVCHI_TURLARI[k] }))]) {
    const o = AVTOMOBIL_OLCHAMI[a.tur];
    assert.ok(o.eni <= TASHQI_TURARGOH.qadam - 0.5, 'joy eniga sig\'adi');
    // Panjara tomondagi asfalt cheti (z0 − 0.3) va ko'cha tomondagi (z1 + 0.3) ichida.
    assert.ok(a.z - o.uzunlik / 2 >= TASHQI_TURARGOH.z0 - 0.3 && a.z + o.uzunlik / 2 <= TASHQI_TURARGOH.z1 + 0.3, `${a.qator}:${a.j}`);
    assert.ok(a.x - o.eni / 2 > TASHQI_TURARGOH.x0 && a.x + o.eni / 2 < TASHQI_TURARGOH.x1);
  }
  // Joy chiziqlari bilan mos: 1-joy markazi x0 + 1.5·qadam, qatorlar oldi panjaraga / ko'chaga qaragan.
  assert.equal(turargohJoyi(0, 0).x, TASHQI_TURARGOH.x0 + 1.5 * TASHQI_TURARGOH.qadam);
  assert.equal(turargohJoyi(0, 0).burchak, Math.PI);
  assert.equal(turargohJoyi(1, 0).burchak, 0);
  // Yo'lakda qatnovchi (eng keng) uchun joy qoladi: ikki qatordagi eng uzun avtomobillar orasi.
  const engUzun = Math.max(...Object.values(AVTOMOBIL_OLCHAMI).map((o) => o.uzunlik));
  const yolak = (turargohJoyi(1, 0).z - engUzun / 2) - (turargohJoyi(0, 0).z + engUzun / 2);
  assert.ok(yolak >= Math.max(...QATNOVCHI_TURLARI.map((t) => AVTOMOBIL_OLCHAMI[t].eni)) + 0.25, `yo'lak ${yolak.toFixed(2)} m`);
});

const MARSHRUTLAR_Q = QATNOVCHI_JOYLARI.map(qatnovchiMarshrutlari);
const DAVOMLAR = MARSHRUTLAR_Q.map((m) => ({ kelish: m.kelish.davom, ketish: m.ketish.davom }));

test('qatnovchilar: marshrut ko\'chadan boshlanib joyga aniq kiradi, chiqishda ko\'chaga qaytadi; bosqichlar davrni to\'liq qoplaydi', () => {
  const h = yangiHolat();
  QATNOVCHI_JOYLARI.forEach((joy, k) => {
    const m = MARSHRUTLAR_Q[k];
    marshrutHolati(m.kelish, 0, h);
    assert.ok(kochadami(h.p.z) && h.p.x > 100 && Math.abs(h.p.z - KOCHA_QATORLARI[0].z) < 0.01);
    marshrutHolati(m.kelish, m.kelish.davom, h);
    assert.ok(Math.hypot(h.p.x - joy.x, h.p.z - joy.z) < 0.05, `${k}: joyga yetmadi`);
    assert.ok(Math.abs(Math.cos(h.burchak - joy.burchak) - 1) < 0.02, `${k}: joyda qiyshiq (${h.burchak.toFixed(2)})`);
    marshrutHolati(m.ketish, 0, h);
    assert.ok(Math.hypot(h.p.x - joy.x, h.p.z - joy.z) < 0.05);
    marshrutHolati(m.ketish, m.ketish.davom, h);
    assert.ok(h.p.x < -100 && kochadami(h.p.z));
    // Kirish x 62 (ko'chadan), chiqish x 14 (ko'chaga) orqali.
    let kirdi = false;
    let chiqdi = false;
    for (let t = 0; t < m.kelish.davom; t += 0.1) { marshrutHolati(m.kelish, t, h); if (Math.abs(h.p.z - 62.5) < 0.6) kirdi ||= Math.abs(h.p.x - QATNOV.kirishX) < 0.6; }
    for (let t = 0; t < m.ketish.davom; t += 0.1) { marshrutHolati(m.ketish, t, h); if (Math.abs(h.p.z - 62.5) < 0.6) chiqdi ||= Math.abs(h.p.x - QATNOV.chiqishX) < 0.6; }
    assert.ok(kirdi && chiqdi, `${k}: kirish/chiqish yo'li`);
    // Bosqichlar: davr ichida har bosqich bor va ketma-ket.
    const korilgan = new Set();
    for (let s = 0; s < QATNOV.davr; s += 0.5) korilgan.add(qatnovBosqichi(k, s, DAVOMLAR[k]).bosqich);
    assert.deepEqual([...korilgan].sort(), ['kelmoqda', 'ketmoqda', 'turibdi', 'yoq']);
  });
  assert.ok(Math.abs(YOLAK_Z - 55.75) < 1e-9);
});

/** Qatnovchining `soniya` dagi holati (kelishi `kechikish` s ga kechikkan bo'lishi mumkin): {iz, harakatda (turargohda)} yoki null. */
function qatnovchiHolati(k, soniya, kechikish = 0) {
  const m = MARSHRUTLAR_Q[k];
  const b = qatnovBosqichi(k, soniya, DAVOMLAR[k]);
  const o = AVTOMOBIL_OLCHAMI[QATNOVCHI_TURLARI[k]];
  const joy = QATNOVCHI_JOYLARI[k];
  if (b.bosqich === 'yoq') return null;
  let marshrut = m.kelish;
  let t = b.t;
  if (b.bosqich === 'ketmoqda') marshrut = m.ketish;
  else t = (b.bosqich === 'kelmoqda' ? b.t : m.kelish.davom + b.t) - kechikish;
  if (marshrut === m.ketish && t > m.ketish.davom) return null;
  if (marshrut === m.kelish && t >= m.kelish.davom) return { iz: { x: joy.x, z: joy.z, burchak: joy.burchak, ...o }, harakatda: false, kochada: false };
  const h = yangiHolat();
  marshrutHolati(marshrut, Math.max(0, t), h);
  return { iz: { x: h.p.x, z: h.p.z, burchak: h.burchak, ...o }, harakatda: !kochadami(h.p.z), kochada: kochadami(h.p.z) };
}

test('qatnovchilar: turargohda bir vaqtda faqat bittasi harakatlanadi (kechikish bilan ham), hech kimga tegmaydi', () => {
  for (const kechikish of [0, QATNOV_KECHIKISH_CHEGARASI]) {
    for (let s = 0; s < QATNOV.davr; s += 0.1) {
      const holatlar = QATNOVCHI_JOYLARI.map((_, k) => qatnovchiHolati(k, s, kechikish));
      const harakatda = holatlar.filter((x) => x?.harakatda);
      assert.ok(harakatda.length <= 1, `${s.toFixed(1)} s: turargohda ${harakatda.length} ta qatnovchi harakatda`);
      for (const [k, x] of holatlar.entries()) {
        if (!x || x.kochada) continue;
        const kichik = { ...x.iz, uzunlik: x.iz.uzunlik - 0.02, eni: x.iz.eni - 0.02 };
        for (const a of TURGAN_AVTOMOBILLAR) assert.ok(!tortburchakKesishadimi(kichik, turganIzi(a)), `${s.toFixed(1)} s: ${k}-qatnovchi ${a.qator}:${a.j} ga tegdi`);
        for (const [j, y] of holatlar.entries()) {
          if (j <= k || !y || y.kochada) continue;
          assert.ok(!tortburchakKesishadimi(kichik, y.iz), `${s.toFixed(1)} s: ${k} va ${j} qatnovchilar`);
        }
      }
    }
  }
});

test('ko\'cha: ~20 ta avtomobil to\'rt qatorda, boshlang\'ich oraliq yetarli; oldindagi to\'siqgacha masofa', () => {
  assert.ok(TRAFIK.length >= 18 && TRAFIK.length <= 24);
  for (let q = 0; q < KOCHA_QATORLARI.length; q++) {
    const xlar = TRAFIK.filter((a) => a.qator === q).map((a) => a.x0).sort((a, b) => a - b);
    assert.ok(xlar.length >= 3);
    for (let i = 0; i < xlar.length; i++) {
      const keyingi = i + 1 < xlar.length ? xlar[i + 1] : xlar[0] + KOCHA_CHEGARASI * 2;
      assert.ok(keyingi - xlar[i] > 12, `qator ${q}: avtomobillar juda yaqin`);
    }
  }
  for (const a of TRAFIK) assert.ok(a.tezlik >= 8 && a.tezlik <= 14 && AVTOMOBIL_TURLARI.includes(a.tur));
  const obyekt = (x, z) => ({ x, z, burchak: -Math.PI / 2, yarimUzunlik: 2 });
  // −x ga harakat: oldinda (kichik x) turgani hisoblanadi, orqadagisi va boshqa qatordagisi — yo'q.
  assert.equal(oldindagiMasofa(50, 66, -1, 2, [obyekt(40, 66)]), 6);
  assert.equal(oldindagiMasofa(50, 66, -1, 2, [obyekt(60, 66)]), Infinity);
  assert.equal(oldindagiMasofa(50, 66, -1, 2, [obyekt(40, 70)]), Infinity);
  assert.equal(oldindagiMasofa(50, 70, 1, 2, [obyekt(58, 70)]), 4);
});

test('avtobus: bekatda eshigi bekatga to\'g\'ri keladi; yuk mashinasi o\'tadigan paytda to\'xtamaydi', () => {
  assert.equal(AVTOBUS_TOXTASH_X - AVTOBUS.eshikOldinda, AVTOBUS_BEKATI.x);
  assert.ok(AVTOBUS.boshX > 150 && AVTOBUS.oxiriX < -150 && AVTOBUS.kutish >= 5);
  // Har rampadan ketish marshruti bekat yonidan o'tadi (ko'chaga o'ngga burilib −x ga).
  for (const rampa of RAMPA_RAQAMLARI) {
    const w = BEKAT_OYNALARI[rampa];
    assert.ok(w && w[0] > 0 && w[1] > w[0] && w[1] <= MARSHRUTLAR[rampa].ketish.davom, `${rampa}: ${w}`);
  }
  assert.equal(avtobusToxtaydimi([100, 115], []), true);
  assert.equal(avtobusToxtaydimi([100, 115], [[60, 70], [130, 140]]), true);
  assert.equal(avtobusToxtaydimi([100, 115], [[110, 120]]), false);
  assert.equal(avtobusToxtaydimi([100, 115], [[90, 98]]), false, 'zaxira (3 s) ichida');
  assert.equal(avtobusToxtaydimi([100, 115], [[116, 125]], 0), true);
});

test('GLB avtomobillar: kuzov / oyna / qolgan qismlar ajratiladi, 4 ta g\'ildirak markazga keltiriladi, o\'lchamlar to\'g\'ri', async () => {
  for (const tur of AVTOMOBIL_TURLARI) {
    const buf = fs.readFileSync(new URL(`../public/models/demo3d/mashinalar/${tur}.glb`, import.meta.url));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
    const md = glbAvtomobili(gltf.scene);
    for (const g of [md.kuzov, md.oyna, md.qolgan, md.goldirak]) assert.ok(g.getAttribute('position').count > 0);
    assert.ok(md.qolgan.getAttribute('color') && md.goldirak.getAttribute('color'), 'vertex ranglari');
    assert.equal(md.kuzov.getAttribute('color'), undefined, 'kuzov rangi instanceColor dan');
    md.goldirak.computeBoundingBox();
    const c = md.goldirak.boundingBox.getCenter(md.goldirak.boundingBox.min.clone());
    assert.ok(c.length() < 0.01, `${tur}: g'ildirak markazda emas`);
    assert.equal(md.goldiraklar.length, 4);
    assert.equal(md.goldiraklar.filter((g) => g.chap).length, 2);
    for (const g of md.goldiraklar) {
      assert.ok(Math.abs(g.y - md.radius) < 0.06, `${tur}: g'ildirak yerda`);
      assert.equal(g.chap, g.x > 0);
    }
    assert.ok(md.goldiraklar[0].z > 0 && md.goldiraklar[2].z < 0, 'oldi +z');
    md.kuzov.computeBoundingBox();
    const b = md.kuzov.boundingBox;
    assert.ok(Math.abs(b.max.z - b.min.z - AVTOMOBIL_OLCHAMI[tur].uzunlik) < 0.06, `${tur}: uzunlik`);
    assert.ok(Math.abs(b.max.x - b.min.x - AVTOMOBIL_OLCHAMI[tur].eni) < 0.06, `${tur}: eni`);
  }
});

/** Izohlarsiz manba (satr va blok izohlari olib tashlanadi; satrlar ichidagi "//" saqlanadi — oddiy yondashuv yetarli). */
const izohsiz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`])\/\/.*$/gm, '$1');

test('manba: havolasiz, brend nomisiz (faqat izohda "KAMAZ-uslubidagi"), GLB o\'z Suspense\'ida, ulanish', () => {
  const fayllar = ['src/Pages/Demo3DSex/Transport.tsx', 'src/Pages/Demo3DSex/Avtomobillar.tsx', 'src/Pages/Demo3DSex/avtomobilModellari.ts'];
  for (const f of fayllar) {
    const s = manba(f);
    assert.ok(!/https?:\/\//.test(s), `${f}: tashqi havola`);
    assert.ok(!/kamaz|камаз/i.test(izohsiz(s)), `${f}: brend nomi kodda (faqat izohda bo'lishi mumkin)`);
  }
  const transport = manba(fayllar[0]);
  const avto = manba(fayllar[1]);
  assert.match(transport, /export default function Logistika\(\{ m, sm, reyslar, yorliq \}/);
  assert.ok(!/demoManbasi/.test(transport), 'transport demo dvigateliga bog\'lanmagan');
  assert.equal((transport.match(/<RampaPogruzchigi /g) ?? []).length, 4);
  assert.equal((transport.match(/<Shlagbaum /g) ?? []).length, 2);
  assert.match(transport, /<RolikDarvoza [^>]*rampa=\{3\}/);
  assert.match(transport, /<RolikDarvoza [^>]*rampa=\{4\}/);
  assert.match(transport, /kiyim="qorovul"/);
  assert.match(transport, /kiyim="haydovchi"/);
  assert.match(transport, /<Avtomobillar reestr=\{reestr\} \/>/);
  // GLB: faqat public/models/demo3d dan, BASE_URL bilan, Draco'siz (tashqi dekoder yuklanmaydi), o'z Suspense chegarasida.
  assert.match(avto, /import\.meta\.env\.BASE_URL\}models\/demo3d\/mashinalar\//);
  assert.match(avto, /useGLTF\(GLB_YOLLARI, false, false\)/);
  assert.match(avto, /<Suspense fallback=\{null\}>\s*<GlbAvtomobillar/);
  assert.ok(!/import\.meta/.test(manba(fayllar[2])), 'sof modul node\'da ishlaydi');
});
