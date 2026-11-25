// 3D Demo — zavod hududi va shaharcha rejasi (shaharRejasi.ts): yer qoplamalari, panjara, ko'chalar, avtoturargoh, binolar, daraxtlar, chiroqlar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ASOSIY_YOL, AVTO_SEX, DARVOZA, HUDUD, KIRISH, CHIQISH, KIRISH_YOLI, KPP, KUTISH_JOYLARI, MAISHIY, OFIS, ORQA_HOVLI, ORQA_YOL, PIYODA_YOLLARI, SEX,
  TASHQI_TURARGOH,
} from '../src/Pages/Demo3DSex/hudud.ts';
import {
  BAYROQLAR, BETON_MAYDONLAR, BINOLAR_IZI, BINO_TURLARI, HUDUD_ASFALTI, KPP_BINOSI, KPP_OROLI, NAVIS, NAVIS_USTUNLARI, OLD_BOG, ORQA_JIHOZLAR,
  PANJARA_KESMALARI, PIYODA_YOLAKLARI, SHAHAR_QATLAMLARI, SHAHAR_RADIUSI, TASHQI_ASFALT, TASHQI_TROTUARLAR, TROTUAR_ENI, TURARGOH_ASFALTI,
  XIZMAT_YOLI, X_KOCHALAR, ZAVOD_BLOKI, ZEBRALAR, Z_KOCHALAR, binoIzi, chiroqlarRejasi, daraxtlarRejasi, kesishadi, kochalarRejasi, nuqtaIchida,
  panjaraUstunlari, shaharBinolari, tb, turargohChiziqlari, turargohJoylari,
} from '../src/Pages/Demo3DSex/shaharRejasi.ts';

