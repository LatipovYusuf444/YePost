// 3D Demo — ofis (8 qavat, panorama lift, direktor avtomobili) va maishiy blok: mebel modellari ro'yxati (GLB bilan
// solishtiriladi), joylashuv (bino ichida, devordan o'tmaydi, bir-biriga kirmaydi), har ish stolida noutbuk/monitor va
// o'tirgan xodim, qavatlar dasturi, lift jadvali, stol tennisi to'pi, avtomobil joyi, brend nomlari va tashqi havolalar yo'qligi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  MAISHIY_ESHIKLARI,
  MAISHIY_ICHI,
  MAISHIY_ICHKI_DEVORLARI,
  MAISHIY_MEBELLARI,
  MAISHIY_ODAMLARI,
  MAISHIY_OTIRISH_JUFTLARI,
  MAISHIY_POLI,
  MAISHIY_TOSIQLARI,
  MAISHIY_XONALARI,
  MAISHIY_YURUVCHILARI,
  MEBEL_MODELLARI,
  MEBEL_TURLARI,
  MEBEL_URLLARI,
  ORINDIQLAR,
  PARDOZLAR,
  SHKAFCHA,
  SHKAFCHA_QATORLARI,
  SKAMEYKALAR,
  STOL,
  atlasKatagi,
  devorBolaklari,
  mebelGeometriyalari,
  mebelIzi,
  mebelMatritsasi,
  mebelUrl,
  olchamliQutiGeometriyasi,
  shkafchaGeometriyalari,
  shkafchaQatoriIzi,
  shkafchalar,
  stulVaOdam,
} from '../src/Pages/Demo3DSex/mebelModellari.ts';
import {
  BUFET,
  DIREKTOR_MASHINASI,
  DIREKTOR_STOLI,
  HAYDOVCHI,
  KITOB_QATORLARI,
  LIFT_MAYDONCHASI,
  LIFT_TURISHI,
  MASHINA,
  OFIS_DEVORLARI,
  OFIS_ESHIGI,
  OFIS_ICHI,
  OFIS_ISH_JOYLARI,
  OFIS_MEBELLARI,
  OFIS_ODAMLARI,
  OFIS_OTIRISH_JUFTLARI,
  OFIS_POLLARI,
  OFIS_POL_QOPLAMALARI,
  OFIS_STOL_GURUHLARI,
  OFIS_TEPASI,
  OFIS_TOSIQLARI,
  OFIS_XONALARI,
  OFIS_YURUVCHILARI,
  OYIN_EKRANI,
  OYIN_PULTLARI,
  PANORAMA_LIFT,
  QAVAT_SONI,
  QAVAT_VAZIFALARI,
  TENNIS_ORALIGI,
  TENNIS_STOLI,
  TENNIS_STOLLARI,
  TURARGOH_BELGISI,
  TURARGOH_JOYI,
  TURARGOH_MATNLARI,
  YADRO,
  YADRO_YOLAGI,
  YUGURISH_YOLAKLARI,
  liftHolati,
  liftJadvali,
  mashinaGeometriyalari,
  mashinaNuqtasi,
  tennisTopi,
} from '../src/Pages/Demo3DSex/ofisRejasi.ts';
import { DIREKTOR_JOYI, GALEREYA, MAISHIY, OFIS } from '../src/Pages/Demo3DSex/hudud.ts';
import { harakatniHal } from '../src/Pages/Demo3DSex/odamModellari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const MEBEL_PAPKA = new URL('../public/models/demo3d/mebel/', import.meta.url);
const XATO = 0.005;
const P = Math.PI;

/** Ikki to'rtburchak kesishadimi (tegish — kesishish emas). */
const kesishadi = (a, b, e = XATO) => a.x0 < b.x1 - e && b.x0 < a.x1 - e && a.z0 < b.z1 - e && b.z0 < a.z1 - e;
const ichida = (a, xona, e = XATO) => a.x0 >= xona.x0 - e && a.x1 <= xona.x1 + e && a.z0 >= xona.z0 - e && a.z1 <= xona.z1 + e;
const nuqtaIchida = (x, z, t, r = 0) => x > t.x0 - r && x < t.x1 + r && z > t.z0 - r && z < t.z1 + r;

/** GLB JSON qismi va tugun transformatsiyalari bilan chegara. */
function glbChegarasi(fayl) {
  const b = readFileSync(new URL(fayl, MEBEL_PAPKA));
  assert.equal(b.readUInt32LE(0), 0x46546c67, `${fayl}: glTF sarlavhasi`);
  const len = b.readUInt32LE(12);
  const j = JSON.parse(b.toString('utf8', 20, 20 + len));
  const box = new THREE.Box3();
  const yur = (ni, ota) => {
    const n = j.nodes[ni];
    const m = new THREE.Matrix4();
    if (n.matrix) m.fromArray(n.matrix);
    else m.compose(new THREE.Vector3(...(n.translation ?? [0, 0, 0])), new THREE.Quaternion(...(n.rotation ?? [0, 0, 0, 1])), new THREE.Vector3(...(n.scale ?? [1, 1, 1])));
    const w = ota.clone().multiply(m);
    if (n.mesh !== undefined) {
      for (const p of j.meshes[n.mesh].primitives) {
        const a = j.accessors[p.attributes.POSITION];
        box.union(new THREE.Box3(new THREE.Vector3(...a.min), new THREE.Vector3(...a.max)).applyMatrix4(w));
      }
    }
    (n.children ?? []).forEach((c) => yur(c, w));
  };
  for (const ni of j.scenes[j.scene ?? 0].nodes) yur(ni, new THREE.Matrix4());
  return box;
}

async function glbYukla(fayl) {
  const b = readFileSync(new URL(fayl, MEBEL_PAPKA));
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
}

/** Qavat bo'yicha xona ro'yxati. */
const ofisXonalari = (y) => OFIS_XONALARI.filter((x) => Math.abs(x.y - y) < 1e-6);
const qavati = (y) => OFIS_POLLARI.reduce((eng, p) => (Math.abs(p - y) < Math.abs(eng - y) ? p : eng), OFIS_POLLARI[0]);
const qavatRaqami = (y) => OFIS_POLLARI.indexOf(qavati(y));
const xonaNomi = (o) => ofisXonalari(qavati(o.p[1])).find((x) => nuqtaIchida(o.p[0], o.p[2], x))?.nom;
const maishiyXonalari = Object.values(MAISHIY_XONALARI);
const OTIRUVCHILAR = ['direktor', 'xodimErkak', 'xodimAyol'];

