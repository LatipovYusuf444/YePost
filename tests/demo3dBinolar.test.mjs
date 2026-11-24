// 3D Demo — ofis va maishiy blok: mebel modellari ro'yxati (GLB bilan solishtiriladi), joylashuv (bino ichida, devordan
// o'tmaydi, bir-biriga kirmaydi), stullar stolga qaraydi, o'tirganlar o'tira oladigan modellar, shkafchalar va birlashtirish.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  DIREKTOR_STOLI,
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
  OFIS_ICHI,
  OFIS_ISH_JOYLARI,
  OFIS_MEBELLARI,
  OFIS_ODAMLARI,
  OFIS_OTIRISH_JUFTLARI,
  OFIS_POLLARI,
  OFIS_STOL_GURUHLARI,
  OFIS_TOSIQLARI,
  OFIS_XONALARI,
  OFIS_YURUVCHILARI,
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
import { GALEREYA, MAISHIY, OFIS } from '../src/Pages/Demo3DSex/hudud.ts';
import { harakatniHal } from '../src/Pages/Demo3DSex/odamModellari.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const MEBEL_PAPKA = new URL('../public/models/demo3d/mebel/', import.meta.url);
const XATO = 0.005;

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
const maishiyXonalari = Object.values(MAISHIY_XONALARI);

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
  // Matritsa: chegara markazi p ustida, pastki nuqta polda
  const m = mebelMatritsasi({ tur: 'stol', p: [5, 1, -3], b: Math.PI / 2 });
  const [mn, mx] = MEBEL_MODELLARI.stol.chegara;
  const markaz = new THREE.Vector3((mn[0] + mx[0]) / 2, mn[1], (mn[2] + mx[2]) / 2).applyMatrix4(m);
  assert.ok(markaz.distanceTo(new THREE.Vector3(5, 1, -3)) < 1e-9);
});

test('ofis: mebel bino ichida, qavat polida, har biri bitta xona ichida (devordan o\'tmaydi)', () => {
  assert.ok(OFIS_MEBELLARI.length > 80);
  for (const j of OFIS_MEBELLARI) {
    const iz = mebelIzi(j);
    assert.ok(ichida(iz, OFIS_ICHI), `${j.tur} @${j.p} ofisdan chiqib ketgan`);
    const y = qavati(j.p[1]);
    if (!j.ustida) assert.ok(j.p[1] - y >= -1e-6 && j.p[1] - y < 0.13, `${j.tur} @${j.p} polda emas`);
    assert.ok(ofisXonalari(y).some((x) => ichida(iz, x)), `${j.tur} @${j.p} hech bir xonaga sig'maydi`);
  }
  for (const t of OFIS_TOSIQLARI) assert.ok(ofisXonalari(t.y).some((x) => ichida(t, x)), `${t.nom} xonaga sig'maydi`);
});

