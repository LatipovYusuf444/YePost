// 3D Demo — yuklab olingan odam modellari: klip tanlash, masshtab (bo'y), o'tirish siljishi, yo'l bo'ylab harakat va
// ishga kelib-ketish jadvali. GLB fayllar JSON qismi o'qilib, kodda yozilgan o'lchamlar fayl bilan solishtiriladi.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  ODAM_MODELLARI,
  ODAM_TURLARI,
  ORINDIQ_BALANDLIGI,
  KELIB_KETISH_DAVRI,
  burchakFarqi,
  harakatniHal,
  kelibKetuvchiHolati,
  kelibKetuvchiJadvali,
  kelibKetuvchilar,
  klipNomi,
  odamMasshtabi,
  odamUrl,
  otirishBoshlanishi,
  otirishSiljishi,
  tabiiyYurishTezligi,
  yolJadvali,
  yoldagiHolat,
  yolUzunligi,
  yonSiljitilganYol,
  yurishTezligiKoef,
} from '../src/Pages/Demo3DSex/odamModellari.ts';
import { PIYODA_YOLLARI } from '../src/Pages/Demo3DSex/hudud.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const HARAKATLAR = ['turish', 'yurish', 'ishlash', 'otirish', 'qolSilkitish', 'gaplashish'];
const yaqin = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

/** GLB ning JSON qismi. */
function glbJson(fayl) {
  const b = readFileSync(new URL(`../public/models/demo3d/odamlar/${fayl}`, import.meta.url));
  assert.equal(b.readUInt32LE(0), 0x46546c67, `${fayl}: glTF sarlavhasi`);
  const len = b.readUInt32LE(12);
  return JSON.parse(b.toString('utf8', 20, 20 + len));
}
const GLB = Object.fromEntries(ODAM_TURLARI.map((t) => [t, glbJson(ODAM_MODELLARI[t].fayl)]));
/** Klip davomiyligi: samplerlar kirish (vaqt) accessorining max qiymati. */
function klipDavomiyligi(j, nom) {
  const a = j.animations.find((x) => x.name === nom);
  if (!a) return null;
  return Math.max(...a.samplers.map((s) => j.accessors[s.input].max[0]));
}

test('har tur uchun fayl bor, manzil BASE_URL bilan (node da "/")', () => {
  assert.equal(ODAM_TURLARI.length, 8);
  for (const t of ODAM_TURLARI) {
    assert.equal(odamUrl(t), `/models/demo3d/odamlar/${ODAM_MODELLARI[t].fayl}`);
    assert.ok(existsSync(new URL(`../public/models/demo3d/odamlar/${ODAM_MODELLARI[t].fayl}`, import.meta.url)), t);
  }
});

test('klip tanlash: har tur × harakat GLB da mavjud klipga tushadi, zaxiralar to‘g‘ri', () => {
  const kutilgan = {
    toliq: { turish: 'Idle', yurish: 'Walk', ishlash: 'Interact', otirish: 'Idle', qolSilkitish: 'Wave', gaplashish: 'Idle_Neutral' },
    erkak: { turish: 'Man_Idle', yurish: 'Man_Walk', ishlash: 'Man_Idle', otirish: 'Man_Sitting', qolSilkitish: 'Man_Idle', gaplashish: 'Man_Idle' },
    ayol: { turish: 'Female_Idle', yurish: 'Female_Walk', ishlash: 'Female_Idle', otirish: 'Female_Sitting', qolSilkitish: 'Female_Idle', gaplashish: 'Female_Idle' },
  };
  const guruh = { ishchi: 'toliq', biznesmen: 'toliq', oddiyErkak: 'toliq', ayolRasmiy: 'toliq', ayolOddiy: 'toliq', direktor: 'erkak', xodimErkak: 'erkak', xodimAyol: 'ayol' };
  for (const t of ODAM_TURLARI) {
    const skelet = ODAM_MODELLARI[t].skelet;
    const nomlar = new Set(GLB[t].animations.map((a) => a.name));
    for (const h of HARAKATLAR) {
      const nom = klipNomi(t, h);
      assert.equal(nom, `${skelet}|${kutilgan[guruh[t]][h]}`, `${t}/${h}`);
      assert.ok(nomlar.has(nom), `${t}: ${nom} GLB da yo'q`);
    }
  }
  assert.equal(harakatniHal('ishchi', 'otirish'), 'turish');
  assert.equal(harakatniHal('biznesmen', 'qolSilkitish'), 'qolSilkitish');
  assert.equal(harakatniHal('direktor', 'qolSilkitish'), 'turish');
  assert.equal(harakatniHal('xodimAyol', 'otirish'), 'otirish');
});

