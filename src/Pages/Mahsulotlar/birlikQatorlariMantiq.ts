import { birliklarXatosi, type TovarBirligi } from "../../lib/kopBirlik.ts";
import type { OlchovBirligi } from "../../types/catalog.ts";

// Tovar birliklari qatorlari mantiqi (UI'siz va `@/` importlarisiz — testlarda ishlaydi): "Birliklar" oynasi va mahsulot oynasidagi bo'lim uchun umumiy.
// Koeffitsient — 1 shu birlikda nechta asosiy birlik (masalan 1 korobka = 3 kg). Narx bo'sh bo'lsa asosiy narx × koeffitsient olinadi.

export type BirlikQatori = {
  kalit: number;
  unitId: string;
  koeff: string;
  qabul: boolean;
  sotuv: boolean;
  chakana: string;
  ulgurji: string;
  shtrix: string;
};

let qatorHisobi = 0;

export const bosBirlikQatori = (): BirlikQatori => ({ kalit: ++qatorHisobi, unitId: "", koeff: "", qabul: true, sotuv: true, chakana: "", ulgurji: "", shtrix: "" });

/** Backenddan kelgan birliklar (asosiy birlik tashlab yuboriladi) → tahrirlanadigan qatorlar. */
export function birlikQatorlariniOlish(royxat: readonly TovarBirligi[]): BirlikQatori[] {
  return royxat
    .filter((birlik) => !birlik.asosiy)
    .map((birlik) => ({
      kalit: ++qatorHisobi,
      unitId: birlik.unitId,
      koeff: String(birlik.koeff),
      qabul: birlik.qabul,
      sotuv: birlik.sotuv,
      chakana: birlik.chakana === null ? "" : String(birlik.chakana),
      ulgurji: birlik.ulgurji === null ? "" : String(birlik.ulgurji),
      shtrix: birlik.shtrix ?? "",
    }));
}

/** O'zgarish bor-yo'qligini aniqlash uchun qatorlar imzosi (kalit hisobga olinmaydi). */
export function birlikQatorlariImzosi(qatorlar: readonly BirlikQatori[]): string {
  return JSON.stringify(
    qatorlar.map(({ unitId, koeff, qabul, sotuv, chakana, ulgurji, shtrix }) => [unitId, koeff.trim().replace(",", "."), qabul, sotuv, chakana.trim(), ulgurji.trim(), shtrix.trim()])
  );
}

function qatordanBirlik(qator: BirlikQatori, birlik: OlchovBirligi | undefined): TovarBirligi {
  const narx = (matn: string) => (matn.trim() && Number(matn) > 0 ? Number(matn) : null);
  return {
    unitId: qator.unitId,
    kod: birlik?.code ?? null,
    nomi: birlik?.name ?? "",
    qisqa: birlik?.shortName ?? birlik?.name ?? "",
    kasr: birlik?.isFractional === true,
    koeff: Number(qator.koeff.replace(",", ".")),
    asosiy: false,
    qabul: qator.qabul,
    sotuv: qator.sotuv,
    chakana: narx(qator.chakana),
    ulgurji: narx(qator.ulgurji),
    shtrix: qator.shtrix.trim() || null,
  };
}

/**
 * Saqlashga tayyor ro'yxat (birinchi — asosiy birlik) yoki xato kaliti (`units.errors.*`).
 * Tekshiriladi: har qatorda birlik tanlangan, koeffitsient musbat, birlik takrorlanmagan va asosiy birlik emas.
 */
export function birlikRoyxatiniYigish(
  qatorlar: readonly BirlikQatori[],
  birliklar: readonly OlchovBirligi[],
  asosiy: { unitId: string; nomi: string }
): { royxat: TovarBirligi[] } | { xato: "unitRequired" | "unitDuplicate" | "factorInvalid" } {
  if (qatorlar.some((qator) => !qator.unitId)) return { xato: "unitRequired" };
  const royxat: TovarBirligi[] = [
    { unitId: asosiy.unitId, kod: null, nomi: asosiy.nomi, qisqa: asosiy.nomi, kasr: false, koeff: 1, asosiy: true, qabul: true, sotuv: true, chakana: null, ulgurji: null, shtrix: null },
    ...qatorlar.map((qator) => qatordanBirlik(qator, birliklar.find((birlik) => birlik.id === qator.unitId))),
  ];
  const xato = birliklarXatosi(royxat);
  return xato ? { xato } : { royxat };
}