test('ofis: stollar, stullar va jihozlar bir-biriga kirmaydi', () => {
  const asosiy = OFIS_MEBELLARI.filter((j) => !j.ustida);
  const stollar = OFIS_ISH_JOYLARI.map((i) => i.stol);
  assert.ok(stollar.length >= 10 && stollar.length <= 16, `ish stollari ${stollar.length}`);
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
  // Stol ustidagi jihozlar stol yuzasida
  for (const ij of OFIS_ISH_JOYLARI) {
    const s = mebelIzi(ij.stol);
    for (const j of ij.jihozlar) {
      const iz = mebelIzi(j);
      assert.ok(ichida(iz, s, 0.03), `${j.tur} stol ustidan chiqib ketgan`);
      assert.ok(Math.abs(j.p[1] - (ij.stol.p[1] + STOL.balandlik)) < 0.01);
    }
  }
  // Stol guruhlari orasidagi to'siq stollar orasidagi tirqishda
  for (const g of OFIS_STOL_GURUHLARI) {
    const shimol = g.joylar.filter((j) => j.stol.b === Math.PI).map((j) => mebelIzi(j.stol));
    const janub = g.joylar.filter((j) => j.stol.b === 0).map((j) => mebelIzi(j.stol));
    for (const s of shimol) assert.ok(s.z1 <= g.bolgich.z - 0.005);
    for (const s of janub) assert.ok(s.z0 >= g.bolgich.z + 0.005);
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
  assert.ok(juftlar.length >= 50);
  for (const { stul, nishon } of juftlar) {
    const { dot, l } = qaraydi(stul, nishon);
    assert.ok(dot > 0.85, `${stul.tur}@${stul.p} stolga qaramagan (${dot.toFixed(2)})`);
    assert.ok(l < 2.8, `${stul.tur}@${stul.p} stoldan uzoq (${l.toFixed(2)})`);
  }
  // Har ish stolining kreslosi uning foydalanuvchi tomonida
  for (const ij of OFIS_ISH_JOYLARI) {
    const b = ij.stol.b ?? 0;
    const dx = ij.stul.p[0] - ij.stol.p[0];
    const dz = ij.stul.p[2] - ij.stol.p[2];
    assert.ok(Math.sin(b) * dx + Math.cos(b) * dz > 0.7, 'kreslo stolning old tomonida emas');
  }
});

test('odamlar: o\'tirganlar o\'tira oladigan modellar va o\'rindiq ustida; hammasi xona ichida va mebelga kirmaydi', () => {
  const tekshir = (odamlar, mebel, xonalar, nom) => {
    const asosiy = mebel.filter((j) => !j.ustida);
    for (const o of odamlar) {
      const [x, y, z] = o.p;
      assert.ok(xonalar(y).some((t) => nuqtaIchida(x, z, t, -0.15)), `${nom}: ${o.tur}@${o.p} xonada emas`);
      if (o.harakat === 'otirish') {
        assert.equal(harakatniHal(o.tur, 'otirish'), 'otirish', `${o.tur} o'tira olmaydi`);
        const stul = asosiy.find((j) => ORINDIQLAR[j.tur] && Math.hypot(j.p[0] - x, j.p[2] - z) < 0.5 && Math.abs(j.p[1] - y) < 1e-6);
        assert.ok(stul, `${nom}: ${o.tur}@${o.p} ostida stul yo'q`);
        assert.ok(Math.abs((o.burilish - (stul.b ?? 0) + 8 * Math.PI) % (2 * Math.PI)) < 1e-6 || Math.abs(((o.burilish - (stul.b ?? 0) + 8 * Math.PI) % (2 * Math.PI)) - 2 * Math.PI) < 1e-6, 'odam stul bilan bir tomonga qaraydi');
        assert.ok(o.orindiq > 0.38 && o.orindiq < 0.56);
      } else {
        // Tik turgan odam (radius 0.2) hech bir mebel yoki to'siqqa kirmaydi
        for (const j of asosiy) {
          if (Math.abs(j.p[1] - y) > 0.2) continue;
          assert.ok(!nuqtaIchida(x, z, mebelIzi(j), 0.15), `${nom}: ${o.tur}@${o.p} ${j.tur}@${j.p} ichida`);
        }
      }
    }
  };
  tekshir(OFIS_ODAMLARI, OFIS_MEBELLARI, (y) => ofisXonalari(qavati(y)), 'ofis');
  tekshir(MAISHIY_ODAMLARI, MAISHIY_MEBELLARI, () => maishiyXonalari, 'maishiy');
  const direktor = OFIS_ODAMLARI.filter((o) => o.tur === 'direktor');
  assert.equal(direktor.length, 1);
  assert.equal(direktor[0].harakat, 'otirish');
  assert.ok(Math.abs(direktor[0].p[1] - OFIS_POLLARI[2]) < 1e-6, 'direktor yuqori qavatda');
  assert.ok(Math.abs(direktor[0].p[0] - DIREKTOR_STOLI.x) < 0.3);
  assert.ok(OFIS_ODAMLARI.length >= 15 && OFIS_ODAMLARI.length <= 28, `ofisda ${OFIS_ODAMLARI.length} odam`);
  assert.ok(MAISHIY_ODAMLARI.length >= 8 && MAISHIY_ODAMLARI.length <= 14);
  // Majlislar zalida: 3–4 o'tirgan, bitta ma'ruzachi
  const zal = OFIS_XONALARI.find((x) => x.nom === 'majlislar');
  const zalda = OFIS_ODAMLARI.filter((o) => Math.abs(o.p[1] - zal.y) < 1e-6 && nuqtaIchida(o.p[0], o.p[2], zal));
  assert.ok(zalda.filter((o) => o.harakat === 'otirish').length >= 3);
  assert.equal(zalda.filter((o) => o.harakat === 'gaplashish').length, 1);
  // Ochiq ofisda 6–10 ish stolida xodim
  const ochiq = OFIS_XONALARI.find((x) => x.nom === 'ochiqOfis');
  const xodimlar = OFIS_ODAMLARI.filter((o) => o.harakat === 'otirish' && Math.abs(o.p[1] - ochiq.y) < 1e-6 && nuqtaIchida(o.p[0], o.p[2], ochiq));
  assert.ok(xodimlar.length >= 6 && xodimlar.length <= 10);
  // Ochiq ofisda 6–10 ta monitorli ish stoli
  const ochiqStollar = OFIS_ISH_JOYLARI.filter((i) => Math.abs(i.stol.p[1] - ochiq.y) < 1e-6 && nuqtaIchida(i.stol.p[0], i.stol.p[2], ochiq));
  assert.ok(ochiqStollar.length >= 6 && ochiqStollar.length <= 10, `ochiq ofisda ${ochiqStollar.length} stol`);
  assert.ok(ochiqStollar.every((i) => i.jihozlar.some((j) => j.tur === 'monitor')));
  assert.ok(xodimlar.every((o) => o.tur === 'xodimErkak' || o.tur === 'xodimAyol'));
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
  // Ichki devor eshiklari oldi bo'sh (0.6 m chuqurlikda)
  for (const d of MAISHIY_ICHKI_DEVORLARI) {
    for (const [a0, a1] of d.eshiklar) {
      const yolak = d.o === 'z' ? { x0: a0, x1: a1, z0: d.c - 0.6, z1: d.c + 0.6 } : { x0: d.c - 0.6, x1: d.c + 0.6, z0: a0, z1: a1 };
      for (const { nom, iz } of hammasi) assert.ok(!kesishadi(iz, yolak), `${nom} eshikni to'sib qo'ygan (${d.o}=${d.c})`);
    }
  }
  // Shkafchalar: 50 dan ortiq, raqamlar takrorlanmaydi
  const raqamlar = SHKAFCHA_QATORLARI.flatMap((q) => shkafchalar(q).map((k) => k.raqam));
  assert.ok(raqamlar.length >= 40);
  assert.equal(new Set(raqamlar).size, raqamlar.length);
  // Eshiklar hudud rejasidagi joyda
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
    // Qaragan tomonda 0.9 m ichida shkafcha bor
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

test('yuruvchilar yo\'li mebel va to\'siqlardan o\'tmaydi; maishiy yo\'li eshiklar va galereyadan o\'tadi', () => {
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
  for (const y of OFIS_YURUVCHILARI) tekshir(y, OFIS_MEBELLARI, OFIS_TOSIQLARI.filter((t) => t.y === y.y), 'ofis');
  const maishiyTosiqlar = [...MAISHIY_TOSIQLARI, ...SHKAFCHA_QATORLARI.map(shkafchaQatoriIzi), ...SKAMEYKALAR];
  for (const y of MAISHIY_YURUVCHILARI) {
    tekshir(y, MAISHIY_MEBELLARI, maishiyTosiqlar, 'maishiy');
    // Devorlarni faqat eshik ochig'idan kesib o'tadi
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
      // Tashqi g'arbiy devor (x = 40) — galereya eshigidan
      if ((ax - MAISHIY.x0) * (bx - MAISHIY.x0) < 0) {
        const q = az + ((bz - az) * (MAISHIY.x0 - ax)) / (bx - ax);
        assert.ok(q > MAISHIY_ESHIKLARI.galereya.z0 + 0.2 && q < MAISHIY_ESHIKLARI.galereya.z1 - 0.2);
      }
    }
    // Galereya ichidan o'tadi
    const galereyada = y.nuqtalar.filter(([x]) => x > GALEREYA.x0 && x < GALEREYA.x1);
    for (const [, z] of galereyada) assert.ok(z > GALEREYA.z0 + 0.3 && z < GALEREYA.z1 - 0.3);
  }
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
  // Atlas kataklari 0…1 ichida va takrorlanmaydi
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
    assert.ok(uchlar < 600000, `${nom}: ${uchlar} uch`);
    const bino = nom === 'ofis' ? OFIS : MAISHIY;
    assert.ok(box.min.x >= bino.x0 - 0.01 && box.max.x <= bino.x1 + 0.01 && box.min.z >= bino.z0 - 0.01 && box.max.z <= bino.z1 + 0.01, `${nom}: mebel binodan tashqarida`);
  }
  // stulVaOdam: odam o'rindiq markazi ustida, kreslo oldiga 4 sm
  const n = stulVaOdam('kreslo', 0, 0, 0, 0, 'direktor');
  assert.ok(Math.abs(n.odam.p[2] - 0.04) < 1e-6 && n.odam.orindiq === 0.49);
});

test('manba: tashqi havola yo\'q, komponent fayllari faqat komponent eksport qiladi, GLB Draco siz', () => {
  for (const f of ['Ofis.tsx', 'Maishiy.tsx', 'mebelModellari.ts']) {
    const kod = manba(`src/Pages/Demo3DSex/${f}`);
    assert.ok(!/https?:\/\//.test(kod), `${f}: tashqi havola`);
  }
  for (const f of ['Ofis.tsx', 'Maishiy.tsx']) {
    const kod = manba(`src/Pages/Demo3DSex/${f}`);
    const eksportlar = [...kod.matchAll(/export\s+(?:default\s+)?(function|const|let|class|type)\s+(\w+)/g)];
    for (const [, tur, nom] of eksportlar) {
      assert.equal(tur, 'function', `${f}: ${nom} komponent emas`);
      assert.ok(/^[A-Z]/.test(nom), `${f}: ${nom} katta harf bilan boshlanmaydi`);
    }
    assert.ok(/export default function (Ofis|Maishiy)\(/.test(kod));
    assert.ok(/\.dispose\(\)/.test(kod), `${f}: dispose yo'q`);
    // Material va geometriya komponentda yaratilmaydi (mebelModellari.ts dagi fabrikalar useMemo ichida chaqiriladi)
    assert.ok(!/new THREE\.\w*(Material|Geometry)\(/.test(kod), `${f}: render ichida new THREE.*`);
    assert.ok(/useMemo\(\(\) => \w+MateriallariYarat\(\), \[\]\)/.test(kod), `${f}: materiallar useMemo da emas`);
  }
  const ofis = manba('src/Pages/Demo3DSex/Ofis.tsx');
  assert.ok(/useGLTF\(MEBEL_URLLARI[^,)]*, false, false\)/.test(ofis), 'mebel GLB lari Draco/Meshopt siz yuklanadi');
  assert.ok(/<Suspense/.test(ofis) && /<GlbOdam/.test(ofis) && /tur="direktor"|OFIS_ODAMLARI/.test(ofis));
  const maishiy = manba('src/Pages/Demo3DSex/Maishiy.tsx');
  assert.ok(/GALEREYA/.test(maishiy) && /shkafchaGeometriyalari/.test(maishiy));
});

test('ofis qavatlari hudud rejasiga mos: 3 qavat × 3.6 m, yuqori qavat poli 7.25', () => {
  assert.equal(OFIS_POLLARI.length, OFIS.qavatlar);
  OFIS_POLLARI.forEach((y, k) => assert.ok(Math.abs(y - (0.05 + k * OFIS.qavatBalandligi)) < 1e-9));
  assert.ok(MAISHIY_ICHI.x0 > MAISHIY.x0 && MAISHIY_ICHI.x1 < MAISHIY.x1);
});