test('mebel modellari: fayllar bor, manzil BASE_URL dan, chegara GLB bilan bir xil', () => {
  assert.ok(MEBEL_TURLARI.length >= 25);
  for (const tur of MEBEL_TURLARI) {
    const m = MEBEL_MODELLARI[tur];
    assert.ok(existsSync(new URL(m.fayl, MEBEL_PAPKA)), `${tur}: ${m.fayl} topilmadi`);
    assert.equal(mebelUrl(tur), `/models/demo3d/mebel/${m.fayl}`);
    const box = glbChegarasi(m.fayl);
    m.chegara[0].forEach((v, i) => assert.ok(Math.abs(v - box.min.getComponent(i)) < 2e-3, `${tur}: min[${i}] ${v} ≠ ${box.min.getComponent(i)}`));
    m.chegara[1].forEach((v, i) => assert.ok(Math.abs(v - box.max.getComponent(i)) < 2e-3, `${tur}: max[${i}] ${v} ≠ ${box.max.getComponent(i)}`));
  }
  assert.equal(MEBEL_URLLARI.length, MEBEL_TURLARI.length);
});

test('masshtab: mebel real o\'lchamda (stol 0.77 m, stul o\'rindig\'i 0.48 m, eshik o\'tadigan muzlatgich)', () => {
  const olcham = (tur) => { const iz = mebelIzi({ tur, p: [0, 0, 0] }); return [iz.x1 - iz.x0, iz.y1 - iz.y0, iz.z1 - iz.z0]; };
  const [, stolH] = olcham('stol');
  assert.ok(Math.abs(stolH - STOL.balandlik) < 0.01 && stolH > 0.72 && stolH < 0.8, `stol ${stolH}`);
  assert.ok(Math.abs(olcham('stol')[0] - STOL.eni) < 0.01 && Math.abs(olcham('stol')[2] - STOL.chuqurlik) < 0.01);
  assert.ok(olcham('muzlatgich')[1] > 1.7 && olcham('muzlatgich')[1] < 2.0);
  assert.ok(olcham('kreslo')[1] > 1.0 && olcham('kreslo')[1] < 1.25);
  assert.ok(olcham('oshxonaStoli')[1] > 0.72 && olcham('oshxonaStoli')[1] < 0.78);
  assert.ok(olcham('dush')[1] > 1.9 && olcham('dush')[1] < 2.3);
  for (const [tur, o] of Object.entries(ORINDIQLAR)) {
    const h = o.y * MEBEL_MODELLARI[tur].masshtab[1];
    assert.ok(h > 0.38 && h < 0.55, `${tur} o'rindig'i ${h}`);
  }
  const m = mebelMatritsasi({ tur: 'stol', p: [5, 1, -3], b: Math.PI / 2 });
  const [mn, mx] = MEBEL_MODELLARI.stol.chegara;
  const markaz = new THREE.Vector3((mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2).applyMatrix4(m);
  assert.ok(markaz.distanceTo(new THREE.Vector3(5, 1, -3)) < 1e-9);
});

test('ofis qavatlari: 8 qavat × 3.6 m (≈ 28.6 m), har qavatda xona va pol qoplamasi, vazifalar ro\'yxati', () => {
  assert.equal(QAVAT_SONI, 8);
  assert.equal(OFIS_POLLARI.length, OFIS.qavatlar);
  OFIS_POLLARI.forEach((y, k) => assert.ok(Math.abs(y - (0.05 + k * OFIS.qavatBalandligi)) < 1e-9));
  assert.ok(OFIS_TEPASI > 28 && OFIS_TEPASI < 29.5, `bino balandligi ${OFIS_TEPASI}`);
  assert.equal(QAVAT_VAZIFALARI.length, QAVAT_SONI);
  for (let k = 0; k < QAVAT_SONI; k++) {
    assert.ok(OFIS_XONALARI.some((x) => x.qavat === k), `${k + 1}-qavatda xona yo'q`);
    assert.ok(OFIS_POL_QOPLAMALARI.filter((q) => q.qavat === k).length >= 3, `${k + 1}-qavatda pol qoplamasi yo'q`);
  }
  // Xonalar va qoplamalar bino ichida; devorlar o'z qavati xonalari chegarasida
  for (const x of OFIS_XONALARI) assert.ok(ichida(x, OFIS_ICHI), `${x.nom} binodan chiqib ketgan`);
  for (const q of OFIS_POL_QOPLAMALARI) assert.ok(ichida(q, OFIS, 0.01), 'pol qoplamasi binodan tashqarida');
  for (const d of OFIS_DEVORLARI) {
    assert.ok(d.qavat >= 0 && d.qavat < QAVAT_SONI);
    for (const [e0, e1] of d.eshiklar) assert.ok(e0 > d.a0 && e1 < d.a1 && e1 - e0 >= 0.9, 'eshik devor ichida va kamida 0.9 m');
  }
  // Qoplamalar bir-birining ustiga tushmaydi (z-fighting yo'q)
  for (let k = 0; k < QAVAT_SONI; k++) {
    const q = OFIS_POL_QOPLAMALARI.filter((x) => x.qavat === k);
    for (let i = 0; i < q.length; i++) for (let j = i + 1; j < q.length; j++) assert.ok(!kesishadi(q[i], q[j]), `${k + 1}-qavat qoplamalari ustma-ust`);
  }
});

test('ofis: mebel bino ichida, qavat polida, har biri bitta xona ichida; yadro, lift oldi va zina yo\'lagi bo\'sh', () => {
  assert.ok(OFIS_MEBELLARI.length > 250, `mebel ${OFIS_MEBELLARI.length}`);
  const bosh = [YADRO, YADRO_YOLAGI, LIFT_MAYDONCHASI];
  for (const j of OFIS_MEBELLARI) {
    const iz = mebelIzi(j);
    assert.ok(ichida(iz, OFIS_ICHI), `${j.tur} @${j.p} ofisdan chiqib ketgan`);
    const y = qavati(j.p[1]);
    if (!j.ustida) assert.ok(j.p[1] - y >= -1e-6 && j.p[1] - y < 0.13, `${j.tur} @${j.p} polda emas`);
    assert.ok(ofisXonalari(y).some((x) => ichida(iz, x)), `${j.tur} @${j.p} hech bir xonaga sig'maydi`);
    if (!j.ustida) for (const t of bosh) assert.ok(!kesishadi(iz, t), `${j.tur} @${j.p} yadro/lift oldini to'sgan`);
  }
  for (const t of OFIS_TOSIQLARI) {
    assert.ok(ofisXonalari(t.y).some((x) => ichida(t, x)), `${t.nom} xonaga sig'maydi`);
    for (const b of bosh) assert.ok(!kesishadi(t, b), `${t.nom} yadro/lift oldini to'sgan`);
  }
  // Har qavatda mebel bor (bo'sh qavat yo'q)
  for (let k = 0; k < QAVAT_SONI; k++) {
    const n = OFIS_MEBELLARI.filter((j) => qavatRaqami(j.p[1]) === k).length + OFIS_TOSIQLARI.filter((t) => t.y === OFIS_POLLARI[k]).length;
    assert.ok(n >= 10, `${k + 1}-qavat bo'sh (${n})`);
  }
});

test('ofis: stollar, stullar va jihozlar bir-biriga kirmaydi', () => {
  const asosiy = OFIS_MEBELLARI.filter((j) => !j.ustida);
  for (let i = 0; i < asosiy.length; i++) {
    for (let k = i + 1; k < asosiy.length; k++) {
      const a = asosiy[i];
      const b = asosiy[k];
      if (qavati(a.p[1]) !== qavati(b.p[1])) continue;
      assert.ok(!kesishadi(mebelIzi(a), mebelIzi(b)), `${a.tur}@${a.p} va ${b.tur}@${b.p} kesishadi`);
    }
    for (const t of OFIS_TOSIQLARI) {
      if (qavati(asosiy[i].p[1]) !== t.y) continue;
      assert.ok(!kesishadi(mebelIzi(asosiy[i]), t), `${asosiy[i].tur}@${asosiy[i].p} va ${t.nom} kesishadi`);
    }
  }
  for (let i = 0; i < OFIS_TOSIQLARI.length; i++) {
    for (let k = i + 1; k < OFIS_TOSIQLARI.length; k++) {
      const a = OFIS_TOSIQLARI[i];
      const b = OFIS_TOSIQLARI[k];
      if (a.y === b.y) assert.ok(!kesishadi(a, b), `${a.nom} va ${b.nom} kesishadi`);
    }
  }
  // Ichki devorlar mebel orqali o'tmaydi
  for (const d of OFIS_DEVORLARI) {
    const y = OFIS_POLLARI[d.qavat];
    const chiziq = d.o === 'z' ? { x0: d.a0, x1: d.a1, z0: d.c - 0.06, z1: d.c + 0.06 } : { x0: d.c - 0.06, x1: d.c + 0.06, z0: d.a0, z1: d.a1 };
    for (const j of asosiy) if (Math.abs(j.p[1] - y) < 0.2) assert.ok(!kesishadi(mebelIzi(j), chiziq), `${j.tur}@${j.p} devor (${d.o}=${d.c}) ichida`);
    for (const t of OFIS_TOSIQLARI) if (t.y === y && t.nom !== 'doska' && t.nom !== 'moodboard') assert.ok(!kesishadi(t, chiziq), `${t.nom} devor ichida`);
  }
});

test('har ish stolida noutbuk yoki monitor va o\'tirgan xodim; 2–3-qavat ochiq ofislari to\'la', () => {
  assert.ok(OFIS_ISH_JOYLARI.length >= 14 && OFIS_ISH_JOYLARI.length <= 24, `ish stollari ${OFIS_ISH_JOYLARI.length}`);
  for (const ij of OFIS_ISH_JOYLARI) {
    assert.ok(ij.jihozlar.some((j) => j.tur === 'noutbuk' || j.tur === 'monitor'), `stol @${ij.stol.p} da kompyuter yo'q`);
    assert.ok(ij.odam && ij.odam.harakat === 'otirish' && OTIRUVCHILAR.includes(ij.odam.tur), `stol @${ij.stol.p} da o'tirgan xodim yo'q`);
    // Xodim o'z kreslosida
    assert.ok(Math.hypot(ij.odam.p[0] - ij.stul.p[0], ij.odam.p[2] - ij.stul.p[2]) < 0.1);
    const s = mebelIzi(ij.stol);
    for (const j of ij.jihozlar) {
      assert.ok(ichida(mebelIzi(j), s, 0.03), `${j.tur} stol ustidan chiqib ketgan`);
      assert.ok(Math.abs(j.p[1] - (ij.stol.p[1] + STOL.balandlik)) < 0.01);
    }
  }
  for (const [k, tur] of [[1, 'monitor'], [2, 'noutbuk']]) {
    const stollar = OFIS_ISH_JOYLARI.filter((i) => qavatRaqami(i.stol.p[1]) === k);
    assert.ok(stollar.length >= 6, `${k + 1}-qavatda ${stollar.length} stol`);
    assert.ok(stollar.every((i) => i.jihozlar.some((j) => j.tur === tur)), `${k + 1}-qavat stollarida ${tur} yo'q`);
  }
  // Orqama-orqa stollar orasidagi to'siq tirqishda
  assert.ok(OFIS_STOL_GURUHLARI.length >= 4);
  for (const g of OFIS_STOL_GURUHLARI) {
    for (const j of g.joylar.filter((j) => j.stol.b === Math.PI)) assert.ok(mebelIzi(j.stol).z1 <= g.bolgich.z - 0.005);
    for (const j of g.joylar.filter((j) => j.stol.b === 0)) assert.ok(mebelIzi(j.stol).z0 >= g.bolgich.z + 0.005);
  }
});

/** Stul nishon (stol markazi) tomonga qaraydimi: oldi (sin b, cos b). */
function qaraydi(stul, nishon) {
  const b = stul.b ?? 0;
  const dx = nishon[0] - stul.p[0];
  const dz = nishon[1] - stul.p[2];
  const l = Math.hypot(dx, dz);
  return { dot: (Math.sin(b) * dx + Math.cos(b) * dz) / l, l };
}

test('stullar stolga qaragan va stolga yaqin', () => {
  const juftlar = [...OFIS_OTIRISH_JUFTLARI, ...MAISHIY_OTIRISH_JUFTLARI];
  assert.ok(juftlar.length >= 80);
  for (const { stul, nishon } of juftlar) {
    const { dot, l } = qaraydi(stul, nishon);
    assert.ok(dot > 0.85, `${stul.tur}@${stul.p} stolga qaramagan (${dot.toFixed(2)})`);
    assert.ok(l < 3.6, `${stul.tur}@${stul.p} stoldan uzoq (${l.toFixed(2)})`);
  }
  for (const ij of OFIS_ISH_JOYLARI) {
    const b = ij.stol.b ?? 0;
    const dx = ij.stul.p[0] - ij.stol.p[0];
    const dz = ij.stul.p[2] - ij.stol.p[2];
    assert.ok(Math.sin(b) * dx + Math.cos(b) * dz > 0.7, 'kreslo stolning old tomonida emas');
  }
});

test('odamlar: o\'tirganlar o\'tira oladigan modellar va o\'rindiq ustida; hammasi xona ichida va mebelga kirmaydi', () => {
  const tekshir = (odamlar, mebel, tosiqlar, xonalar, nom) => {
    const asosiy = mebel.filter((j) => !j.ustida);
    for (const o of odamlar) {
      const [x, y, z] = o.p;
      assert.ok(xonalar(y).some((t) => nuqtaIchida(x, z, t, -0.15)), `${nom}: ${o.tur}@${o.p} xonada emas`);
      if (o.harakat === 'otirish') {
        assert.equal(harakatniHal(o.tur, 'otirish'), 'otirish', `${o.tur} o'tira olmaydi`);
        const stul = asosiy.find((j) => ORINDIQLAR[j.tur] && Math.hypot(j.p[0] - x, j.p[2] - z) < 0.6 && Math.abs(j.p[1] - y) < 1e-6);
        assert.ok(stul, `${nom}: ${o.tur}@${o.p} ostida stul yo'q`);
        const farq = (((o.burilish - (stul.b ?? 0)) % (2 * P)) + 2 * P) % (2 * P);
        assert.ok(farq < 1e-6 || Math.abs(farq - 2 * P) < 1e-6, 'odam stul bilan bir tomonga qaraydi');
        assert.ok(o.orindiq > 0.38 && o.orindiq < 0.56);
      } else {
        for (const j of asosiy) {
          if (Math.abs(j.p[1] - y) > 0.25) continue;
          assert.ok(!nuqtaIchida(x, z, mebelIzi(j), 0.15), `${nom}: ${o.tur}@${o.p} ${j.tur}@${j.p} ichida`);
        }
        // Yugurish yo'lagidagi yuguruvchidan boshqa tik turganlar to'siqlarga kirmaydi
        if (o.p[1] - qavati(y) < 0.05) for (const t of tosiqlar) if (Math.abs(t.y - qavati(y)) < 1e-6) assert.ok(!nuqtaIchida(x, z, t, 0.15), `${nom}: ${o.tur}@${o.p} ${t.nom} ichida`);
      }
    }
  };
  tekshir(OFIS_ODAMLARI, OFIS_MEBELLARI, OFIS_TOSIQLARI, (y) => ofisXonalari(qavati(y)), 'ofis');
  tekshir(MAISHIY_ODAMLARI, MAISHIY_MEBELLARI, [], () => maishiyXonalari, 'maishiy');
  const direktor = OFIS_ODAMLARI.filter((o) => o.tur === 'direktor');
  assert.equal(direktor.length, 1);
  assert.equal(direktor[0].harakat, 'otirish');
  assert.ok(Math.abs(direktor[0].p[1] - OFIS_POLLARI[QAVAT_SONI - 1]) < 1e-6, 'direktor yuqori qavatda');
  assert.ok(Math.abs(direktor[0].p[0] - DIREKTOR_STOLI.x) < 0.3);
  assert.ok(MAISHIY_ODAMLARI.length >= 8 && MAISHIY_ODAMLARI.length <= 14);
});

test('odamlar soni: bino va avtomobil bilan birga ≤ 45 GLB odam; har qavatda kamida 3 kishi', () => {
  const jami = OFIS_ODAMLARI.length + OFIS_YURUVCHILARI.length + 1;
  assert.ok(jami <= 45 && jami >= 35, `ofisda ${jami} odam`);
  for (let k = 0; k < QAVAT_SONI; k++) {
    const n = OFIS_ODAMLARI.filter((o) => qavatRaqami(o.p[1]) === k).length + OFIS_YURUVCHILARI.filter((y) => qavatRaqami(y.y) === k).length;
    assert.ok(n >= 3, `${k + 1}-qavatda ${n} kishi`);
  }
});

test('qavatlar dasturi: restoran, kutubxona va o\'yin xonasi, stol tennisi, majlislar, studiya, direktor', () => {
  const xonadagilar = (k, nom) => OFIS_ODAMLARI.filter((o) => qavatRaqami(o.p[1]) === k && xonaNomi(o) === nom);
  const tosiq = (k, nom) => OFIS_TOSIQLARI.filter((t) => t.y === OFIS_POLLARI[k] && t.nom.startsWith(nom));
  // 1: vestibyulda qabulxona xodimi; restoranda ovqatlanayotganlar va bufet ortida oshpaz
  assert.equal(tosiq(0, 'qabul').length, 1);
  assert.ok(xonadagilar(0, 'vestibyul').some((o) => o.harakat === 'otirish'));
  const restoran = xonadagilar(0, 'restoran');
  assert.ok(restoran.filter((o) => o.harakat === 'otirish').length >= 3);
  const oshpaz = restoran.find((o) => o.harakat === 'ishlash');
  assert.ok(oshpaz && oshpaz.p[2] < BUFET.z0 && oshpaz.p[0] > BUFET.x0 && oshpaz.p[0] < BUFET.x1, 'oshpaz bufet ortida');
  assert.ok(OFIS_MEBELLARI.some((j) => j.tur === 'kofeMashina' && qavatRaqami(j.p[1]) === 0 && xonaNomi(j) === 'restoran'));
  assert.ok(OFIS_MEBELLARI.filter((j) => j.tur === 'oshxonaStoli' && qavatRaqami(j.p[1]) === 0).length >= 7);
  // 2–3: ochiq ofisda tik turib gaplashayotganlar
  for (const k of [1, 2]) assert.ok(OFIS_ODAMLARI.some((o) => qavatRaqami(o.p[1]) === k && o.harakat !== 'otirish'), `${k + 1}-qavatda tik turgan yo'q`);
  // 4: kutubxona — javonlar (kitoblari bilan) va o'qiyotganlar; o'yin xonasi — ekranga qaragan 2+ o'yinchi, pultlari
  assert.ok(OFIS_MEBELLARI.filter((j) => j.tur === 'ochiqJavon' && qavatRaqami(j.p[1]) === 3).length >= 20);
  assert.equal(KITOB_QATORLARI.length, OFIS_MEBELLARI.filter((j) => j.tur === 'ochiqJavon' && qavatRaqami(j.p[1]) === 3).length * 3);
  assert.ok(xonadagilar(3, 'kutubxona').filter((o) => o.harakat === 'otirish').length >= 2);
  const oyinchilar = xonadagilar(3, 'oyinXonasi').filter((o) => o.harakat === 'otirish');
  assert.ok(oyinchilar.length >= 2 && oyinchilar.length <= 3);
  for (const o of oyinchilar) {
    const dx = OYIN_EKRANI.x - o.p[0];
    const dz = OYIN_EKRANI.z - o.p[2];
    assert.ok((Math.sin(o.burilish) * dx + Math.cos(o.burilish) * dz) / Math.hypot(dx, dz) > 0.6, 'o\'yinchi ekranga qaramagan');
  }
  assert.equal(OYIN_PULTLARI.length, oyinchilar.length);
  // 5: 2 tennis stoli, har birida ikki uchida bir-biriga qaragan o'yinchilar; yugurish yo'lagida yuguruvchi
  assert.equal(TENNIS_STOLLARI.length, 2);
  for (const s of TENNIS_STOLLARI) {
    const oyinchi = OFIS_ODAMLARI.filter((o) => Math.abs(o.p[1] - s.y) < 1e-6 && Math.abs(o.p[2] - s.z) < 0.4 && Math.abs(Math.abs(o.p[0] - s.x) - (TENNIS_STOLI.uzunlik / 2 + TENNIS_ORALIGI)) < 0.01);
    assert.equal(oyinchi.length, 2);
    for (const o of oyinchi) {
      assert.ok(['ishlash', 'qolSilkitish'].includes(o.harakat));
      assert.ok(Math.sin(o.burilish) * (s.x - o.p[0]) > 0, 'o\'yinchi stolga qaramagan');
    }
  }
  const yuguruvchi = OFIS_ODAMLARI.find((o) => o.harakat === 'yurish');
  assert.ok(yuguruvchi && YUGURISH_YOLAKLARI.some((t) => nuqtaIchida(yuguruvchi.p[0], yuguruvchi.p[2], t) && yuguruvchi.p[1] > t.y));
  // 6: katta majlis zalida 3+ kishi, HR da xodim
  assert.ok(xonadagilar(5, 'kattaMajlis').filter((o) => o.harakat === 'otirish').length >= 3);
  assert.ok(xonadagilar(5, 'hr').length >= 1);
  // 7: studiya — 2 monitorli dizaynerlar, maket stoli
  assert.ok(OFIS_ISH_JOYLARI.filter((i) => qavatRaqami(i.stol.p[1]) === 6 && i.jihozlar.filter((j) => j.tur === 'monitor').length === 2).length >= 3);
  assert.equal(tosiq(6, 'maketStoli').length, 1);
  // 8: direktor kabineti, kotiba, VIP majlis
  assert.ok(xonadagilar(7, 'qabulxona').length >= 1 && xonadagilar(7, 'majlislar').length >= 2);
});

test('yuruvchilar yo\'li mebel, to\'siq va devorlardan o\'tmaydi; maishiy yo\'li eshiklar va galereyadan o\'tadi', () => {
  const tekshir = (y, mebel, tosiqlar, nom) => {
    for (const j of y.nuqtalar.slice(0, -1).keys()) {
      const [ax, az] = y.nuqtalar[j];
      const [bx, bz] = y.nuqtalar[j + 1];
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1);
      for (let i = 0; i <= n; i++) {
        const x = ax + ((bx - ax) * i) / n;
        const z = az + ((bz - az) * i) / n;
        for (const t of tosiqlar) assert.ok(!nuqtaIchida(x, z, t, 0.2), `${nom}: (${x.toFixed(2)}, ${z.toFixed(2)}) ${t.nom ?? ''} ga kiradi`);
        for (const m of mebel) if (!m.ustida && Math.abs(m.p[1] - y.y) < 0.2) assert.ok(!nuqtaIchida(x, z, mebelIzi(m), 0.2), `${nom}: (${x.toFixed(2)}, ${z.toFixed(2)}) ${m.tur}@${m.p} ga kiradi`);
      }
    }
  };
  for (const y of OFIS_YURUVCHILARI) {
    tekshir(y, OFIS_MEBELLARI, OFIS_TOSIQLARI.filter((t) => t.y === y.y), 'ofis');
    for (const j of y.nuqtalar.slice(0, -1).keys()) {
      const [ax, az] = y.nuqtalar[j];
      const [bx, bz] = y.nuqtalar[j + 1];
      for (const d of OFIS_DEVORLARI.filter((d) => OFIS_POLLARI[d.qavat] === y.y)) {
        const [p0, p1, q0, q1] = d.o === 'z' ? [az, bz, ax, bx] : [ax, bx, az, bz];
        if ((p0 - d.c) * (p1 - d.c) >= 0) continue;
        const q = q0 + ((q1 - q0) * (d.c - p0)) / (p1 - p0);
        if (q < d.a0 || q > d.a1) continue;
        assert.ok(d.eshiklar.some(([e0, e1]) => q > e0 + 0.2 && q < e1 - 0.2), `devor ${d.o}=${d.c} eshiksiz kesib o'tilgan`);
      }
    }
  }
  // Vestibyul yuruvchisi kirish eshigidan panorama lift eshigigacha boradi
  const v = OFIS_YURUVCHILARI.find((y) => y.y === OFIS_POLLARI[0]);
  assert.ok(v);
  assert.ok(nuqtaIchida(...v.nuqtalar[0], { x0: OFIS_ESHIGI.x0, x1: OFIS_ESHIGI.x1, z0: OFIS.z1 - 1, z1: OFIS.z1 }), 'yuruvchi kirish eshigidan boshlanadi');
  assert.ok(nuqtaIchida(...v.nuqtalar.at(-1), LIFT_MAYDONCHASI));
  const maishiyTosiqlar = [...MAISHIY_TOSIQLARI, ...SHKAFCHA_QATORLARI.map(shkafchaQatoriIzi), ...SKAMEYKALAR];
  for (const y of MAISHIY_YURUVCHILARI) {
    tekshir(y, MAISHIY_MEBELLARI, maishiyTosiqlar, 'maishiy');
    for (const j of y.nuqtalar.slice(0, -1).keys()) {
      const [ax, az] = y.nuqtalar[j];
      const [bx, bz] = y.nuqtalar[j + 1];
      for (const d of MAISHIY_ICHKI_DEVORLARI) {
        const [p0, p1, q0, q1] = d.o === 'z' ? [az, bz, ax, bx] : [ax, bx, az, bz];
        if ((p0 - d.c) * (p1 - d.c) >= 0) continue;
        const t = (d.c - p0) / (p1 - p0);
        const q = q0 + (q1 - q0) * t;
        if (q < d.a0 || q > d.a1) continue;
        assert.ok(d.eshiklar.some(([e0, e1]) => q > e0 + 0.2 && q < e1 - 0.2), `devor ${d.o}=${d.c} eshiksiz kesib o'tilgan (${q.toFixed(2)})`);
      }
      if ((ax - MAISHIY.x0) * (bx - MAISHIY.x0) < 0) {
        const q = az + ((bz - az) * (MAISHIY.x0 - ax)) / (bx - ax);
        assert.ok(q > MAISHIY_ESHIKLARI.galereya.z0 + 0.2 && q < MAISHIY_ESHIKLARI.galereya.z1 - 0.2);
      }
    }
    const galereyada = y.nuqtalar.filter(([x]) => x > GALEREYA.x0 && x < GALEREYA.x1);
    for (const [, z] of galereyada) assert.ok(z > GALEREYA.z0 + 0.3 && z < GALEREYA.z1 - 0.3);
  }
});

