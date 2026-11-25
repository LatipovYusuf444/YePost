// 3D Demo — 2-sex (avtomatlashtirilgan prolyot): reja (jihozlar 2-sex ichida, ustma-ust tushmaydi), robotlar (kinematika, silliq harakat,
// detal uzatish), detal oqimi (konveyerlarda to'qnashmaydi), portal/CNC sinxroni, AGV yo'li (faqat 2-sex va ochiqlar orqali), manba qoidalari.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AVTO_SEX, ORQA_OCHIQLAR } from '../src/Pages/Demo3DSex/hudud.ts';
import { ORQA_OCHIQ_YOLAKLARI, OCHIQ_ROMI, SIKLON_TRUBASI } from '../src/Pages/Demo3DSex/sexBinosi.ts';
import {
  AGV, AGV_BEKATLAR, AGV_SONI, AVTO_FERMA_X, AVTO_USTUN_KESIMI, BAND_JOYLAR, BOSHQARUV_XONASI, BURGILASH_STANOGI, CNC, CNC_QATORLARI, DETAL,
  ICHKI, KONVEYERLAR, KONVEYER_Y, KROMKA_STANOGI, NUR_PARDALARI, ODAM_YOLLARI, OMBOR, PIYODA_YOLAGI, PLITA, PORTAL, PORTAL_YARIM, QOYISH,
  ROBOT, ROBOTLAR, TAKT, TAXLAMLAR, TOSIQLAR, TURGAN_ODAMLAR, USHLASH, YOSH, agvHolati, agvJadvali, avtoUstunlar, burchakFarqi, cncHolati,
  detalJoyi, detallarHolati, ichida, jihozlar, kesishadi, paletQatlamlari, portalHolati, robotFK, robotHolati, robotIK, robotNuqtalari,
  roliklar, tb, tugilish,
} from '../src/Pages/Demo3DSex/avtoSexRejasi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const komp = manba('src/Pages/Demo3DSex/AvtoSex.tsx');
const reja = manba('src/Pages/Demo3DSex/avtoSexRejasi.ts');
const juftlar = (r, fn) => { for (let i = 0; i < r.length; i++) for (let k = i + 1; k < r.length; k++) fn(r[i], r[k], i, k); };
const masofa = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const kengaytir = (t, d) => tb(t.x0 - d, t.x1 + d, t.z0 - d, t.z1 + d);
const nuqtaIchida = (x, z, t) => x > t.x0 && x < t.x1 && z > t.z0 && z < t.z1;
const USTUNLAR = avtoUstunlar().map((u) => ({ nom: `ustun ${u.x},${u.z}`, t: tb(u.x - AVTO_USTUN_KESIMI / 2, u.x + AVTO_USTUN_KESIMI / 2, u.z - AVTO_USTUN_KESIMI / 2, u.z + AVTO_USTUN_KESIMI / 2) }));

test('reja: hamma jihoz, konveyer, to‘siq va yo‘lak 2-sex ichida; asosiy sexga o‘tish ochiqlari hudud.ts bilan bir xil', () => {
  assert.deepEqual(ICHKI, tb(AVTO_SEX.x0 + 0.15, AVTO_SEX.x1 - 0.15, AVTO_SEX.z0 + 0.15, AVTO_SEX.z1 - 0.15));
  const hammasi = [...jihozlar(), ...KONVEYERLAR.map((k) => ({ nom: k.id, t: k.t })), ...TOSIQLAR.map((s) => ({ nom: `to‘siq ${s.id}`, t: s.t })),
    { nom: 'ombor', t: OMBOR }, ...PIYODA_YOLAGI.map((t, i) => ({ nom: `yo‘lak ${i}`, t })), ...USTUNLAR];
  for (const j of hammasi) {
    assert.ok(j.t.x0 < j.t.x1 && j.t.z0 < j.t.z1, `${j.nom}: to‘rtburchak to‘g‘ri`);
    assert.ok(ichida(j.t, ICHKI) || j.nom.startsWith('ustun'), `${j.nom} 2-sex ichida`);
  }
  // Ustunlar ochiqlarda emas (ochiq + rom ichida ustun yo'q)
  for (const u of USTUNLAR) for (const o of ORQA_OCHIQLAR) assert.ok(u.t.x1 <= o.x - o.eni / 2 || u.t.x0 >= o.x + o.eni / 2, `${u.nom} ochiqda`);
  assert.ok(AVTO_FERMA_X.every((x) => !ORQA_OCHIQLAR.some((o) => Math.abs(x - o.x) < o.eni / 2 + 0.2)));
  // Siklon trubasi va favqulodda chiqish eshiklari oldi bo'sh
  assert.ok(BAND_JOYLAR.some((b) => nuqtaIchida(SIKLON_TRUBASI.x, SIKLON_TRUBASI.z, b.t)));
});

