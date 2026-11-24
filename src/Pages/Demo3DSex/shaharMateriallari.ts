import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { urugli } from "./materiallar";

// Zavod hududi va shaharcha materiallari. Barcha teksturalar kod bilan (canvas) chiziladi — tashqi rasm yoki havola yo'q.

type Chizuvchi = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function tekstura(w: number, h: number, chiz: Chizuvchi, takror = true) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  chiz(ctx, w, h);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (takror) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

/** Mayda donalar (asfalt, beton, maysa). */
function donalar(ctx: CanvasRenderingContext2D, w: number, h: number, son: number, rang: (r: () => number) => string, urug: number) {
  const rnd = urugli(urug);
  for (let i = 0; i < son; i++) {
    ctx.fillStyle = rang(rnd);
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
}

/** Yumshoq dog'lar (notekislik). */
function doglar(ctx: CanvasRenderingContext2D, w: number, h: number, son: number, och: string, toq: string, urug: number) {
  const rnd = urugli(urug);
  for (let i = 0; i < son; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const r = 10 + rnd() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rnd() > 0.5 ? och : toq);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** Asfalt: to'q kulrang, donador, yamoqlar (1 tekstura = 8 × 8 m). */
const asfalt = () => tekstura(512, 512, (ctx, w, h) => {
  ctx.fillStyle = "#4a4f57";
  ctx.fillRect(0, 0, w, h);
  doglar(ctx, w, h, 60, "rgba(255,255,255,0.05)", "rgba(0,0,0,0.12)", 11);
  donalar(ctx, w, h, 22000, (r) => { const v = Math.round(55 + r() * 70); return `rgba(${v},${v + 2},${v + 6},0.55)`; }, 12);
  // Yorilgan joylar
  const rnd = urugli(13);
  ctx.strokeStyle = "rgba(25,28,32,0.45)";
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    let x = rnd() * w;
    let y = rnd() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.5) * 40; ctx.lineTo(x, y); }
    ctx.stroke();
  }
});

/** Maysa (o't): yashil, to'q-och dog'lar (1 tekstura = 10 × 10 m). */
const maysa = () => tekstura(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#6d8f4e";
  ctx.fillRect(0, 0, w, h);
  doglar(ctx, w, h, 50, "rgba(160,190,90,0.25)", "rgba(40,70,30,0.25)", 21);
  donalar(ctx, w, h, 9000, (r) => `rgba(${Math.round(60 + r() * 70)},${Math.round(100 + r() * 70)},${Math.round(40 + r() * 40)},0.5)`, 22);
});

/** Trotuar plitkasi (1 tekstura = 2 × 2 m). */
const trotuar = () => tekstura(128, 128, (ctx, w, h) => {
  ctx.fillStyle = "#b9b4aa";
  ctx.fillRect(0, 0, w, h);
  donalar(ctx, w, h, 1500, (r) => { const v = Math.round(150 + r() * 60); return `rgba(${v},${v - 4},${v - 10},0.5)`; }, 31);
  ctx.strokeStyle = "rgba(110,104,96,0.7)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke();
  }
});

/** Ko'p qavatli panel uy fasadi (1 tekstura = 4 seksiya × 4 qavat = 12 × 12 m): derazalar, balkonlar, ba'zi derazalarda parda. */
const panelFasad = () => tekstura(512, 512, (ctx, w, h) => {
  const rnd = urugli(41);
  ctx.fillStyle = "#e4dccb";
  ctx.fillRect(0, 0, w, h);
  const yach = w / 4;
  for (let q = 0; q < 4; q++) {
    for (let s = 0; s < 4; s++) {
      const x = s * yach;
      const y = q * yach;
      // Panel choklari
      ctx.fillStyle = "rgba(120,110,95,0.35)";
      ctx.fillRect(x, y, yach, 2);
      ctx.fillRect(x, y, 2, yach);
      // Deraza (oyna osmonni aks ettiradi)
      const dx = x + yach * 0.22;
      const dy = y + yach * 0.2;
      const dw = yach * 0.56;
      const dh = yach * 0.5;
      const g = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
      const yoniq = rnd() < 0.12;
      g.addColorStop(0, yoniq ? "#f6d58a" : "#8fb2cf");
      g.addColorStop(1, yoniq ? "#d9a54f" : "#2f4a63");
      ctx.fillStyle = g;
      ctx.fillRect(dx, dy, dw, dh);
      if (rnd() < 0.35) { ctx.fillStyle = rnd() < 0.5 ? "rgba(236,226,206,0.85)" : "rgba(196,170,140,0.8)"; ctx.fillRect(dx, dy, dw * (0.3 + rnd() * 0.3), dh); }
      ctx.strokeStyle = "#f8f6f0";
      ctx.lineWidth = 3;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.beginPath(); ctx.moveTo(dx + dw / 2, dy); ctx.lineTo(dx + dw / 2, dy + dh); ctx.stroke();
      // Balkon (har ikkinchi seksiyada)
      if (s % 2 === 1) {
        ctx.fillStyle = "rgba(205,195,178,1)";
        ctx.fillRect(x + yach * 0.1, y + yach * 0.68, yach * 0.8, yach * 0.22);
        ctx.fillStyle = "rgba(140,128,110,0.6)";
        ctx.fillRect(x + yach * 0.1, y + yach * 0.68, yach * 0.8, 3);
      }
    }
  }
});