test('panorama lift: old fasadda, bino tashqarisida; kabina qavatlar orasida yuradi, to\'xtaganda eshik ochiladi', () => {
  const L = PANORAMA_LIFT;
  assert.ok(L.z0 >= OFIS.z1 && L.z1 - L.z0 > 1.9, 'shaxta old fasaddan tashqarida');
  assert.ok(L.x0 > OFIS.x0 && L.x1 < OFIS.x1);
  assert.ok(L.kabina.x - L.kabina.eni / 2 > L.x0 && L.kabina.x + L.kabina.eni / 2 < L.x1);
  assert.ok(L.kabina.z - L.kabina.chuqurlik / 2 > L.z0 && L.kabina.z + L.kabina.chuqurlik / 2 < L.z1);
  assert.ok(L.eshik.x0 > L.kabina.x - L.kabina.eni / 2 && L.eshik.x1 < L.kabina.x + L.kabina.eni / 2, 'fasad eshigi kabina qarshisida');
  // Fasad eshigi tik profillar orasida (1.25 m qadam) va lift oldi maydonchasi qarshisida
  const profillar = Array.from({ length: 17 }, (_, i) => OFIS.x0 + i * 1.25);
  assert.ok(profillar.every((x) => x <= L.eshik.x0 || x >= L.eshik.x1));
  assert.ok(L.eshik.x0 > LIFT_MAYDONCHASI.x0 && L.eshik.x1 < LIFT_MAYDONCHASI.x1);
  assert.ok(L.tepasi > OFIS_TEPASI + L.kabina.balandlik - 1);
  // Bayroqlar va kirish eshigiga tegmaydi
  assert.ok(L.x1 < OFIS_ESHIGI.x0 - 1.5);
  const j = liftJadvali();
  assert.ok(j.toxtashlar.length >= 8);
  const qavatlar = j.toxtashlar.map((t) => t.qavat);
  qavatlar.forEach((q, i) => assert.notEqual(q, qavatlar[(i + 1) % qavatlar.length], 'ketma-ket bir xil qavat'));
  assert.ok(new Set(qavatlar).size >= 5, 'lift kamida 5 xil qavatga boradi');
  const ymin = OFIS_POLLARI[0];
  const ymax = OFIS_POLLARI[QAVAT_SONI - 1];
  let oldingi = null;
  let ochilgan = 0;
  for (let t = 0; t < j.davr * 2; t += 0.05) {
    const h = liftHolati(j, t);
    assert.ok(h.y >= ymin - 1e-6 && h.y <= ymax + 1e-6, `lift ${h.y} qavatlardan tashqarida`);
    assert.ok(h.eshik >= 0 && h.eshik <= 1);
    if (h.eshik > 0) {
      assert.ok(!h.harakatda, 'eshik harakatda ochilmaydi');
      assert.ok(OFIS_POLLARI.some((y) => Math.abs(y - h.y) < 1e-6), 'eshik faqat qavatda ochiladi');
      ochilgan++;
    }
    if (oldingi) assert.ok(Math.abs(h.y - oldingi.y) < 0.05 * 3.2, 'lift sakramaydi');
    oldingi = h;
  }
  assert.ok(ochilgan > 0);
  // To'xtash vaqtida eshik to'liq ochiladi
  const b = j.toxtashlar[2];
  const ochiq = liftHolati(j, b.boshi + b.yolVaqti + LIFT_TURISHI / 2);
  assert.equal(ochiq.eshik, 1);
  assert.equal(ochiq.qavat, b.qavat);
});