test('reja: jihozlar, konveyerlar va ustunlar bir-biriga tegmaydi; to‘siqlar faqat yorug‘lik pardasi joyida konveyer bilan kesishadi', () => {
  const j = jihozlar();
  juftlar(j, (a, b) => assert.equal(kesishadi(a.t, b.t), false, `${a.nom} ↔ ${b.nom}`));
  const k = KONVEYERLAR;
  juftlar(k, (a, b) => assert.equal(kesishadi(a.t, b.t), false, `${a.id} ↔ ${b.id}`));
  for (const a of k) for (const b of j) assert.equal(kesishadi(a.t, b.t), false, `${a.id} ↔ ${b.nom}`);
  for (const u of USTUNLAR) for (const b of [...j, ...k.map((x) => ({ nom: x.id, t: x.t })), ...TOSIQLAR.map((s) => ({ nom: s.id, t: s.t }))]) assert.equal(kesishadi(u.t, b.t), false, `${u.nom} ↔ ${b.nom}`);
  for (const b of j) for (const band of BAND_JOYLAR) assert.equal(kesishadi(b.t, band.t), false, `${b.nom} ${band.nom} joyida`);
  juftlar(TOSIQLAR, (a, b) => assert.equal(kesishadi(a.t, b.t, 0.3), false, `to‘siqlar ${a.id}/${b.id}`));
  for (const s of TOSIQLAR) {
    // Jihoz to'siq ichida yoki tashqarisida — chizig'ini kesib o'tmaydi
    for (const b of j) assert.ok(!kesishadi(s.t, b.t) || ichida(b.t, s.t), `${b.nom} ${s.id} to‘sig‘ini kesadi`);
    // Konveyer to'siq tomonini kesib o'tsa — o'sha joyda yorug'lik pardasi bor
    const tomonlar = [['x0', 'x', s.t.x0], ['x1', 'x', s.t.x1], ['z0', 'z', s.t.z0], ['z1', 'z', s.t.z1]];
    for (const kv of k) {
      for (const [yon, oq, chiziq] of tomonlar) {
        const [a0, a1, b0, b1, c0, c1] = oq === 'x' ? [kv.t.x0, kv.t.x1, kv.t.z0, kv.t.z1, s.t.z0, s.t.z1] : [kv.t.z0, kv.t.z1, kv.t.x0, kv.t.x1, s.t.x0, s.t.x1];
        if (!(a0 < chiziq && a1 > chiziq)) continue;
        const u0 = Math.max(b0, c0);
        const u1 = Math.min(b1, c1);
        if (u1 <= u0) continue;
        assert.ok(NUR_PARDALARI.some((n) => n.tosiq === s.id && n.yon === yon && n.u - n.eni / 2 <= u0 + 1e-9 && n.u + n.eni / 2 >= u1 - 1e-9), `${kv.id} ${s.id}.${yon} dan pardasiz o‘tadi`);
      }
    }
    // Robot o'z to'sig'i ichida
    const r = ROBOTLAR.find((x) => x.id === s.id);
    assert.ok(r && nuqtaIchida(r.asos[0], r.asos[1], kengaytir(s.t, -0.8)), `${s.id} roboti to‘siq ichida`);
  }
  assert.ok(ROBOTLAR.length >= 3);
  assert.deepEqual(ROBOTLAR.map((r) => r.vazifa), ['saralash', 'kromkaga', 'paletlash']);
});