const manba = (yol) => readFileSync(new URL(`../${yol}`, import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const HUDUD_TB = tb(HUDUD.chap, HUDUD.ong, HUDUD.orqa, HUDUD.old);
const ichida = (a, b) => a.x0 >= b.x0 - 1e-9 && a.x1 <= b.x1 + 1e-9 && a.z0 >= b.z0 - 1e-9 && a.z1 <= b.z1 + 1e-9;
const juftlar = (royxat, fn) => { for (let i = 0; i < royxat.length; i++) for (let k = i + 1; k < royxat.length; k++) fn(royxat[i], royxat[k], i, k); };

/** Ko'cha asfalti + trotuar polosasi (to'rtburchak shu polosaga tegadimi). */
function kochadami(t, zaxira = 0) {
  for (const k of X_KOCHALAR) { const y = k.eni / 2 + TROTUAR_ENI + zaxira; if (t.z0 < k.z + y && t.z1 > k.z - y) return true; }
  for (const k of Z_KOCHALAR) { const y = k.eni / 2 + TROTUAR_ENI + zaxira; if (t.x0 < k.x + y && t.x1 > k.x - y) return true; }
  return false;
}

test('asfalt maydonlari bir-birining ustiga tushmaydi, hudud ichida va binolar ostiga kirmaydi', () => {
  juftlar([...HUDUD_ASFALTI, ...TASHQI_ASFALT], (a, b, i, k) => assert.equal(kesishadi(a, b), false, `asfalt ${i} va ${k} ustma-ust`));
  for (const a of HUDUD_ASFALTI) {
    assert.ok(ichida(a, HUDUD_TB), 'hudud asfalti panjara ichida');
    for (const [nom, iz] of Object.entries(BINOLAR_IZI)) assert.equal(kesishadi(a, iz), false, `asfalt ${nom} ostiga kirmasin`);
  }
  // Talab qilingan asfalt: old hovli (x −48…44, z 15…48), chap qator (x −48…−32, z −49…22), 2-sex ortidagi xizmat yo'li, kutish joylari
  const asfaltda = (x, z) => [...HUDUD_ASFALTI, ...TASHQI_ASFALT].some((a) => nuqtaIchida(x, z, a, 1e-6));
  for (let x = -47.5; x <= 43.5; x += 1) for (const z of [15.5, 22, 28, 47.5]) {
    if (nuqtaIchida(x, z, BINOLAR_IZI.ofis)) continue;
    assert.ok(asfaltda(x, z), `old hovli asfalti (${x}, ${z})`);
  }
  for (let z = -48.5; z <= 21.5; z += 1) for (const x of [-47.5, -40, -32.5]) assert.ok(asfaltda(x, z), `chap qator (${x}, ${z})`);
  for (let x = -47.5; x <= 55.5; x += 1) for (const z of [-48.5, -45, -41.5]) assert.ok(asfaltda(x, z), `xizmat yo'li (${x}, ${z})`);
  for (const k of KUTISH_JOYLARI) for (const [dx, dz] of [[-1.25, -4.3], [1.25, -4.3], [-1.25, 4.3], [1.25, 4.3]]) assert.ok(asfaltda(k.x + dx * 0.99, k.z + dz * 0.99), 'kutish joyi asfaltda');
  // Darvozadan ko'chagacha kirish yo'li
  for (let z = KIRISH_YOLI.z0 + 0.5; z < KIRISH_YOLI.z1; z += 1) for (const x of [KIRISH.x, CHIQISH.x]) assert.ok(asfaltda(x, z), `kirish yo'li (${x}, ${z})`);
});

test('beton va piyoda qatlamlari o‘zaro ustma-ust tushmaydi; piyoda yo‘laklari PIYODA_YOLLARI bo‘ylab', () => {
  juftlar(BETON_MAYDONLAR, (a, b, i, k) => assert.equal(kesishadi(a, b), false, `beton ${i}/${k}`));
  for (const b of BETON_MAYDONLAR) for (const a of [...HUDUD_ASFALTI, ...TASHQI_ASFALT]) assert.equal(kesishadi(a, b), false, 'beton asfaltga tegmaydi');
  juftlar(PIYODA_YOLAKLARI, (a, b, i, k) => assert.equal(kesishadi(a, b), false, `piyoda ${i}/${k}`));
  for (const p of PIYODA_YOLAKLARI) assert.ok(ichida(p, HUDUD_TB), 'piyoda yo‘lagi panjara ichida');
  // Hudud ichidagi yo'llar nuqtalari (zebralar va KPP dan tashqari) piyoda yo'lagida
  const yolakda = (x, z) => PIYODA_YOLAKLARI.some((p) => nuqtaIchida(x, z, p, 1e-6)) || ZEBRALAR.some((zb) => nuqtaIchida(x, z, zb, 1e-6)) || nuqtaIchida(x, z, KPP_OROLI);
  for (const nom of ['kppdanMaishiy', 'kppdanOfis']) {
    const yol = PIYODA_YOLLARI[nom];
    for (let i = 0; i + 1 < yol.length; i++) {
      const [a, c] = [yol[i], yol[i + 1]];
      for (let t = 0; t <= 1; t += 0.05) {
        const x = a[0] + (c[0] - a[0]) * t;
        const z = a[1] + (c[1] - a[1]) * t;
        if (nuqtaIchida(x, z, BINOLAR_IZI.maishiy) || nuqtaIchida(x, z, BINOLAR_IZI.ofis)) continue;
        assert.ok(yolakda(x, z), `${nom}: (${x.toFixed(1)}, ${z.toFixed(1)}) yo‘lakda`);
      }
    }
  }
  // Zebralar z = 45.8 da ikkala qatorni kesib o'tadi (x −7…−2 va 2…7)
  for (const [x0, x1] of [[-7, -2.3], [2.3, 7]]) assert.ok(ZEBRALAR.some((zb) => zb.x0 <= x0 && zb.x1 >= x1 && zb.z0 < 45.8 && zb.z1 > 45.8));
});

test('panjara: hudud chegarasi bo‘ylab yopiq, darvoza ochig‘i (x −8.5…8.5, z 48) bo‘sh', () => {
  const chegarada = ([x, z]) => Math.abs(x - HUDUD.chap) < 1e-9 || Math.abs(x - HUDUD.ong) < 1e-9 || Math.abs(z - HUDUD.orqa) < 1e-9 || Math.abs(z - HUDUD.old) < 1e-9;
  let uzunlik = 0;
  for (const [a, c] of PANJARA_KESMALARI) {
    assert.ok(chegarada(a) && chegarada(c), 'kesma chegarada');
    assert.ok(a[0] === c[0] || a[1] === c[1], 'kesma o‘qqa parallel');
    uzunlik += Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (a[1] === HUDUD.old && c[1] === HUDUD.old) {
      const [x0, x1] = [Math.min(a[0], c[0]), Math.max(a[0], c[0])];
      assert.ok(x1 <= DARVOZA.x - DARVOZA.yarimEni || x0 >= DARVOZA.x + DARVOZA.yarimEni, 'old kesma darvoza ochig‘iga kirmaydi');
    }
  }
  const perimetr = 2 * (HUDUD.ong - HUDUD.chap + HUDUD.old - HUDUD.orqa);
  assert.ok(uzunlik > perimetr - 2 * DARVOZA.yarimEni - 2 && uzunlik < perimetr - 2 * DARVOZA.yarimEni, 'faqat darvoza (va ustunlar) ochiq');
  const ustunlar = panjaraUstunlari();
  assert.equal(new Set(ustunlar.map(([x, z]) => `${x.toFixed(2)}|${z.toFixed(2)}`)).size, ustunlar.length, 'burchak ustunlari takrorlanmaydi');
  for (const [x, z] of ustunlar) {
    assert.ok(chegarada([x, z]));
    assert.ok(!(Math.abs(z - HUDUD.old) < 1e-9 && Math.abs(x - DARVOZA.x) < DARVOZA.yarimEni), 'darvozada ustun yo‘q');
  }
});

test('KPP: bino orolda, navis ikkala qatorni yopadi, ustunlar shlagbaum va qatorlarga xalal bermaydi', () => {
  assert.ok(ichida(KPP_BINOSI, KPP_OROLI));
  assert.ok(NAVIS.x0 <= -7 && NAVIS.x1 >= 7 && NAVIS.z0 <= KPP.z0 && NAVIS.z1 >= KPP.z1);
  assert.ok(NAVIS.past >= 5, 'yuk mashinasi o‘tadi');
  for (const [x, z] of NAVIS_USTUNLARI) {
    // Qatorlar: x −7…−2.3 va 2.3…7 bo'sh
    assert.ok(Math.abs(x) >= 7.6 || Math.abs(x) <= KPP_OROLI.x1 - 0.3, `ustun (${x}, ${z}) qatorda emas`);
    for (const u of [KIRISH, CHIQISH]) assert.ok(Math.hypot(x - u.ustunX, z - u.shlagbaumZ) > 2, 'shlagbaum ustuniga yaqin emas');
    assert.equal(nuqtaIchida(x, z, KPP_BINOSI, 0.2), false, 'ustun KPP binosi ichida emas');
  }
  // Orol qatorlarni toraytirmaydi (qator eni 5 m: x −7…−2 / 2…7, orol ±2.3 gacha)
  assert.ok(KPP_OROLI.x1 <= 2.5 && KPP_OROLI.x0 >= -2.5);
});

test('tashqi avtoturargoh: 2 qator, qadam 2.8 m, chiziqlar asfalt ichida; kirish x≈62, chiqish x≈14', () => {
  const ch = turargohChiziqlari();
  assert.equal(ch.length, 2 * 16);
  for (const c of ch) assert.ok(nuqtaIchida(c.x, c.z0, TURARGOH_ASFALTI) && nuqtaIchida(c.x, c.z1, TURARGOH_ASFALTI));
  const joylar = turargohJoylari();
  assert.equal(joylar.length, 30);
  assert.deepEqual([...new Set(joylar.map((j) => j.z))].sort((a, b) => a - b), [...TASHQI_TURARGOH.qatorlar]);
  const birinchi = joylar.filter((j) => j.z === TASHQI_TURARGOH.qatorlar[0]).map((j) => j.x);
  for (let i = 1; i < birinchi.length; i++) assert.ok(Math.abs(birinchi[i] - birinchi[i - 1] - TASHQI_TURARGOH.qadam) < 1e-9);
  const asfaltda = (x, z) => TASHQI_ASFALT.some((a) => nuqtaIchida(x, z, a, 1e-6));
  for (let z = 56; z < ASOSIY_YOL.z - ASOSIY_YOL.eni / 2; z += 0.5) {
    assert.ok(asfaltda(TASHQI_TURARGOH.x1, z), 'kirish yo‘li x = 62');
    assert.ok(asfaltda(TASHQI_TURARGOH.x0, z), 'chiqish yo‘li x = 14');
  }
  for (const a of TASHQI_ASFALT) assert.equal(kesishadi(a, HUDUD_TB), false, 'tashqi asfalt hududdan tashqarida');
});

test('ko‘chalar: ko‘ndalang ko‘chalar kesishmada bo‘linadi, asosiy ko‘cha trotuari kirish yo‘llarida uziladi', () => {
  const rejasi = kochalarRejasi();
  const xlar = rejasi.filter((k) => k.boylab === 'x');
  const zlar = rejasi.filter((k) => k.boylab === 'z');
  assert.equal(xlar.length, X_KOCHALAR.length);
  for (const z of zlar) for (const x of X_KOCHALAR) {
    const [a, c] = [z.markaz[1] - z.uzunlik / 2, z.markaz[1] + z.uzunlik / 2];
    assert.ok(c <= x.z - x.eni / 2 || a >= x.z + x.eni / 2, 'ko‘ndalang bo‘lak asosiy ko‘cha ustiga tushmaydi');
  }
  const asosiy = xlar.find((k) => k.markaz[1] === ASOSIY_YOL.z);
  const uz = asosiy.uzilishlar.filter((u) => u.yon === -1);
  assert.ok(uz.some((u) => u.a <= KIRISH_YOLI.x0 && u.c >= KIRISH_YOLI.x1), 'darvoza yo‘li');
  assert.ok(uz.some((u) => u.a < TASHQI_TURARGOH.x0 && u.c > TASHQI_TURARGOH.x0), 'avtoturargoh chiqishi');
  assert.ok(uz.some((u) => u.a < TASHQI_TURARGOH.x1 && u.c > TASHQI_TURARGOH.x1), 'avtoturargoh kirishi');
  // Trotuar z 62.3…64 va 72…73.7 (hudud.ts izohi bilan mos)
  assert.ok(Math.abs(ASOSIY_YOL.z - ASOSIY_YOL.eni / 2 - TROTUAR_ENI - 62.3) < 1e-9);
  assert.equal(ORQA_YOL.z, -82);
});

test('orqa hovli 2-sex ortida: jihozlar ORQA_HOVLI ichida, 2-sex izi bo‘sh, xizmat yo‘li 2-sex orqa devori bo‘ylab', () => {
  const avto = tb(AVTO_SEX.x0, AVTO_SEX.x1, AVTO_SEX.z0, AVTO_SEX.z1);
  const hovli = tb(ORQA_HOVLI.x0, ORQA_HOVLI.x1, ORQA_HOVLI.z0, ORQA_HOVLI.z1);
  assert.deepEqual(BINOLAR_IZI.avtoSex, avto);
  assert.ok(ichida(avto, HUDUD_TB), '2-sex hudud ichida');
  assert.equal(kesishadi(avto, hovli), false, 'orqa hovli 2-sex orqasida');
  for (const [nom, t] of Object.entries(ORQA_JIHOZLAR)) {
    assert.ok(ichida(t, hovli), `${nom} orqa hovlida`);
    assert.equal(kesishadi(t, avto), false, `${nom} 2-sex ichida emas`);
    assert.equal(kesishadi(t, XIZMAT_YOLI), false, `${nom} xizmat yo‘lida emas`);
    for (const a of HUDUD_ASFALTI) assert.equal(kesishadi(t, a), false, `${nom} asfaltda emas`);
  }
  juftlar(Object.values(ORQA_JIHOZLAR), (a, b, i, k) => assert.equal(kesishadi(a, b), false, `jihozlar ${i}/${k} ustma-ust`));
  // Hech qanday yer qoplamasi 2-sex ostiga kirmaydi
  for (const t of [...HUDUD_ASFALTI, ...BETON_MAYDONLAR, ...PIYODA_YOLAKLARI]) assert.equal(kesishadi(t, avto), false, `qoplama 2-sex ostida: ${JSON.stringify(t)}`);
  // Xizmat yo'li 2-sex orqa devoriga tegib turadi va chap qatorga ulanadi
  assert.equal(XIZMAT_YOLI.z1, AVTO_SEX.z0);
  assert.ok(XIZMAT_YOLI.z1 - XIZMAT_YOLI.z0 >= 7);
  assert.ok(HUDUD_ASFALTI.includes(XIZMAT_YOLI));
  // Chiroqlar 2-sex ichida emas
  for (const c of chiroqlarRejasi()) assert.equal(nuqtaIchida(c.x, c.z, avto, 0.3), false, `chiroq (${c.x}, ${c.z}) 2-sex ichida`);
  // Shaharcha: gaz quvuri 2-sex orqa devori (z = −41) bo'ylab, jihozlar ORQA_JIHOZLAR dan; eski sex orqa devori koordinatalari qolmagan
  const s = manba('src/Pages/Demo3DSex/Shaharcha.tsx');
  assert.match(s, /const orqaDevor = AVTO_SEX\.z0 - 0\.45;/);
  assert.match(s, /orta\(J\.kotelxona\)/);
  assert.match(s, /orta\(J\.silos\)/);
  assert.match(s, /J\.transformator\.z0 \+ 3/);
  assert.doesNotMatch(s, /-SEX\.chuqurlik \/ 2 - 0\.45|-SEX\.chuqurlik \/ 2 - 0\.1|-29\.5\]|-21\.2\]/);
});