/** Ofis binosi: shisha fasad (1 tekstura = 4 panel × 2 qavat = 6 × 7 m). */
const ofisFasad = () => tekstura(256, 256, (ctx, w, h) => {
  const rnd = urugli(51);
  const pw = w / 4;
  const ph = h / 2;
  for (let q = 0; q < 2; q++) {
    for (let s = 0; s < 4; s++) {
      const g = ctx.createLinearGradient(s * pw, q * ph, s * pw + pw, q * ph + ph);
      const och = 0.85 + rnd() * 0.3;
      g.addColorStop(0, `rgb(${Math.round(150 * och)},${Math.round(185 * och)},${Math.round(210 * och)})`);
      g.addColorStop(1, `rgb(${Math.round(55 * och)},${Math.round(85 * och)},${Math.round(115 * och)})`);
      ctx.fillStyle = g;
      ctx.fillRect(s * pw, q * ph, pw, ph);
    }
    // Qavatlar orasidagi tasma
    ctx.fillStyle = "#334155";
    ctx.fillRect(0, q * ph + ph - 14, w, 14);
  }
  ctx.fillStyle = "#cbd5e1";
  for (let s = 0; s <= 4; s++) ctx.fillRect(s * pw - 2, 0, 4, h);
});

/** Sanoat ombori: gofrirlangan metall devor (1 tekstura = 6 × 6 m). */
const omborFasad = () => tekstura(256, 256, (ctx, w, h) => {
  ctx.fillStyle = "#c9d1da";
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 8) {
    const g = ctx.createLinearGradient(x, 0, x + 8, 0);
    g.addColorStop(0, "rgba(255,255,255,0.45)");
    g.addColorStop(0.5, "rgba(120,132,148,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0.1)");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 8, h);
  }
  ctx.fillStyle = "rgba(37,99,235,0.85)";
  ctx.fillRect(0, h * 0.06, w, 10);
  doglar(ctx, w, h, 20, "rgba(255,255,255,0.08)", "rgba(80,70,60,0.08)", 61);
});

/** Mahalla uyi (1 tekstura = 8 m × 1 qavat 3.2 m): sariq g'isht, ikki deraza. */
const uyFasad = () => tekstura(256, 128, (ctx, w, h) => {
  ctx.fillStyle = "#d8c29a";
  ctx.fillRect(0, 0, w, h);
  // G'isht qatorlari
  ctx.strokeStyle = "rgba(150,120,80,0.35)";
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 6) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    for (let x = (y / 6) % 2 ? 0 : 8; x < w; x += 16) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 6); ctx.stroke(); }
  }
  for (const dx of [0.18, 0.62]) {
    const x = w * dx;
    const g = ctx.createLinearGradient(x, h * 0.25, x + w * 0.2, h * 0.7);
    g.addColorStop(0, "#9cc0d8");
    g.addColorStop(1, "#3b5568");
    ctx.fillStyle = "#f5f0e6";
    ctx.fillRect(x - 4, h * 0.22 - 4, w * 0.2 + 8, h * 0.5 + 8);
    ctx.fillStyle = g;
    ctx.fillRect(x, h * 0.22, w * 0.2, h * 0.5);
    ctx.fillStyle = "#f5f0e6";
    ctx.fillRect(x + w * 0.1 - 1.5, h * 0.22, 3, h * 0.5);
  }
  ctx.fillStyle = "rgba(120,96,64,0.5)";
  ctx.fillRect(0, h - 8, w, 8);
});