test('robotlar: teskari kinematika aniq (FK∘IK = nuqta), olish/qo‘yish yetish masofasida, harakat silliq va detal aynan nuqtada ushlanadi', () => {
  for (const r of ROBOTLAR) {
    for (let n = -2; n < 26; n++) {
      const { olish, qoyish } = robotNuqtalari(r, n);
      for (const p of [olish, qoyish, [olish[0], olish[1] + 0.45, olish[2]], [qoyish[0], qoyish[1] + 0.45, qoyish[2]]]) {
        const q = robotIK(r.asos, p);
        assert.ok(masofa(robotFK(r.asos, q), p) < 1e-6, `${r.id} n=${n}: ${p} ga yetmaydi`);
        assert.ok(Math.abs(q.q2 + q.q3 + q.q5 - Math.PI) < 1e-9, 'asbob pastga qaragan');
      }
    }
    let oldingi = robotHolati(r, 0);
    for (let t = 0.02; t < 3 * 2 * TAKT; t += 0.02) {
      const h = robotHolati(r, t);
      assert.ok(Math.abs(burchakFarqi(oldingi.q1, h.q1)) < 0.12, `${r.id}: asos sakramaydi (t=${t.toFixed(2)})`);
      for (const k of ['q2', 'q3', 'q5']) assert.ok(Math.abs(h[k] - oldingi[k]) < 0.12, `${r.id}: ${k} sakramaydi (t=${t.toFixed(2)})`);
      assert.ok(robotFK(r.asos, h)[1] > 0.15, `${r.id}: asbob polga tushmaydi`);
      oldingi = h;
    }
    // Ushlash va qo'yish paytida asbob uchi aynan nuqtada
    for (let n = 0; n < 6; n++) {
      const { olish, qoyish } = robotNuqtalari(r, n);
      const t0 = r.faza + n * TAKT;
      assert.ok(masofa(robotFK(r.asos, robotHolati(r, t0 + USHLASH)), olish) < 1e-6, `${r.id} olish`);
      assert.ok(masofa(robotFK(r.asos, robotHolati(r, t0 + QOYISH - 0.001)), qoyish) < 1e-6, `${r.id} qo‘yish`);
      assert.equal(robotHolati(r, t0 + USHLASH + 0.01).ushlagan, true);
      assert.equal(robotHolati(r, t0 + QOYISH + 0.01).ushlagan, false);
    }
  }
});

test('detal oqimi: robotlar konveyer uchidan oladi, detallar to‘qnashmaydi, konveyer/stanok ustida yuradi, paletga taxlanadi', () => {
  const [r1, r2, r3] = ROBOTLAR;
  // R1 qo'ygan joy — C1 boshi; R2 ushlagan paytda detal C1 oxirida turibdi; R3 — C3 oxirida
  assert.ok(masofa(detalJoyi(0), [robotNuqtalari(r1, 0).qoyish[0], KONVEYER_Y + DETAL.qalinlik / 2, robotNuqtalari(r1, 0).qoyish[2]]) < 1e-9);
  for (let k = 0; k < 5; k++) {
    const g2 = tugilish(k) + YOSH.r2Ushlash;
    const h2 = robotHolati(r2, g2 + 0.001);
    assert.equal(h2.k, k, 'R2 aynan shu detalni ushlaydi');
    const oldin = detalJoyi(YOSH.r2Ushlash - 0.01);
    const uch = robotFK(r2.asos, robotHolati(r2, g2));
    assert.ok(Math.hypot(oldin[0] - uch[0], oldin[2] - uch[2]) < 1e-6, 'R2 detal ustida');
    const g3 = tugilish(k) + YOSH.r3Ushlash;
    assert.equal(robotHolati(r3, g3 + 0.001).k, k, 'R3 aynan shu detalni ushlaydi');
    const oldin3 = detalJoyi(YOSH.r3Ushlash - 0.01);
    const uch3 = robotFK(r3.asos, robotHolati(r3, g3));
    assert.ok(Math.hypot(oldin3[0] - uch3[0], oldin3[2] - uch3[2]) < 1e-6, 'R3 detal ustida');
    assert.equal(robotHolati(r1, tugilish(k) - 0.5).k, k, 'R1 shu detalni olib kelyapti');
  }
  const ustida = (x, z) => [...KONVEYERLAR.map((k) => k.t), KROMKA_STANOGI, BURGILASH_STANOGI].some((t) => x >= t.x0 - 1e-9 && x <= t.x1 + 1e-9 && z >= t.z0 - 1e-9 && z <= t.z1 + 1e-9);
  for (let t = 0; t < 240; t += 0.1) {
    const d = detallarHolati(t);
    for (const { p } of d) assert.ok(ustida(p[0], p[2]), `detal (${p[0].toFixed(2)}, ${p[2].toFixed(2)}) konveyerda`);
    juftlar(d, (a, b) => {
      const ta = tb(a.p[0] - DETAL.uzunlik / 2, a.p[0] + DETAL.uzunlik / 2, a.p[2] - DETAL.eni / 2, a.p[2] + DETAL.eni / 2);
      const tbb = tb(b.p[0] - DETAL.uzunlik / 2, b.p[0] + DETAL.uzunlik / 2, b.p[2] - DETAL.eni / 2, b.p[2] + DETAL.eni / 2);
      assert.equal(kesishadi(ta, tbb, 0.1), false, `detallar ${a.k}/${b.k} to‘qnashadi (t=${t.toFixed(1)})`);
    });
  }
  assert.ok(detallarHolati(300).length >= 10, 'liniyada detallar ko‘p');
  const q = paletQatlamlari(200);
  assert.ok(q.every((n) => n >= 1 && n <= 12));
});

