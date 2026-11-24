import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Umumiy geometriyalar: odam va avtomobil qismlari bir marta yaratiladi va barcha nusxalar shularni ishlatadi
// (xotira va draw call kamayadi). Bir materialdagi mayda qismlar (yuz, kaska, quloqchin) bitta geometriyaga birlashtiriladi.
// Sahifa yopilganda ham saqlanadi (kichik, qayta ochilganda qayta yaratilmaydi).

type V3 = [number, number, number];

function yumaloq(o: V3, r: number, p: V3 = [0, 0, 0]) {
  const g = new RoundedBoxGeometry(o[0], o[1], o[2], 3, Math.min(r, Math.min(...o) / 2 - 0.001));
  g.translate(...p);
  return g;
}
function quti(o: V3, p: V3 = [0, 0, 0], rx = 0) {
  const g = new THREE.BoxGeometry(...o);
  if (rx) g.rotateX(rx);
  g.translate(...p);
  return g;
}
function shar(r: number, s: V3, p: V3, w = 14, h = 10, phi0 = 0, phiL = Math.PI * 2, th0 = 0, thL = Math.PI) {
  const g = new THREE.SphereGeometry(r, w, h, phi0, phiL, th0, thL);
  g.scale(...s);
  g.translate(...p);
  return g;
}
function kapsula(r: number, l: number, p: V3, s: V3 = [1, 1, 1], seg = 12) {
  const g = new THREE.CapsuleGeometry(r, l, 4, seg);
  g.scale(...s);
  g.translate(...p);
  return g;
}
function silindr(rt: number, rb: number, h: number, p: V3, seg = 14, rz = 0, ochiq = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, ochiq);
  if (rz) g.rotateZ(rz);
  g.translate(...p);
  return g;
}
function birlashtir(qismlar: THREE.BufferGeometry[]) {
  // Hammasi bir xil bo'lishi shart: RoundedBoxGeometry indekssiz, qolganlari indeksli — hammasi indekssizga keltiriladi.
  const tayyor = qismlar.map((g) => (g.index ? g.toNonIndexed() : g));
  const natija = mergeGeometries(tayyor, false);
  qismlar.forEach((g) => g.dispose());
  tayyor.forEach((g) => g.dispose());
  if (!natija) throw new Error("Geometriyalarni birlashtirib bo'lmadi");
  return natija;
}