test('bo‘y: yozilgan xom balandlik GLB bilan mos, masshtab bilan turgan odam 1.75–1.85 m', () => {
  for (const t of ODAM_TURLARI) {
    const j = GLB[t];
    // Mesh tugunlari: −90° X burilish + 100 masshtab (Z yuqori) — balandlik = POSITION.max[2] × 100
    const meshTugunlari = j.nodes.filter((n) => n.mesh !== undefined);
    for (const n of meshTugunlari) assert.deepEqual(n.scale, [100, 100, 100], `${t}: ${n.name} masshtabi`);
    const maxZ = Math.max(...j.meshes.flatMap((m) => m.primitives.map((p) => j.accessors[p.attributes.POSITION].max[2])));
    const minZ = Math.min(...j.meshes.flatMap((m) => m.primitives.map((p) => j.accessors[p.attributes.POSITION].min[2])));
    const m = ODAM_MODELLARI[t];
    assert.ok(yaqin(maxZ * 100, m.xomBalandlik, 1e-4), `${t}: ${maxZ * 100} ≠ ${m.xomBalandlik}`);
    assert.ok(Math.abs(minZ * 100) < 0.03 * m.xomBalandlik, `${t}: oyoq y≈0`);
    // Poza balandligi bind pozadan biroz past (bosh egilgan), 3% dan ko'p emas
    const nisbat = m.turishBalandligi / m.xomBalandlik;
    assert.ok(nisbat > 0.97 && nisbat <= 1, `${t}: nisbat ${nisbat}`);
    const boy = m.turishBalandligi * odamMasshtabi(t);
    assert.ok(boy >= 1.75 && boy <= 1.85, `${t}: ${boy}`);
    assert.ok(yaqin(boy, m.boy), t);
    // Skelet va kliplar spetsifikatsiyaga mos
    assert.equal(j.skins[0].joints.length, m.skelet === 'CharacterArmature' ? 62 : 31, `${t}: bo'g'imlar`);
  }
  assert.ok(odamMasshtabi('ishchi') > 0.95 && odamMasshtabi('ishchi') < 1.0);
  assert.ok(odamMasshtabi('direktor') > 0.36 && odamMasshtabi('direktor') < 0.4);
});

test('o‘tirish: faqat direktor/xodimlar; o‘rindiq 0.47 m, markazi p da, takrorlanadigan qism klip ichida', () => {
  for (const t of ['ishchi', 'biznesmen', 'oddiyErkak', 'ayolRasmiy', 'ayolOddiy']) {
    assert.equal(otirishSiljishi(t), null, t);
    assert.equal(otirishBoshlanishi(t), null, t);
  }
  for (const t of ['direktor', 'xodimErkak', 'xodimAyol']) {
    const o = otirishSiljishi(t);
    const m = ODAM_MODELLARI[t];
    const s = odamMasshtabi(t);
    // Son osti (model birligida) masshtabdan keyin + siljish = o'rindiq balandligi
    assert.ok(yaqin(m.otirish.orindiqOstiY * s + o.y, ORINDIQ_BALANDLIGI), t);
    assert.ok(o.y > 0 && o.y < 0.1, `${t}: oyoq poldan ${o.y.toFixed(3)} m yuqori`);
    assert.ok(o.z > 0.15 && o.z < 0.22, `${t}: ildiz o'rindiq markazidan oldinda ${o.z}`);
    // O'rindiq balandligi parametri chiziqli siljitadi
    assert.ok(yaqin(otirishSiljishi(t, 0.42).y, o.y - 0.05));
    const davom = klipDavomiyligi(GLB[t], klipNomi(t, 'otirish'));
    assert.ok(davom > 8 && otirishBoshlanishi(t) > 0.3 && otirishBoshlanishi(t) < 1, `${t}: ${davom}`);
  }
});

test('yurish tezligi: klip tabiiy tezligi 1–1.7 m/s, koeffitsient oyoqni sirpantirmaydi va cheklanadi', () => {
  for (const t of ODAM_TURLARI) {
    const davom = klipDavomiyligi(GLB[t], klipNomi(t, 'yurish'));
    const v = tabiiyYurishTezligi(t, davom);
    assert.ok(v > 1 && v < 1.7, `${t}: ${v}`);
    assert.ok(yaqin(yurishTezligiKoef(t, v, davom), 1));
    assert.ok(yaqin(yurishTezligiKoef(t, v * 1.2, davom), 1.2));
    assert.equal(yurishTezligiKoef(t, 100, davom), 2);
    assert.equal(yurishTezligiKoef(t, 0.01, davom), 0.5);
  }
});