test('portal va CNC: plita taxlamdan olinib CNC kirish stoliga qo‘yiladi, CNC uni keyin ichkariga oladi; harakat chegaralarda', () => {
  const tepalar = TAXLAMLAR.map((s) => s.tepa);
  let oldingiYuk = portalHolati(0).yuk;
  const qoyishlar = [];
  for (let t = 0; t < 4 * PORTAL_YARIM; t += 0.01) {
    const h = portalHolati(t);
    assert.ok(h.x >= PORTAL.relsX0 && h.x <= PORTAL.relsX1, 'ko‘prik relslarda');
    assert.ok(h.z > PORTAL.relsZ[0] && h.z < PORTAL.relsZ[1], 'arava ko‘prikda');
    assert.ok(h.y >= Math.min(...tepalar) - 1e-9 && h.y <= PORTAL.yuqori + 1e-9);
    // Taxlam ustida bo'lmasa, plita boshqa taxlamlarga tegmaydi
    const ostida = TAXLAMLAR.filter((s) => Math.abs(s.x - h.x) < PLITA.uzunlik && Math.abs(s.z - h.z) < PLITA.eni);
    for (const s of ostida) if (Math.abs(s.x - h.x) > 1e-6 || Math.abs(s.z - h.z) > 1e-6) assert.ok(h.y > s.tepa + 0.05, 'boshqa taxlam ustidan baland o‘tadi');
    if (oldingiYuk && !h.yuk) qoyishlar.push({ t, z: h.z, x: h.x, y: h.y });
    oldingiYuk = h.yuk;
  }
  assert.equal(qoyishlar.length, 4);
  for (const q of qoyishlar) {
    assert.ok(Math.abs(q.x - CNC.kirishX) < 1e-6 && Math.abs(q.y - (CNC.kirishY + PLITA.qalinlik)) < 0.02, 'kirish stoliga qo‘yadi');
    const cnc = CNC_QATORLARI.find((c) => Math.abs(c.z - q.z) < 1e-6);
    assert.ok(cnc, 'CNC qatori');
    const kutish = ((cnc.faza - q.t) % CNC.davr + CNC.davr) % CNC.davr;
    assert.ok(kutish > 0 && kutish < 3, `CNC plitani qo‘yilgandan keyin oladi (${kutish.toFixed(2)} s)`);
  }
  for (const c of CNC_QATORLARI) for (let t = 0; t < CNC.davr; t += 0.05) {
    const h = cncHolati(t, c.faza, c.z);
    assert.ok(Math.abs(h.portalX - CNC.stolX) <= CNC.portalX + 1e-9 && Math.abs(h.aravaZ - c.z) <= CNC.aravaZ + 1e-9);
    assert.ok(h.shpindelY >= CNC.shpindelKesish - 1e-9 && h.plitaA <= h.plitaB - PLITA.uzunlik + 1e-9 + 1.2);
  }
});