test('stol tennisi to\'pi: o\'yinchilar orasida, stol ustida yuqorida, raqib yarmiga tushadi', () => {
  const T = TENNIS_STOLI;
  let yuzaga = 0;
  for (let t = 0; t < 6; t += 0.01) {
    const [dx, y, dz] = tennisTopi(t, 0.3);
    assert.ok(Math.abs(dx) <= T.uzunlik / 2 + TENNIS_ORALIGI, 'to\'p o\'yinchidan nariga ketgan');
    assert.ok(Math.abs(dz) < T.eni / 2);
    if (Math.abs(dx) < T.uzunlik / 2) assert.ok(y >= T.balandlik + 0.019, `to'p stol ichiga kirgan (y ${y.toFixed(3)})`);
    assert.ok(y < 1.4);
    if (y < T.balandlik + 0.03) {
      yuzaga++;
      assert.ok(Math.abs(dx) > 0.1 && Math.abs(dx) < T.uzunlik / 2, 'to\'p to\'rga emas, stol yarmiga tushadi');
    }
  }
  assert.ok(yuzaga > 0);
});

test('direktor avtomobili: DIREKTOR_JOYI da, oldi +x, ≈ 5.7 m, binoga, liftga va kirishga tegmaydi', async () => {
  assert.equal(DIREKTOR_MASHINASI.x, DIREKTOR_JOYI.x);
  assert.equal(DIREKTOR_MASHINASI.z, DIREKTOR_JOYI.z);
  assert.equal(DIREKTOR_MASHINASI.burchak, DIREKTOR_JOYI.burchak);
  assert.ok(MASHINA.uzunlik > 5.5 && MASHINA.uzunlik < 6 && MASHINA.eni >= 1.9 && MASHINA.eni <= 2.1);
  // Old nuqta +x da (burchak = π/2)
  const [ox, oz] = mashinaNuqtasi(MASHINA.uzunlik / 2, 0);
  assert.ok(Math.abs(ox - (DIREKTOR_JOYI.x + MASHINA.uzunlik / 2)) < 1e-3 && Math.abs(oz - DIREKTOR_JOYI.z) < 1e-3);
  // Geometriya o'lchami
  const g = mashinaGeometriyalari();
  const box = new THREE.Box3();
  for (const geo of [g.kuzov, g.salon]) {
    geo.computeBoundingBox();
    box.union(geo.boundingBox);
    assert.ok(geo.getAttribute('position') && geo.getAttribute('normal') && geo.getAttribute('uv'), 'StatikGuruh uchun atributlar');
  }
  assert.ok(Math.abs(box.max.x - box.min.x - MASHINA.uzunlik) < 0.03, `uzunlik ${box.max.x - box.min.x}`);
  assert.ok(Math.abs(box.max.z - box.min.z - MASHINA.eni) < 0.03, `eni ${box.max.z - box.min.z}`);
  assert.ok(box.max.y > 1.55 && box.max.y < 1.75 && box.min.y > 0.2, `balandlik ${box.max.y}`);
  [g.kuzov, g.salon, g.yonOyna].forEach((x) => x.dispose());
  // Mashina izi (dunyoda) va turargoh: bino, panorama lift, kirish soyaboni va panjaraga tegmaydi
  const burchaklar = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => mashinaNuqtasi((sx * MASHINA.uzunlik) / 2, (sz * MASHINA.eni) / 2));
  const iz = { x0: Math.min(...burchaklar.map((p) => p[0])), x1: Math.max(...burchaklar.map((p) => p[0])), z0: Math.min(...burchaklar.map((p) => p[1])), z1: Math.max(...burchaklar.map((p) => p[1])) };
  assert.ok(!kesishadi(iz, OFIS) && iz.z0 > OFIS.z1 + 1.5, 'mashina binoga juda yaqin');
  assert.ok(!kesishadi(iz, PANORAMA_LIFT));
  assert.ok(iz.x0 > OFIS_ESHIGI.x1 + 1, 'mashina kirish eshigini to\'sgan');
  assert.ok(iz.z1 < 48 - 0.5, 'mashina panjaraga tegmaydi');
  assert.ok(TURARGOH_JOYI.uzunlik > MASHINA.uzunlik + 0.4 && TURARGOH_JOYI.eni > MASHINA.eni + 0.5);
  // Belgi ustuni va haydovchi mashina izidan tashqarida
  assert.ok(!nuqtaIchida(TURARGOH_BELGISI.x, TURARGOH_BELGISI.z, iz, 0.2));
  assert.ok(!nuqtaIchida(HAYDOVCHI.p[0], HAYDOVCHI.p[2], iz, 0.25) && HAYDOVCHI.p[2] > OFIS.z1 + 0.5, 'haydovchi mashina bilan bino orasida');
  assert.equal(HAYDOVCHI.tur, 'biznesmen');
});