/** Panjara to'ri (shaffof, 1 tekstura = 2.5 m eni × 2.2 m). */
const panjara = () => tekstura(128, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(70,90,80,0.95)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 16; i++) {
    ctx.beginPath(); ctx.moveTo(i * 8, 0); ctx.lineTo(i * 8, h); ctx.stroke();
  }
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(0, i * 16); ctx.lineTo(w, i * 16); ctx.stroke();
  }
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(w, 3); ctx.stroke();
});

/** Shlagbaum strelasi: qizil-oq chiziqlar. */
const shlagbaumChizig = () => tekstura(256, 16, (ctx, w, h) => {
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#f8fafc" : "#dc2626";
    ctx.fillRect(i * (w / 8), 0, w / 8, h);
  }
}, false);

/** Yo'lning uzuq chizig'i (1 tekstura = 6 m: 3 m chiziq, 3 m bo'sh). */
const uzuqChiziq = () => tekstura(64, 8, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, w / 2, h);
});

/** Yuk mashinasi furgoni yon tomoni: oq, ko'k tasma, "MEBEL" yozuvi va LDSP list tasviri. */
const furgonYoni = () => tekstura(1024, 256, (ctx, w, h) => {
  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#1d4ed8");
  g.addColorStop(1, "#0ea5e9");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.68, w, h * 0.16);
  ctx.fillStyle = "#1e3a8a";
  ctx.font = "bold 92px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("MEBEL", w * 0.08, h * 0.38);
  ctx.fillStyle = "#c8a06e";
  ctx.fillRect(w * 0.62, h * 0.18, w * 0.26, h * 0.12);
  ctx.fillStyle = "#e7d3b0";
  ctx.fillRect(w * 0.64, h * 0.32, w * 0.26, h * 0.12);
  ctx.strokeStyle = "rgba(100,116,139,0.35)";
  ctx.lineWidth = 3;
  for (let x = 0; x < w; x += w / 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
}, false);

/** O'zbekiston davlat raqami: "01 345 ABA" (chapda viloyat kodi, o'ngda bayroq va UZ). */
export function raqamTeksturasi(raqam: string) {
  return tekstura(256, 56, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    const [kod, ...qolgan] = raqam.split(" ");
    ctx.fillStyle = "#111827";
    ctx.font = "bold 34px Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(kod, 12, h / 2 + 1);
    ctx.fillRect(60, 6, 3, h - 12);
    ctx.fillText(qolgan.join(" "), 72, h / 2 + 1);
    // Bayroq
    const bx = w - 40;
    ctx.fillStyle = "#0099b5"; ctx.fillRect(bx, 10, 28, 7);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(bx, 17, 28, 7);
    ctx.fillStyle = "#1eb53a"; ctx.fillRect(bx, 24, 28, 7);
    ctx.fillStyle = "#0099b5";
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillText("UZ", bx + 4, 42);
  }, false);
}

/** Bino qutisi: yon tomon UV'lari o'lchamga moslanadi (fasad teksturasi cho'zilmaydi, takrorlanadi). Tepa va past tomon — tom materiali. */
export function binoGeometriyasi(w: number, h: number, d: number, tileW: number, tileH: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  // BoxGeometry tomonlari tartibi: +x, −x, +y, −y, +z, −z (har biri 4 uch).
  const enlar = [d, d, 0, 0, w, w];
  for (let tomon = 0; tomon < 6; tomon++) {
    if (tomon === 2 || tomon === 3) continue;
    for (let k = 0; k < 4; k++) {
      const i = tomon * 4 + k;
      uv.setXY(i, uv.getX(i) * (enlar[tomon] / tileW), uv.getY(i) * (h / tileH));
    }
  }
  uv.needsUpdate = true;
  return g;
}

/** Fasad turlari va bitta tekstura necha metrni qoplaydi. */
export const FASAD_OLCHAMI = { panel: [12, 12], ofis: [6, 7], ombor: [6, 6], uy: [8, 3.2] } as const;
export type FasadTuri = keyof typeof FASAD_OLCHAMI;