test('AGV: yopiq yo‘l faqat 2-sex ichida va ikki ochiq orqali asosiy sexdagi o‘tish yo‘lagiga kiradi, hech narsaga tegmaydi, bir-biriga yaqinlashmaydi', () => {
  const jadval = agvJadvali();
  const { yol } = jadval;
  const tosiqlar = [...jihozlar(), ...KONVEYERLAR.map((k) => ({ nom: k.id, t: k.t })), ...TOSIQLAR.map((s) => ({ nom: `to‘siq ${s.id}`, t: s.t })),
    ...BAND_JOYLAR, ...USTUNLAR, { nom: 'xona', t: BOSHQARUV_XONASI }];
  const r = AGV.yarimKenglik;
  let asosiySexda = 0;
  for (let s = 0; s < yol.jami; s += 0.1) {
    const p = (() => { let i = 1; while (i < yol.uzunlik.length - 1 && yol.uzunlik[i] < s) i++; const u = (s - yol.uzunlik[i - 1]) / (yol.uzunlik[i] - yol.uzunlik[i - 1]); return [yol.nuqtalar[i - 1][0] + (yol.nuqtalar[i][0] - yol.nuqtalar[i - 1][0]) * u, yol.nuqtalar[i - 1][1] + (yol.nuqtalar[i][1] - yol.nuqtalar[i - 1][1]) * u]; })();
    const [x, z] = p;
    if (z > ICHKI.z1 - r) {
      // Ochiq orqali o'tadi: romdan va devor bo'laklaridan chetda
      assert.ok(ORQA_OCHIQLAR.some((o) => Math.abs(x - o.x) <= o.eni / 2 - OCHIQ_ROMI - r), `AGV (${x.toFixed(2)}, ${z.toFixed(2)}) devorga tegadi`);
      if (z > -15) {
        asosiySexda++;
        assert.ok(ORQA_OCHIQ_YOLAKLARI.some((y) => x - r >= y.x0 && x + r <= y.x1 && z + r <= y.z1), `AGV asosiy sexda o‘tish yo‘lagidan chiqdi (${x.toFixed(2)}, ${z.toFixed(2)})`);
      }
    } else {
      assert.ok(x - r >= ICHKI.x0 && x + r <= ICHKI.x1 && z - r >= ICHKI.z0, 'AGV 2-sex ichida');
    }
    for (const t of tosiqlar) assert.equal(kesishadi(tb(x - r, x + r, z - r, z + r), t.t), false, `AGV (${x.toFixed(2)}, ${z.toFixed(2)}) ${t.nom} ga tegadi`);
    for (const o of TURGAN_ODAMLAR) assert.ok(Math.hypot(o.p[0] - x, o.p[2] - z) > r + 0.4, 'AGV odamga tegmaydi');
    for (const y of ODAM_YOLLARI) for (const [a, b] of y.nuqtalar) assert.ok(Math.hypot(a - x, b - z) > r + 0.4);
  }
  assert.ok(asosiySexda > 20, 'AGV asosiy sexga kiradi');
  // Ikkala ochiqdan o'tadi
  for (const o of ORQA_OCHIQLAR) assert.ok(yol.nuqtalar.some(([x, z]) => z > -14 && Math.abs(x - o.x) < o.eni / 2));
  assert.equal(AGV_SONI, 3);
  let eng = Infinity;
  const yuklar = new Set();
  for (let t = 0; t < jadval.davr; t += 0.05) {
    const h = [0, 1, 2].map((i) => agvHolati(jadval, i, t));
    h.forEach((a) => yuklar.add(a.yuk));
    juftlar(h, (a, b) => { eng = Math.min(eng, Math.hypot(a.x - b.x, a.z - b.z)); });
  }
  assert.ok(eng > AGV.uzunlik + 0.6, `AGV lar orasidagi eng kam masofa ${eng.toFixed(2)}`);
  assert.deepEqual([...yuklar].sort(), [0, 1, 2]);
  assert.equal(AGV_BEKATLAR.length, 3);
});