function odamYarat() {
  return {
    son: kapsula(0.078, 0.3, [0, -0.21, 0]),
    boldir: kapsula(0.064, 0.3, [0, -0.2, 0]),
    etik: yumaloq([0.115, 0.1, 0.27], 0.035, [0, -0.43, 0.045]),
    chanoq: yumaloq([0.33, 0.17, 0.2], 0.06, [0, 0.96, 0]),
    kamar: quti([0.335, 0.04, 0.205], [0, 0.05, 0]),
    kokrak: kapsula(0.165, 0.3, [0, 0.28, 0], [1, 1, 0.66], 16),
    jilet: kapsula(0.17, 0.24, [0, 0.27, 0], [1.03, 1, 0.7], 16),
    jiletChiziq: (() => {
      const g = birlashtir([silindr(0.174, 0.174, 0.032, [0, -0.07, 0], 24, 0, true), silindr(0.174, 0.174, 0.032, [0, 0.07, 0], 24, 0, true)]);
      g.scale(1.03, 1, 0.7);
      g.translate(0, 0.27, 0);
      return g;
    })(),
    boyin: silindr(0.045, 0.045, 0.1, [0, 0.58, 0], 12),
    // Bosh guruhi ichida (bosh markazi — 0):
    teri: birlashtir([
      shar(0.1, [0.9, 1.08, 0.96], [0, 0, 0], 20, 16),
      shar(0.024, [0.45, 1, 0.75], [-0.09, 0, 0], 10, 8),
      shar(0.024, [0.45, 1, 0.75], [0.09, 0, 0], 10, 8),
      shar(0.016, [0.8, 1.1, 1], [0, -0.005, 0.097], 10, 8),
    ]),
    yuz: birlashtir([
      shar(0.011, [1, 1, 1], [-0.034, 0.018, 0.086], 10, 8),
      shar(0.011, [1, 1, 1], [0.034, 0.018, 0.086], 10, 8),
      quti([0.03, 0.007, 0.01], [-0.034, 0.04, 0.088]),
      quti([0.03, 0.007, 0.01], [0.034, 0.04, 0.088]),
    ]),
    lab: quti([0.04, 0.006, 0.01], [0, -0.045, 0.088]),
    sochOrqa: shar(0.103, [0.94, 1.08, 0.99], [0, 0.012, -0.004], 18, 12, Math.PI, Math.PI, 0, Math.PI * 0.62),
    sochTepa: shar(0.104, [0.94, 1, 1], [0, 0.02, 0], 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.36),
    kaska: (() => {
      const g = birlashtir([
        shar(0.118, [1, 0.92, 1.1], [0, 0, 0], 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        (() => { const b = silindr(0.128, 0.13, 0.012, [0, 0, 0], 24); b.scale(1, 1, 1.18); b.translate(0, 0.002, 0.02); return b; })(),
        quti([0.028, 0.02, 0.21], [0, 0.105, 0]),
      ]);
      g.translate(0, 0.03, 0);
      return g;
    })(),
    kepka: (() => {
      const g = birlashtir([shar(0.107, [1, 1, 1], [0, 0, 0], 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), quti([0.15, 0.012, 0.09], [0, 0.005, 0.12], -0.15)]);
      g.translate(0, 0.025, 0);
      return g;
    })(),
    kozoynak: quti([0.15, 0.036, 0.014], [0, 0.02, 0.098]),
    quloqchin: birlashtir([silindr(0.042, 0.042, 0.04, [-0.1, 0, 0], 14, Math.PI / 2), silindr(0.042, 0.042, 0.04, [0.1, 0, 0], 14, Math.PI / 2)]),
    // Qo'l (yelka bo'g'imi ichida; bilak guruhi y = −0.29):
    yelka: kapsula(0.054, 0.2, [0, -0.14, 0]),
    tirsak: kapsula(0.046, 0.18, [0, -0.12, 0]),
    kaft: yumaloq([0.065, 0.1, 0.04], 0.018, [0, -0.28, 0.005]),
    planshet: quti([0.24, 0.17, 0.015], [0, 0.3, 0.3], -0.9),
    nishon: quti([0.06, 0.07, 0.01], [-0.08, 0.38, 0.115]),
  };
}
export type OdamGeometriyasi = ReturnType<typeof odamYarat>;
let odam: OdamGeometriyasi | null = null;
/** Odam qismlari (bir marta yaratiladi). */
export function odamGeometriyasi() {
  odam ??= odamYarat();
  return odam;
}

function avtomobilYarat() {
  const g = {
    kuzov: birlashtir([
      yumaloq([1.78, 0.62, 4.5], 0.2, [0, 0.6, 0]),
      yumaloq([1.5, 0.08, 1.9], 0.035, [0, 1.42, -0.3]),
      quti([0.06, 0.5, 0.08], [-0.84, 1.12, 0.3]),
      quti([0.06, 0.5, 0.08], [0.84, 1.12, 0.3]),
    ]),
    oyna: yumaloq([1.6, 0.58, 2.3], 0.2, [0, 1.12, -0.25]),
    oldChiroq: birlashtir([quti([0.36, 0.12, 0.04], [-0.62, 0.72, 2.24]), quti([0.36, 0.12, 0.04], [0.62, 0.72, 2.24])]),
    orqaChiroq: birlashtir([quti([0.36, 0.12, 0.04], [-0.62, 0.78, -2.24]), quti([0.36, 0.12, 0.04], [0.62, 0.78, -2.24])]),
    rama: birlashtir([
      quti([1.7, 0.16, 0.1], [0, 0.38, 2.22]),
      quti([1.7, 0.16, 0.1], [0, 0.38, -2.22]),
      ...[[-0.82, 1.4], [0.82, 1.4], [-0.82, -1.4], [0.82, -1.4]].map(([x, z]) => silindr(0.33, 0.33, 0.22, [x, 0.33, z], 16, Math.PI / 2)),
    ]),
  };
  return g;
}
export type AvtomobilGeometriyasi = ReturnType<typeof avtomobilYarat>;
let avtomobil: AvtomobilGeometriyasi | null = null;
/** Yengil avtomobil qismlari (instancing uchun; bir marta yaratiladi). */
export function avtomobilGeometriyasi() {
  avtomobil ??= avtomobilYarat();
  return avtomobil;
}