test('brend nomlari yo\'q: canvasda chiziladigan matnlar va manba kodida avtomobil markalari, logotip matni yo\'q', () => {
  const taqiq = /rolls|royce|phantom|ghost|cullinan|spirit\s*of|ecstasy|bentley|maybach|mercedes|\bRR\b/i;
  for (const v of Object.values(TURARGOH_MATNLARI)) assert.ok(!taqiq.test(v), `matn: ${v}`);
  for (const f of ['ofisRejasi.ts', 'DirektorMashinasi.tsx', 'Ofis.tsx', 'mebelModellari.ts']) {
    const kod = manba(`src/Pages/Demo3DSex/${f}`);
    assert.ok(!taqiq.test(kod), `${f}: brend nomi`);
    // fillText ga faqat ma'lum matnlar beriladi
    for (const [, arg] of kod.matchAll(/fillText\(([^,]+),/g)) assert.ok(!taqiq.test(arg), `${f}: ${arg}`);
  }
});

test('maishiy: mebel, shkafcha va o\'rindiqlar xonalar ichida, bir-biriga va eshik yo\'liga kirmaydi', () => {
  const asosiy = MAISHIY_MEBELLARI.filter((j) => !j.ustida);
  const qatorlar = SHKAFCHA_QATORLARI.map(shkafchaQatoriIzi);
  const hammasi = [
    ...asosiy.map((j) => ({ nom: `${j.tur}@${j.p}`, iz: mebelIzi(j) })),
    ...qatorlar.map((iz, i) => ({ nom: `shkafchalar#${i}`, iz })),
    ...SKAMEYKALAR.map((iz, i) => ({ nom: `skameyka#${i}`, iz })),
    ...MAISHIY_TOSIQLARI.map((t) => ({ nom: t.nom, iz: t })),
  ];
  for (const { nom, iz } of hammasi) {
    assert.ok(ichida(iz, MAISHIY_ICHI), `${nom} binodan chiqib ketgan`);
    assert.ok(maishiyXonalari.some((x) => ichida(iz, x)), `${nom} hech bir xonaga sig'maydi`);
    for (const j of asosiy) assert.ok(Math.abs(j.p[1] - MAISHIY_POLI) < 1e-6);
  }
  for (let i = 0; i < hammasi.length; i++) {
    for (let k = i + 1; k < hammasi.length; k++) {
      assert.ok(!kesishadi(hammasi[i].iz, hammasi[k].iz), `${hammasi[i].nom} va ${hammasi[k].nom} kesishadi`);
    }
  }
  for (const d of MAISHIY_ICHKI_DEVORLARI) {
    for (const [a0, a1] of d.eshiklar) {
      const yolak = d.o === 'z' ? { x0: a0, x1: a1, z0: d.c - 0.6, z1: d.c + 0.6 } : { x0: d.c - 0.6, x1: d.c + 0.6, z0: a0, z1: a1 };
      for (const { nom, iz } of hammasi) assert.ok(!kesishadi(iz, yolak), `${nom} eshikni to'sib qo'ygan (${d.o}=${d.c})`);
    }
  }
  const raqamlar = SHKAFCHA_QATORLARI.flatMap((q) => shkafchalar(q).map((k) => k.raqam));
  assert.ok(raqamlar.length >= 40);
  assert.equal(new Set(raqamlar).size, raqamlar.length);
  assert.equal(MAISHIY_ESHIKLARI.kirish.x, MAISHIY.eshik[0]);
  assert.ok(MAISHIY_ESHIKLARI.kirish.z0 < MAISHIY.eshik[1] && MAISHIY.eshik[1] < MAISHIY_ESHIKLARI.kirish.z1);
  assert.ok(MAISHIY_ESHIKLARI.galereya.z0 >= GALEREYA.z0 && MAISHIY_ESHIKLARI.galereya.z1 <= GALEREYA.z1);
});

test('kiyinayotgan ishchilar shkafchaga qaragan, oshpaz peshtaxta ortida', () => {
  const kiyinuvchilar = MAISHIY_ODAMLARI.filter((o) => ['ishchi', 'oddiyErkak', 'ayolOddiy'].includes(o.tur) && o.p[2] < -9.7);
  assert.ok(kiyinuvchilar.length >= 3 && kiyinuvchilar.length <= 5);
  const hammaShkaf = SHKAFCHA_QATORLARI.flatMap(shkafchalar);
  for (const o of kiyinuvchilar) {
    const oldi = [Math.sin(o.burilish), Math.cos(o.burilish)];
    const yaqin = hammaShkaf.some((k) => {
      const dx = k.x - o.p[0];
      const dz = k.z - o.p[2];
      const l = Math.hypot(dx, dz);
      return l < 1.0 && (oldi[0] * dx + oldi[1] * dz) / l > 0.7;
    });
    assert.ok(yaqin, `${o.tur}@${o.p} shkafchaga qaramagan`);
  }
  const ovqatlanuvchilar = MAISHIY_ODAMLARI.filter((o) => o.harakat === 'otirish' && o.p[2] > -1.4);
  assert.ok(ovqatlanuvchilar.length >= 3 && ovqatlanuvchilar.length <= 4);
});

test('devor bo\'laklari teshiklarni chiqarib tashlaydi, olchamliQuti UV metrda', () => {
  const b = devorBolaklari(0, 10, 0, 3, [{ a0: 2, a1: 3, y0: 0, y1: 2.2 }, { a0: 5, a1: 8, y0: 1, y1: 2.5 }]);
  const yuza = b.reduce((s, x) => s + (x.a1 - x.a0) * (x.y1 - x.y0), 0);
  assert.ok(Math.abs(yuza - (30 - 2.2 - 4.5)) < 1e-9);
  for (const x of b) assert.ok(x.a1 > x.a0 && x.y1 > x.y0);
  const g = olchamliQutiGeometriyasi(4, 2, 1, 2);
  const uv = g.getAttribute('uv');
  let maxU = 0;
  for (let i = 0; i < uv.count; i++) maxU = Math.max(maxU, uv.getX(i));
  assert.ok(Math.abs(maxU - 2) < 1e-9, '4 m / 2 m = 2 takror');
  g.dispose();
  const kataklar = new Set();
  for (let r = 1; r <= 64; r++) {
    const c = atlasKatagi(r);
    assert.ok(c.u0 >= 0 && c.u1 <= 1 && c.v0 >= 0 && c.v1 <= 1 && c.u1 > c.u0 && c.v1 > c.v0);
    kataklar.add(`${c.u0},${c.v0}`);
  }
  assert.equal(kataklar.size, 64);
});

test('shkafcha geometriyasi: uchta birlashtirilgan geometriya, qator izi ichida', () => {
  const g = shkafchaGeometriyalari(SHKAFCHA_QATORLARI, MAISHIY_POLI);
  for (const nom of ['korpus', 'eshik', 'tag']) {
    const geo = g[nom];
    assert.ok(geo.getAttribute('position').count > 0);
    assert.ok(geo.getAttribute('uv') && geo.getAttribute('normal'));
    geo.computeBoundingBox();
    assert.ok(geo.boundingBox.max.y <= MAISHIY_POLI + SHKAFCHA.balandlik + 1e-6);
    assert.ok(geo.boundingBox.min.x >= MAISHIY_ICHI.x0 - 1e-6 && geo.boundingBox.max.x <= MAISHIY_ICHI.x1 + 1e-6);
    geo.dispose();
  }
});

test('mebel birlashtirish: haqiqiy GLB lar bilan pardoz bo\'yicha ≤ 10 geometriya (draw call)', async () => {
  const sahnalar = new Map();
  for (const tur of MEBEL_TURLARI) sahnalar.set(tur, (await glbYukla(MEBEL_MODELLARI[tur].fayl)).scene);
  for (const [nom, joylar] of [['ofis', OFIS_MEBELLARI], ['maishiy', MAISHIY_MEBELLARI]]) {
    const g = mebelGeometriyalari(sahnalar, joylar);
    assert.ok(g.size >= 6 && g.size <= PARDOZLAR.length, `${nom}: ${g.size} guruh`);
    let uchlar = 0;
    const box = new THREE.Box3();
    for (const geo of g.values()) {
      assert.deepEqual(Object.keys(geo.attributes).sort(), ['color', 'normal', 'position']);
      uchlar += geo.getAttribute('position').count;
      geo.computeBoundingBox();
      box.union(geo.boundingBox);
      geo.dispose();
    }
    assert.ok(uchlar < 1200000, `${nom}: ${uchlar} uch`);
    const bino = nom === 'ofis' ? OFIS : MAISHIY;
    assert.ok(box.min.x >= bino.x0 - 0.01 && box.max.x <= bino.x1 + 0.01 && box.min.z >= bino.z0 - 0.01 && box.max.z <= bino.z1 + 0.01, `${nom}: mebel binodan tashqarida`);
    if (nom === 'ofis') assert.ok(box.max.y < OFIS_TEPASI, 'mebel tomdan oshmaydi');
  }
  const n = stulVaOdam('kreslo', 0, 0, 0, 0, 'direktor');
  assert.ok(Math.abs(n.odam.p[2] - 0.04) < 1e-6 && n.odam.orindiq === 0.49);
});

test('manba: tashqi havola yo\'q, komponent fayllari faqat komponent eksport qiladi, GLB Draco siz', () => {
  for (const f of ['Ofis.tsx', 'Maishiy.tsx', 'DirektorMashinasi.tsx', 'mebelModellari.ts', 'ofisRejasi.ts']) {
    const kod = manba(`src/Pages/Demo3DSex/${f}`);
    assert.ok(!/https?:\/\//.test(kod), `${f}: tashqi havola`);
  }
  for (const f of ['Ofis.tsx', 'Maishiy.tsx', 'DirektorMashinasi.tsx']) {
    const kod = manba(`src/Pages/Demo3DSex/${f}`);
    const eksportlar = [...kod.matchAll(/export\s+(?:default\s+)?(function|const|let|class|type)\s+(\w+)/g)];
    for (const [, tur, nom] of eksportlar) {
      assert.equal(tur, 'function', `${f}: ${nom} komponent emas`);
      assert.ok(/^[A-Z]/.test(nom), `${f}: ${nom} katta harf bilan boshlanmaydi`);
    }
    assert.ok(/export default function (Ofis|Maishiy|DirektorMashinasi)\(/.test(kod));
    assert.ok(/\.dispose\(\)/.test(kod), `${f}: dispose yo'q`);
    assert.ok(!/new THREE\.\w*(Material|Geometry)\(/.test(kod), `${f}: render ichida new THREE.*`);
    assert.ok(/useMemo\(\(\) => \w+MateriallariYarat\(\), \[\]\)/.test(kod), `${f}: materiallar useMemo da emas`);
  }
  const ofis = manba('src/Pages/Demo3DSex/Ofis.tsx');
  assert.ok(/export default function Ofis\(\{ m \}: \{ m: Materiallar \}\)/.test(ofis));
  assert.ok(/useGLTF\(MEBEL_URLLARI[^,)]*, false, false\)/.test(ofis), 'mebel GLB lari Draco/Meshopt siz yuklanadi');
  assert.ok(/<Suspense/.test(ofis) && /<GlbOdam/.test(ofis) && /OFIS_ODAMLARI/.test(ofis) && /<DirektorMashinasi \/>/.test(ofis));
  assert.ok(/useFrame/.test(ofis) && /liftHolati/.test(ofis), 'lift useFrame da harakatlanadi');
  const maishiy = manba('src/Pages/Demo3DSex/Maishiy.tsx');
  assert.ok(/GALEREYA/.test(maishiy) && /shkafchaGeometriyalari/.test(maishiy));
});
