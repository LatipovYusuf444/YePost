import { useMemo } from "react";
import qrcode from "qrcode-generator";

type QrKodProps = {
  /** QR kodga yoziladigan matn (masalan, havola). */
  qiymat: string;
  /** Tomon uzunligi, px. */
  olcham?: number;
  className?: string;
  "aria-label"?: string;
};

// QR kod SVG ko'rinishida (qrcode-generator, xato tuzatish darajasi M). Modullar bitta <path>da chiziladi; tashqi xizmatga hech narsa yuborilmaydi.
const CHEKKA = 4; // tinch zona (modul)

export default function QrKod({ qiymat, olcham = 168, className, "aria-label": ariaLabel }: QrKodProps) {
  const chizma = useMemo(() => {
    try {
      const kod = qrcode(0, "M");
      kod.addData(qiymat);
      kod.make();
      const soni = kod.getModuleCount();
      let yol = "";
      for (let qator = 0; qator < soni; qator += 1) {
        for (let ustun = 0; ustun < soni; ustun += 1) {
          if (kod.isDark(qator, ustun)) yol += `M${ustun + CHEKKA},${qator + CHEKKA}h1v1h-1z`;
        }
      }
      return { yol, hajm: soni + CHEKKA * 2 };
    } catch {
      // Matn juda uzun bo'lsa QR yaratib bo'lmaydi: havolaning o'zi ko'rsatiladi.
      return null;
    }
  }, [qiymat]);

  if (!chizma) return null;
  return (
    <svg
      role="img"
      aria-label={ariaLabel ?? "QR"}
      viewBox={`0 0 ${chizma.hajm} ${chizma.hajm}`}
      width={olcham}
      height={olcham}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={chizma.hajm} height={chizma.hajm} fill="#fff" />
      <path d={chizma.yol} fill="#0f172a" />
    </svg>
  );
}