export function useShaharMateriallari() {
  const mat = useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...extra });
    const asfaltT = asfalt();
    const maysaT = maysa();
    const trotuarT = trotuar();
    const panjaraT = panjara();
    const uzuqT = uzuqChiziq();
    return {
      asfaltT,
      maysaT,
      trotuarT,
      panjaraT,
      uzuqT,
      asfalt: m("#ffffff", { map: asfaltT, roughness: 0.95 }),
      yolAsfalt: m("#d9dbe0", { map: asfaltT, roughness: 0.95 }),
      maysa: m("#ffffff", { map: maysaT, roughness: 1 }),
      trotuar: m("#ffffff", { map: trotuarT, roughness: 0.9 }),
      bordyur: m("#d6d3cc", { roughness: 0.85 }),
      chiziqOq: m("#f1f5f9", { roughness: 0.7 }),
      chiziqSariq: m("#facc15", { roughness: 0.7 }),
      uzuqChiziq: new THREE.MeshStandardMaterial({ map: uzuqT, transparent: true, roughness: 0.7, depthWrite: false }),
      panjara: new THREE.MeshStandardMaterial({ map: panjaraT, transparent: true, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.3, depthWrite: false }),
      panjaraUstun: m("#3f5a4c", { roughness: 0.5, metalness: 0.4 }),
      fasad: {
        panel: m("#ffffff", { map: panelFasad(), roughness: 0.85 }),
        ofis: m("#ffffff", { map: ofisFasad(), roughness: 0.15, metalness: 0.5 }),
        ombor: m("#ffffff", { map: omborFasad(), roughness: 0.5, metalness: 0.3 }),
        uy: m("#ffffff", { map: uyFasad(), roughness: 0.9 }),
      } as Record<FasadTuri, THREE.MeshStandardMaterial>,
      tomTekis: m("#8b9096", { roughness: 0.9 }),
      tomlar: [m("#9a3b2a", { roughness: 0.6, metalness: 0.2 }), m("#3f6f5a", { roughness: 0.6, metalness: 0.3 }), m("#6b7280", { roughness: 0.6, metalness: 0.3 })],
      daraxtTana: m("#5b4636", { roughness: 1 }),
      barg: m("#ffffff", { roughness: 0.92 }),
      chiroqUstun: m("#4b5563", { roughness: 0.5, metalness: 0.6 }),
      chiroqBosh: m("#f8fafc", { emissive: "#fff7d6", emissiveIntensity: 0.4 }),
      shlagbaum: m("#ffffff", { map: shlagbaumChizig(), roughness: 0.5 }),
      kppDevor: m("#eef2f5", { roughness: 0.7 }),
      kppOyna: new THREE.MeshStandardMaterial({ color: "#7aa7c7", roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.6 }),
      /** Avtomobil kuzovi: oq asos, rangi har nusxaga (instanceColor) beriladi. */
      kuzovOq: m("#ffffff", { roughness: 0.25, metalness: 0.55 }),
      mashinaOyna: new THREE.MeshStandardMaterial({ color: "#0f1a26", roughness: 0.05, metalness: 0.7 }),
      oldChiroq: m("#fffbe6", { emissive: "#fff3c4", emissiveIntensity: 0.9 }),
      orqaChiroq: m("#7f1d1d", { emissive: "#ef4444", emissiveIntensity: 0.9 }),
      kabina: m("#e2e8f0", { roughness: 0.3, metalness: 0.5 }),
      kabinaKok: m("#1d4ed8", { roughness: 0.3, metalness: 0.5 }),
      furgon: m("#ffffff", { map: furgonYoni(), roughness: 0.5, metalness: 0.2 }),
      furgonOq: m("#f4f6f8", { roughness: 0.5, metalness: 0.2 }),
      furgonIchi: m("#9aa3ad", { roughness: 0.9, side: THREE.DoubleSide }),
      rama: m("#1f2937", { roughness: 0.6, metalness: 0.4 }),
      beton: m("#b8b4ac", { roughness: 0.95 }),
      konteyner: m("#15803d", { roughness: 0.6, metalness: 0.3 }),
      transformator: m("#cbd5e1", { roughness: 0.5, metalness: 0.3 }),
      skameyka: m("#8b5a3c", { roughness: 0.8 }),
    };
  }, []);
  // Sahifadan chiqilganda GPU xotirasi bo'shatiladi.
  useEffect(() => () => {
    Object.values(mat).forEach((qiymat) => {
      const royxat = Array.isArray(qiymat) ? qiymat : qiymat instanceof THREE.Material || qiymat instanceof THREE.Texture ? [qiymat] : qiymat && typeof qiymat === "object" ? Object.values(qiymat) : [];
      royxat.forEach((x) => { if (x instanceof THREE.Material || x instanceof THREE.Texture) x.dispose(); });
    });
  }, [mat]);
  return mat;
}
export type ShaharMateriallari = ReturnType<typeof useShaharMateriallari>;
