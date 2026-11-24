import { useMemo } from "react";
import * as THREE from "three";

// 3D sex sahnasining umumiy qismlari: materiallar (bir marta yaratiladi — har soniyadagi yangilanishda qayta yaratilmaydi) va oddiy shakllar.

/** Takrorlanadigan "tasodifiy" son (sahna har ochilganda bir xil ko'rinsin). */
export function urugli(urug: number) {
  let s = urug >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Beton pol teksturasi (kod bilan chiziladi, tashqi fayl yo'q): mayda dog'lar, plita choklari, ishqalangan izlar. */
function betonTeksturasi(eni: number, chuqurligi: number) {
  if (typeof document === "undefined") return null;
  const px = 48; // 1 metrga piksel
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(eni * px);
  canvas.height = Math.round(chuqurligi * px);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const rnd = urugli(7);
  ctx.fillStyle = "#c9ced4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Katta yumshoq dog'lar (beton notekisligi)
  for (let i = 0; i < 220; i++) {
    const x = rnd() * canvas.width;
    const y = rnd() * canvas.height;
    const r = 20 + rnd() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const och = rnd() > 0.5;
    g.addColorStop(0, och ? "rgba(255,255,255,0.10)" : "rgba(70,80,92,0.10)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Mayda donalar
  for (let i = 0; i < 26000; i++) {
    const v = Math.round(150 + rnd() * 70);
    ctx.fillStyle = `rgba(${v},${v + 4},${v + 8},${0.18 + rnd() * 0.22})`;
    ctx.fillRect(rnd() * canvas.width, rnd() * canvas.height, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  // Moy/g'ildirak izlari
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(60,66,74,${0.06 + rnd() * 0.06})`;
    ctx.lineWidth = 6 + rnd() * 10;
    ctx.beginPath();
    const x = rnd() * canvas.width;
    const y = rnd() * canvas.height;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 80, y + rnd() * 60, x + 160, y - rnd() * 60, x + 260, y + rnd() * 30);
    ctx.stroke();
  }
  // Plita choklari: har 4 m
  ctx.strokeStyle = "rgba(90,98,108,0.55)";
  ctx.lineWidth = 2;
  for (let x = 4 * px; x < canvas.width; x += 4 * px) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
  for (let y = 4 * px; y < canvas.height; y += 4 * px) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  const tekstura = new THREE.CanvasTexture(canvas);
  tekstura.colorSpace = THREE.SRGBColorSpace;
  tekstura.anisotropy = 4;
  return tekstura;
}

/** G'isht/panel devor teksturasi: sendvich-panel chiziqlari. */
function devorTeksturasi() {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#e8ecf1";
  ctx.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 16) {
    ctx.fillStyle = "rgba(120,130,145,0.18)";
    ctx.fillRect(0, y, 512, 2);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(0, y + 2, 512, 1);
  }
  const tekstura = new THREE.CanvasTexture(canvas);
  tekstura.colorSpace = THREE.SRGBColorSpace;
  tekstura.wrapS = THREE.RepeatWrapping;
  tekstura.wrapT = THREE.RepeatWrapping;
  tekstura.repeat.set(8, 1);
  return tekstura;
}

export const SEX_ENI = 34; // x (metr)
export const SEX_CHUQURLIGI = 22; // z (metr)

export function useMateriallar() {
  return useMemo(() => {
    const m = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...extra });
    const beton = betonTeksturasi(SEX_ENI, SEX_CHUQURLIGI);
    const devor = devorTeksturasi();
    return {
      pol: new THREE.MeshStandardMaterial({ color: "#ffffff", map: beton, roughness: 0.88, metalness: 0.02 }),
      devor: new THREE.MeshStandardMaterial({ color: "#ffffff", map: devor, roughness: 0.92 }),
      devorPast: m("#94a3b8", { roughness: 0.85 }),
      ustun: m("#8a97a8", { roughness: 0.5, metalness: 0.5 }),
      sariq: m("#facc15", { roughness: 0.8 }),
      yolakYashil: m("#6b9e7a", { roughness: 0.75 }),
      oq: m("#f8fafc", { roughness: 0.85 }),
      qora: m("#111827", { roughness: 0.7 }),
      korpus: m("#e5e9ef", { roughness: 0.45, metalness: 0.15 }),
      korpusQora: m("#334155", { roughness: 0.5, metalness: 0.3 }),
      // Metall aksi sahnadagi muhit xaritasidan (Environment + Lightformer, kod bilan) — shuning uchun metalness yuqori bo'lsa ham qora bo'lmaydi.
      polat: m("#b8c2cf", { roughness: 0.28, metalness: 0.8 }),
      polatQora: m("#4b5868", { roughness: 0.4, metalness: 0.55 }),
      oluk: m("#d6dde6", { roughness: 0.35, metalness: 0.7 }),
      kesishRang: m("#f97316", { roughness: 0.45, metalness: 0.2 }),
      cncRang: m("#2563eb", { roughness: 0.4, metalness: 0.25 }),
      qirraRang: m("#10b981", { roughness: 0.45, metalness: 0.2 }),
      burgRang: m("#7c3aed", { roughness: 0.45, metalness: 0.2 }),
      qadoqRang: m("#0ea5e9", { roughness: 0.45, metalness: 0.2 }),
      ekran: m("#0f172a", { roughness: 0.2, metalness: 0.1, emissive: "#1d4ed8", emissiveIntensity: 0.35 }),
      lmdp: m("#e7d3b0", { roughness: 0.75 }),
      lmdpOq: m("#f1ede6", { roughness: 0.7 }),
      lmdpYongoq: m("#8b5a3c", { roughness: 0.7 }),
      lmdpKul: m("#9ca3af", { roughness: 0.7 }),
      karton: m("#c8a06e", { roughness: 0.9 }),
      plyonka: new THREE.MeshStandardMaterial({ color: "#e0f2fe", roughness: 0.15, metalness: 0, transparent: true, opacity: 0.45 }),
      oyna: new THREE.MeshStandardMaterial({ color: "#bae6fd", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.25 }),
      derazaYorugi: m("#dbeafe", { roughness: 0.2, emissive: "#e0f2fe", emissiveIntensity: 0.55 }),
      palet: m("#a16207", { roughness: 0.9 }),
      vakuum: m("#1e293b", { roughness: 0.85 }),
      rezina: m("#1f2937", { roughness: 0.9 }),
      tayoq: m("#64748b", { roughness: 0.4, metalness: 0.6 }),
      qizilTugma: m("#dc2626", { roughness: 0.4 }),
      elim: m("#f59e0b", { roughness: 0.4, metalness: 0.4 }),
      stellaj: m("#1d4ed8", { roughness: 0.5, metalness: 0.3 }),
      qizil: m("#dc2626", { roughness: 0.45, metalness: 0.2 }),
      shkaf: m("#cfd6df", { roughness: 0.5, metalness: 0.2 }),
      ogohlantirish: m("#fbbf24", { roughness: 0.6 }),
      pogruzchik: m("#f59e0b", { roughness: 0.45, metalness: 0.25 }),
      // Odamlar
      teri: [m("#e8b48f", { roughness: 0.75 }), m("#c98d64", { roughness: 0.75 }), m("#a8714d", { roughness: 0.75 })],
      kombinezon: m("#1e3a5f", { roughness: 0.85 }),
      kofta: m("#475569", { roughness: 0.85 }),
      jilet: [m("#f97316", { roughness: 0.7 }), m("#facc15", { roughness: 0.7 }), m("#84cc16", { roughness: 0.7 })],
      nurQaytargich: m("#e2e8f0", { roughness: 0.3, metalness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.15 }),
      kaska: [m("#fde047", { roughness: 0.35 }), m("#f8fafc", { roughness: 0.35 }), m("#3b82f6", { roughness: 0.35 })],
      qolqop: m("#334155", { roughness: 0.8 }),
      etik: m("#0f172a", { roughness: 0.6 }),
      quloqchin: m("#ef4444", { roughness: 0.5 }),
      shim: [m("#1e3a5f", { roughness: 0.85 }), m("#374151", { roughness: 0.85 }), m("#5b5a3c", { roughness: 0.85 })],
      ustKiyim: [m("#475569", { roughness: 0.85 }), m("#27408b", { roughness: 0.85 }), m("#3f4f2a", { roughness: 0.85 })],
      soch: [m("#1c1917", { roughness: 0.9 }), m("#3f2a1d", { roughness: 0.9 }), m("#0b0b0b", { roughness: 0.9 })],
      koz: m("#0f172a", { roughness: 0.25 }),
      lab: m("#9a5b4b", { roughness: 0.7 }),
      kozoynak: new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.6 }),
      kamar: m("#111827", { roughness: 0.6 }),
      forma: m("#1f2937", { roughness: 0.8 }),
      koylak: m("#93c5fd", { roughness: 0.8 }),
      jinsi: m("#2f4d7a", { roughness: 0.85 }),
      kurtka: m("#7f1d1d", { roughness: 0.8 }),
      planshet: m("#0f172a", { roughness: 0.2, emissive: "#1e3a8a", emissiveIntensity: 0.5 }),
      orindiq: m("#1f2937", { roughness: 0.7 }),
      mayoq: m("#f97316", { emissive: "#f97316", emissiveIntensity: 2.5 }),
    };
  }, []);
}
export type Materiallar = ReturnType<typeof useMateriallar>;