test('yo‘l: uzunlik, mayatnik va halqa, to‘xtashlar, yo‘nalish burchagi', () => {
  const L = [[0, 0], [4, 0], [4, 3]];
  assert.equal(yolUzunligi(L), 7);
  assert.equal(yolUzunligi(L, true), 12);
  // Mayatnik: 0→1→2→1→0, davr = 2·7 / v
  const m = yolJadvali(L, { rejim: 'mayatnik', tezlik: 1 });
  assert.equal(m.davr, 14);
  let h = yoldagiHolat(m, 2);
  assert.deepEqual([h.x, h.z, h.yurmoqda], [2, 0, true]);
  assert.ok(yaqin(h.burchak, Math.PI / 2)); // +x ga
  h = yoldagiHolat(m, 5.5);
  assert.deepEqual([h.x, h.z], [4, 1.5]);
  assert.ok(yaqin(h.burchak, 0)); // +z ga
  h = yoldagiHolat(m, 8.5); // qaytishda
  assert.deepEqual([h.x, h.z], [4, 1.5]);
  assert.ok(yaqin(Math.abs(h.burchak), Math.PI)); // −z ga
  h = yoldagiHolat(m, 14 + 2); // davriy
  assert.deepEqual([h.x, h.z], [2, 0]);
  assert.deepEqual([yoldagiHolat(m, -12).x, yoldagiHolat(m, -12).z], [2, 0]);
  // Halqa: oxirgi nuqtadan boshiga qaytadi
  const q = yolJadvali(L, { rejim: 'halqa', tezlik: 2 });
  assert.equal(q.davr, 6);
  h = yoldagiHolat(q, 5);
  assert.ok(yaqin(h.x, 1.6) && yaqin(h.z, 1.2)); // 10 m: 4 + 3 + yopuvchi bo‘lakda 3 m
  // To'xtash: har nuqtada 1 s, turib qolganda kelgan yo'nalishiga qaraydi
  const p = yolJadvali(L, { rejim: 'mayatnik', tezlik: 1, toxtash: 1 });
  assert.equal(p.davr, 14 + 4);
  h = yoldagiHolat(p, 0.5);
  assert.deepEqual([h.x, h.z, h.yurmoqda, h.nuqta], [0, 0, false, 0]);
  assert.ok(yaqin(Math.abs(h.burchak), Math.PI / 2)); // qaytib kelgan: −x ga
  h = yoldagiHolat(p, 1 + 4 + 0.5);
  assert.deepEqual([h.x, h.z, h.yurmoqda, h.nuqta], [4, 0, false, 1]);
  assert.ok(yaqin(h.burchak, Math.PI / 2));
  // Nuqta bo'yicha to'xtash massivi
  const r = yolJadvali(L, { rejim: 'birYonalish', tezlik: 1, toxtash: [0, 3] });
  assert.equal(r.davr, 10);
  assert.equal(yoldagiHolat(r, 5).yurmoqda, false);
  const oxiri = yoldagiHolat(r, 99);
  assert.deepEqual([oxiri.x, oxiri.z, oxiri.yurmoqda], [4, 3, false]);
  // Burchak farqi eng qisqa yo'ldan
  assert.ok(yaqin(burchakFarqi(Math.PI - 0.1, -Math.PI + 0.1), 0.2));
  assert.ok(yaqin(burchakFarqi(0.1, -0.1), -0.2));
});

test('yo‘lni o‘ng tomonga siljitish: to‘g‘ri chiziq va burchakda miter', () => {
  // +x ga yurganda o'ng tomon — +z (y yuqori, oldinga +x: o'ng = (−dz, dx) = (0, 1))
  const s = yonSiljitilganYol([[0, 0], [10, 0], [10, 10]], 0.5);
  assert.deepEqual(s[0], [0, 0.5]);
  assert.ok(yaqin(s[1][0], 9.5) && yaqin(s[1][1], 0.5));
  assert.ok(yaqin(s[2][0], 9.5) && yaqin(s[2][1], 10));
  // Teskari yo'nalishda boshqa tomonga suriladi — qarama-qarshi yuruvchilar orasi 2·d
  const t = yonSiljitilganYol([[10, 0], [0, 0]], 0.5);
  assert.deepEqual(t[0], [10, -0.5]);
  // Takroriy nuqta buzmaydi
  const u = yonSiljitilganYol([[0, 0], [0, 0], [0, 5]], 1);
  assert.ok(u.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])));
});