test('odamlar: 4–6 ta, jihozlarga tushmaydi; yo‘llari piyoda yo‘lagida', () => {
  const jami = TURGAN_ODAMLAR.length + ODAM_YOLLARI.length;
  assert.ok(jami >= 4 && jami <= 6);
  const tosiqlar = [...jihozlar().filter((j) => j.nom !== 'boshqaruv xonasi'), ...KONVEYERLAR.map((k) => ({ nom: k.id, t: k.t })), ...TOSIQLAR.map((s) => ({ nom: s.id, t: s.t })), ...USTUNLAR];
  for (const o of TURGAN_ODAMLAR) for (const t of tosiqlar) assert.equal(nuqtaIchida(o.p[0], o.p[2], kengaytir(t.t, 0.25)), false, `odam (${o.p[0]}, ${o.p[2]}) ${t.nom} ichida`);
  for (const y of ODAM_YOLLARI) for (let i = 0; i + 1 < y.nuqtalar.length; i++) {
    const [a, b] = [y.nuqtalar[i], y.nuqtalar[i + 1]];
    for (let u = 0; u <= 1; u += 0.02) {
      const x = a[0] + (b[0] - a[0]) * u;
      const z = a[1] + (b[1] - a[1]) * u;
      assert.ok(PIYODA_YOLAGI.some((p) => x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1), `(${x.toFixed(1)}, ${z.toFixed(1)}) piyoda yo‘lagida`);
      for (const t of tosiqlar) assert.equal(nuqtaIchida(x, z, kengaytir(t.t, 0.25)), false, `yo‘l ${t.nom} ga tegadi`);
    }
  }
});

test('roliklar instancing uchun: har konveyerda zich, konveyer ichida', () => {
  const r = roliklar();
  assert.ok(r.length > 80 && r.length < 400, `roliklar ${r.length}`);
  for (const x of r) assert.ok(KONVEYERLAR.some((k) => k.tur === 'rolik' && x.x >= k.t.x0 && x.x <= k.t.x1 && x.z >= k.t.z0 && x.z <= k.t.z1));
  assert.ok(ROBOT.L2 + ROBOT.L3 > 2.5);
});

test('manba: faqat default komponent, havolasiz, StatikGuruh, instancing, materiallar useMemo da va tozalanadi, odamlar Suspense ichida', () => {
  for (const f of [komp, reja]) assert.doesNotMatch(f, /https?:\/\//);
  assert.deepEqual(komp.match(/^export .*/gm), ['export default function AvtoSex({ m }: { m: Materiallar }) {']);
  assert.doesNotMatch(reja, /from "react"|from "three"|from "@\//, 'reja toza (React/three/@ siz)');
  assert.match(reja, /from "\.\/hudud\.ts"/);
  assert.match(komp, /<StatikGuruh>\s*<Bino /);
  assert.ok((komp.match(/<StatikGuruh>/g) ?? []).length >= 10, 'harakatlanuvchi qismlar ham ichida birlashtiriladi');
  assert.match(komp, /<instancedMesh ref=\{ref\} args=\{\[geo, m\.polat, royxat\.length\]\}/);
  assert.match(komp, /<instancedMesh ref=\{ref\} args=\{\[geo, a\.detal, DETAL_MAX\]\}/);
  assert.match(komp, /function useAvtoMateriallari\(\) \{\s*const r = useMemo\(/);
  assert.match(komp, /useEffect\(\(\) => \(\) => \{\s*r\.teksturalar\.forEach\(\(t\) => t\?\.dispose\(\)\);\s*Object\.values\(r\.mat\)\.forEach\(\(x\) => x\.dispose\(\)\);/);
  assert.doesNotMatch(komp, /<mesh(?:Standard|Basic|Physical)Material/);
  assert.match(komp, /<Suspense fallback=\{null\}>\s*\{TURGAN_ODAMLAR\.map[\s\S]*<YuruvchiGlbOdam[\s\S]*<\/Suspense>/);
  assert.match(komp, /t\("zones\.automated", "Avtomatlashtirilgan liniya"\)/);
  assert.match(komp, /import \{ ZonaYorligi \} from "\.\/SexMuhiti";/);
  // Harakat faqat useFrame orqali (setState yo'q)
  assert.doesNotMatch(komp, /useState/);
  assert.ok((komp.match(/useFrame\(/g) ?? []).length >= 8);
  // Har stanok/robot/AGV o'z yorug'lik signallari bilan; yorug'lik pardalari
  assert.match(komp, /function Andon/);
  assert.match(komp, /NUR_PARDALARI\.map/);
});
