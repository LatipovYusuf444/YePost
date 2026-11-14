// Skaner bilan ishlaydigan kassir uchun fokus yordamchilari: POS ochilganda va sotuvdan keyin fokus qidiruv maydoniga qaytadi,
// to'lov oynasida Enter to'lovni tasdiqlaydi.

export const POS_QIDIRUV_BELGISI = "data-pos-qidiruv";

/**
 * Qidiruv bo'sh bo'lganda ↓ bosilsa sarlavhadagi qidiruv shu hodisani (bekor qilinadigan) yuboradi: Bosh sahifa savatchasi bo'lsa
 * uni ushlab (preventDefault) birinchi qatorga o'tadi, aks holda qidiruv avvalgidek ishlaydi.
 */
export const POS_SAVATCHAGA_OTISH = "pos:savatchaga-otish";

type FokusMaydoni = { focus: (options?: { preventScroll?: boolean }) => void; offsetParent?: unknown };
type QidiruvManbasi = { querySelectorAll: (selector: string) => ArrayLike<FokusMaydoni> };

// Ko'rinadigan birinchi POS qidiruv maydoniga fokus beradi (sarlavhada telefon va katta ekran uchun ikki nusxa bo'lishi mumkin).
export function posQidiruvigaFokus(hujjat: QidiruvManbasi | undefined = typeof document === "undefined" ? undefined : document) {
  if (!hujjat) return false;
  const maydonlar = Array.from(hujjat.querySelectorAll(`input[${POS_QIDIRUV_BELGISI}="true"]`));
  const maydon = maydonlar.find((item) => item.offsetParent !== null) ?? maydonlar[0];
  if (!maydon) return false;
  maydon.focus({ preventScroll: true });
  return true;
}

// Modal yopilgach DOM yangilanishi tugaguncha kutib, keyin fokus qaytariladi.
export function posQidiruvigaFokusKeyin() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    posQidiruvigaFokus();
  });
}

type EnterHodisasi = {
  key: string;
  repeat?: boolean;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  target: unknown;
};

// To'lov oynasida Enter to'lovni tasdiqlashi kerakmi: tugma yoqilgan (mumkin) va band emas bo'lsa; matn maydoni (textarea),
// tanlov (select) va tugma/havolada Enter o'z vazifasini bajaradi; tugab turgan bosish (repeat) takror yubormaydi.
export function enterTolovniTasdiqlaydimi(hodisa: EnterHodisasi, holat: { mumkin: boolean; band: boolean }) {
  if (hodisa.key !== "Enter") return false;
  if (hodisa.repeat || hodisa.defaultPrevented || hodisa.isComposing) return false;
  if (hodisa.shiftKey || hodisa.ctrlKey || hodisa.altKey || hodisa.metaKey) return false;
  if (!holat.mumkin || holat.band) return false;
  const tag = String((hodisa.target as { tagName?: string } | null)?.tagName ?? "").toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return false;
  if ((hodisa.target as { isContentEditable?: boolean } | null)?.isContentEditable) return false;
  return true;
}