test('kelib-ketish: deterministik, 10–14 kishi, yo‘llar bekat/turargoh ↔ KPP turniketi ↔ maishiy/ofis', () => {
  const a = kelibKetuvchilar();
  const b = kelibKetuvchilar();
  assert.deepEqual(a, b);
  assert.ok(a.length >= 10 && a.length <= 14);
  assert.equal(new Set(a.map((k) => k.id)).size, a.length);
  const yaqinNuqta = (p, q, d = 0.6) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= d;
  const P = PIYODA_YOLLARI;
  const tashqi = [P.bekatdanKpp[0], P.turargohdanKpp[0]];
  const bino = [P.kppdanMaishiy.at(-1), P.kppdanOfis.at(-1)];
  for (const k of a) {
    const [bosh, oxir] = [k.yol[0], k.yol.at(-1)];
    if (k.yonalish === 'kelish') {
      assert.ok(tashqi.some((q) => yaqinNuqta(bosh, q)) && bino.some((q) => yaqinNuqta(oxir, q)), k.id);
    } else {
      assert.ok(bino.some((q) => yaqinNuqta(bosh, q)) && tashqi.some((q) => yaqinNuqta(oxir, q)), k.id);
    }
    // Turniket — KPP ichida (0, 45.8) atrofida, faqat shu yerda to'xtaydi
    assert.ok(yaqinNuqta(k.yol[k.turniket], [0, 45.8]), k.id);
    assert.ok(k.toxtash.every((t, i) => (i === k.turniket ? t > 0 : t === 0)), k.id);
    // Ofisga faqat rahbarlar, maishiyga — ishchilar
    const ofisga = yaqinNuqta(k.yonalish === 'kelish' ? oxir : bosh, P.kppdanOfis.at(-1));
    assert.equal(ofisga, k.tur === 'biznesmen' || k.tur === 'ayolRasmiy', k.id);
    assert.ok(k.faza >= 0 && k.faza < 1);
    assert.ok(kelibKetuvchiJadvali(k).davr < KELIB_KETISH_DAVRI - 10, `${k.id}: yo'l davrga sig'adi`);
  }
  assert.ok(a.some((k) => k.yonalish === 'kelish') && a.some((k) => k.yonalish === 'ketish'));
});

test('kelib-ketish: bir yo‘nalishdagilar ≥ 1 m, qarama-qarshilar ≥ 0.6 m oraliqda; bir vaqtda 4–12 kishi ko‘rinadi', () => {
  const ks = kelibKetuvchilar();
  const js = ks.map((k) => kelibKetuvchiJadvali(k));
  let birMin = Infinity;
  let qarMin = Infinity;
  let korMin = Infinity;
  let korMax = 0;
  let turniketda = 0;
  for (let t = 0; t < KELIB_KETISH_DAVRI; t += 0.1) {
    const h = ks.map((k, i) => kelibKetuvchiHolati(k, js[i], t));
    const n = h.filter((x) => x.korinadi).length;
    korMin = Math.min(korMin, n);
    korMax = Math.max(korMax, n);
    turniketda += h.filter((x) => x.korinadi && x.turniketda).length;
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        if (!h[i].korinadi || !h[j].korinadi) continue;
        const d = Math.hypot(h[i].x - h[j].x, h[i].z - h[j].z);
        if (ks[i].yonalish === ks[j].yonalish) birMin = Math.min(birMin, d);
        else qarMin = Math.min(qarMin, d);
      }
    }
  }
  assert.ok(birMin >= 1, `bir yo'nalish: ${birMin}`);
  assert.ok(qarMin >= 0.6, `qarama-qarshi: ${qarMin}`);
  assert.ok(korMin >= 4 && korMax <= 12, `${korMin}…${korMax}`);
  assert.ok(turniketda > 0, 'turniketda to‘xtaydi');
  // Davriy: bir davrdan keyin aynan shu holat
  const k = ks[0];
  const a = kelibKetuvchiHolati(k, js[0], 37.3);
  const b = kelibKetuvchiHolati(k, js[0], 37.3 + KELIB_KETISH_DAVRI * 3);
  assert.ok(a.korinadi && b.korinadi && yaqin(a.x, b.x, 1e-9) && yaqin(a.z, b.z, 1e-9));
});

test('Odamlar.tsx: faqat komponentlar eksport, tashqi havola yo‘q, Draco o‘chiq, skinli mesh soyali va kesilmaydi', () => {
  const s = manba('src/Pages/Demo3DSex/Odamlar.tsx');
  const eksportlar = [...s.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
  assert.deepEqual(eksportlar.sort(), ['GlbOdam', 'KelibKetuvchilar', 'YuruvchiGlbOdam']);
  assert.ok(!/https?:\/\//.test(s));
  assert.ok(s.includes('useGLTF(odamUrl(tur), false, false)'));
  assert.ok(s.includes('useGLTF.preload(odamUrl(tur), false, false)'));
  assert.ok(s.includes('frustumCulled = false') && s.includes('castShadow = true'));
  assert.ok(s.includes('new THREE.AnimationMixer(obj)'));
  assert.ok(s.includes('crossFadeTo'));
  const m = manba('src/Pages/Demo3DSex/odamModellari.ts');
  assert.ok(!/from ["'](three|@react-three)/.test(m), 'odamModellari.ts yuklovchisiz');
});