test('shahar binolari: hudud, avtoturargoh, old bog‘ va ko‘chalarga tushmaydi, bir-biriga tegmaydi', () => {
  const binolar = shaharBinolari();
  assert.ok(binolar.length > 150, `binolar soni ${binolar.length}`);
  assert.deepEqual(shaharBinolari(), binolar, 'har safar bir xil');
  const izlar = binolar.filter((b) => !b.ustida).map(binoIzi);
  const taqiq = [HUDUD_TB, ZAVOD_BLOKI, OLD_BOG, ...TASHQI_ASFALT, ...TASHQI_TROTUARLAR];
  for (const t of izlar) {
    for (const q of taqiq) assert.equal(kesishadi(t, q), false, 'taqiqlangan joyga tushdi');
    assert.equal(kochadami(t), false, 'ko‘cha yoki trotuar ustida');
    assert.ok(Math.hypot((t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2) <= SHAHAR_RADIUSI);
  }
  juftlar(izlar, (a, b) => assert.equal(kesishadi(a, b), false, 'binolar ustma-ust'));
  // Minoralar podium ustida
  for (const b of binolar.filter((x) => x.ustida)) assert.ok(izlar.some((t) => ichida(binoIzi(b), t)) && b.y0 > 0);
  // Turli balandliklar va turlar
  assert.ok(new Set(binolar.map((b) => b.tur)).size === BINO_TURLARI.length);
  assert.ok(Math.max(...binolar.map((b) => b.y0 + b.h)) > 40 && Math.min(...binolar.map((b) => b.h)) < 5);
});

test('daraxtlar va chiroqlar: yo‘l, trotuar, asfalt va binolarga tushmaydi', () => {
  const binolar = shaharBinolari();
  const daraxtlar = daraxtlarRejasi(binolar);
  const chiroqlar = chiroqlarRejasi();
  assert.ok(daraxtlar.length > 500 && daraxtlar.length < 2000, `daraxtlar ${daraxtlar.length}`);
  const qattiq = [...HUDUD_ASFALTI, ...TASHQI_ASFALT, ...TASHQI_TROTUARLAR, ...PIYODA_YOLAKLARI, ...Object.values(BINOLAR_IZI), ...Object.values(ORQA_JIHOZLAR), KPP_OROLI];
  const izlar = binolar.filter((b) => !b.ustida).map(binoIzi);
  for (const d of daraxtlar) {
    assert.equal(kochadami(tb(d.x - 0.2, d.x + 0.2, d.z - 0.2, d.z + 0.2)), false, `daraxt ko‘chada (${d.x}, ${d.z})`);
    for (const q of [...qattiq, ...izlar]) assert.equal(nuqtaIchida(d.x, d.z, q, 0.3), false, `daraxt to‘siqda (${d.x}, ${d.z})`);
    for (const c of chiroqlar) assert.ok(Math.hypot(c.x - d.x, c.z - d.z) > 1.2, 'daraxt chiroq ustuniga tegmaydi');
  }
  for (const c of chiroqlar) {
    for (const q of [...TASHQI_ASFALT, ...ZEBRALAR, ...Object.values(BINOLAR_IZI), KPP_OROLI]) assert.equal(nuqtaIchida(c.x, c.z, q, 0.3), false, `chiroq (${c.x}, ${c.z})`);
    for (const u of [KIRISH, CHIQISH]) assert.ok(Math.hypot(c.x - u.ustunX, c.z - u.shlagbaumZ) > 3);
  }
});

test('ofis oldidagi 3 ta bayroq (O‘zbekiston — o‘rtada, eng baland), ofis eshigi yo‘lagiga tegmaydi', () => {
  assert.equal(BAYROQLAR.length, 3);
  const uz = BAYROQLAR.find((b) => b.tur === 'ozbekiston');
  assert.equal(BAYROQLAR[1], uz);
  assert.ok(BAYROQLAR.every((b) => b.h <= uz.h));
  for (const b of BAYROQLAR) {
    assert.ok(b.z > OFIS.z1 && b.z < HUDUD.old && b.x > OFIS.x0 && b.x < OFIS.eshik[0]);
    assert.ok(b.x + 2.5 < OFIS.eshik[0] + 0.8 || b.x > OFIS.eshik[0], 'bayroq matosi eshik yo‘lagidan chetda');
  }
  for (let i = 1; i < BAYROQLAR.length; i++) assert.ok(BAYROQLAR[i].x - BAYROQLAR[i - 1].x > 2.5, 'matolar qo‘shni ustunga tegmaydi');
  assert.ok(MAISHIY.x1 < HUDUD.ong && SEX.eni === 64);
});

test('uzoq shahar draw call byudjeti ≤ 25 (binolar + daraxtlar + chiroqlar)', () => {
  const jami = Object.values(SHAHAR_QATLAMLARI).reduce((a, b) => a + b, 0);
  assert.ok(jami <= 25, `jami ${jami}`);
  const s = manba('src/Pages/Demo3DSex/Shaharcha.tsx');
  // Binolar: har devor turi, tekis tom, 3 qiya tom, tom jihozlari — bittadan mesh
  assert.match(s, /qismlar\.devorlar\.map\(\(\{ tur, g \}\) => <mesh key=\{tur\}/);
  assert.match(s, /qismlar\.qiyaTomlar\.map/);
  assert.match(s, /new THREE\.InstancedMesh\(new THREE\.CylinderGeometry\(0\.12, 0\.2, 1, 8\), sm\.daraxtTana/);
  assert.match(s, /new THREE\.InstancedMesh\(ustunGeo, sm\.chiroqUstun/);
});

test('manba: tashqi havola yo‘q, faqat default komponent eksport qilinadi, statik qismlar StatikGuruh ichida', () => {
  const fayllar = ['src/Pages/Demo3DSex/Shaharcha.tsx', 'src/Pages/Demo3DSex/shaharMateriallari.ts', 'src/Pages/Demo3DSex/shaharRejasi.ts'];
  for (const f of fayllar) assert.doesNotMatch(manba(f), /https?:\/\//, f);
  const s = manba('src/Pages/Demo3DSex/Shaharcha.tsx');
  assert.deepEqual(s.match(/^export .*/gm), ['export default function Shaharcha({ m, sm }: { m: Materiallar; sm: ShaharMateriallari }) {']);
  assert.match(s, /<StatikGuruh>\s*<HududYeri[\s\S]*<OrqaHovli[\s\S]*<\/StatikGuruh>/);
  // Animatsiyali bayroqlar StatikGuruh dan tashqarida
  assert.match(s, /<\/StatikGuruh>\s*<PanjaraUstunlari sm=\{sm\} \/>\s*<Bayroqlar/);
  const mat = manba('src/Pages/Demo3DSex/shaharMateriallari.ts');
  for (const kalit of ['furgon', 'kabina', 'kabinaKok', 'rama', 'kuzovOq', 'mashinaOyna', 'oldChiroq', 'orqaChiroq', 'shlagbaum', 'kppDevor', 'kppOyna', 'asfalt', 'chiziqOq', 'belgiOq', 'piyoda', 'ledPanel', 'stopBelgi']) {
    assert.match(mat, new RegExp(`\\b${kalit}: `), kalit);
  }
  assert.match(mat, /export function useShaharMateriallari\(\)/);
  assert.match(mat, /export function raqamTeksturasi\(/);
});
