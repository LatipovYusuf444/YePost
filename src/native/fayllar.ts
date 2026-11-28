import { toast } from "sonner";
import { YePostNative } from "./yePostNative";
import { nativMatn } from "./matnlar";

/**
 * Android WebView brauzer emas: `<a download>`, `window.open(blobUrl)`, bo'sh popup oyna va `window.print()` unda ishlamaydi.
 * Veb kodni o'zgartirmaslik uchun shu brauzer API'lari FAQAT Android ilovada native ko'prikka (YePostNative) yo'naltiriladi:
 * - fayl yuklash (Excel/CSV/PDF eksport) -> telefonning Download/Aisa papkasiga saqlash + "Ochish" tugmasi;
 * - PDF/fayl ko'rish (chek, nakladnoy, yorliq) -> telefondagi ko'ruvchi ilova, bo'lmasa chop etish oynasi;
 * - chop etish -> Android chop etish oynasi (printer xizmati yoki "PDF sifatida saqlash");
 * - tashqi havola -> tizim brauzeri / Telegram.
 */

// createObjectURL bilan yaratilgan bloblar: chaqiruvchilar ko'pincha click() dan keyin darhol revokeObjectURL qiladi,
// native ko'prik esa blobni asinxron o'qiydi — shuning uchun blob shu yerda qisqa vaqt saqlanadi.
const bloblar = new Map<string, Blob>();
const BLOB_SAQLASH_MS = 2 * 60_000;

const KENGAYTMA_MIME: Record<string, string> = {
  pdf: "application/pdf",
  csv: "text/csv",
  json: "application/json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  txt: "text/plain",
  zip: "application/zip",
};

const MIME_KENGAYTMA: Record<string, string> = Object.fromEntries(Object.entries(KENGAYTMA_MIME).map(([k, v]) => [v, k]));

function mimeAniqlash(blob: Blob, nom: string) {
  const turi = blob.type.split(";")[0].trim();
  if (turi && turi !== "application/octet-stream") return turi;
  const kengaytma = nom.split(".").pop()?.toLowerCase() ?? "";
  return KENGAYTMA_MIME[kengaytma] ?? (turi || "application/octet-stream");
}

function standartNom(blob: Blob) {
  const kengaytma = MIME_KENGAYTMA[blob.type.split(";")[0].trim()] ?? "bin";
  return `aisa-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.${kengaytma}`;
}

function base64ga(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const oquvchi = new FileReader();
    oquvchi.onload = () => {
      const natija = String(oquvchi.result ?? "");
      resolve(natija.slice(natija.indexOf(",") + 1));
    };
    oquvchi.onerror = () => reject(oquvchi.error ?? new Error("FileReader"));
    oquvchi.readAsDataURL(blob);
  });
}

async function manzildanBlob(manzil: string): Promise<Blob | null> {
  const saqlangan = bloblar.get(manzil);
  if (saqlangan) return saqlangan;
  if (manzil.startsWith("blob:") || manzil.startsWith("data:")) {
    try {
      return await (await fetch(manzil)).blob();
    } catch {
      return null;
    }
  }
  return null;
}

export async function faylniSaqlash(blob: Blob, nom: string) {
  const faylNomi = nom || standartNom(blob);
  const mime = mimeAniqlash(blob, faylNomi);
  try {
    const { uri, joy } = await YePostNative.faylniSaqlash({ base64: await base64ga(blob), nom: faylNomi, mime });
    toast.success(nativMatn("saqlandi"), {
      description: joy,
      duration: 8000,
      action: {
        label: nativMatn("ochish"),
        onClick: () => {
          YePostNative.saqlanganniOchish({ uri, mime }).catch(() => toast.error(nativMatn("ochilmadi")));
        },
      },
    });
  } catch {
    toast.error(nativMatn("saqlanmadi"));
  }
}

export async function faylniKorish(blob: Blob, nom?: string) {
  const faylNomi = nom || standartNom(blob);
  try {
    await YePostNative.faylniOchish({ base64: await base64ga(blob), nom: faylNomi, mime: mimeAniqlash(blob, faylNomi) });
  } catch {
    toast.error(nativMatn("ochilmadi"));
  }
}

export async function tashqiHavolaniOchish(url: string) {
  try {
    await YePostNative.tashqiHavola({ url });
  } catch {
    toast.error(nativMatn("havolaXato"));
  }
}

function htmlniChopEtish(html: string, nom: string) {
  YePostNative.htmlniChopEtish({ html, nom: nom || "Aisa" }).catch(() => toast.error(nativMatn("chopXato")));
}

function tashqiMi(url: URL) {
  return url.origin !== window.location.origin && /^(https?|tel|mailto|tg):$/.test(url.protocol);
}

/** Manzilni ilova ichida qanday ochish kerakligini hal qiladi. true — ushlandi (brauzer harakati kerak emas). */
function manzilniOchish(manzil: string, yuklashNomi?: string | null): boolean {
  let url: URL;
  try {
    url = new URL(manzil, window.location.href);
  } catch {
    return false;
  }
  if (url.protocol === "blob:" || url.protocol === "data:") {
    void manzildanBlob(url.href).then((blob) => {
      if (!blob) {
        toast.error(nativMatn("ochilmadi"));
        return;
      }
      if (yuklashNomi !== undefined && yuklashNomi !== null) void faylniSaqlash(blob, yuklashNomi);
      else void faylniKorish(blob);
    });
    return true;
  }
  if (yuklashNomi !== undefined && yuklashNomi !== null && url.origin === window.location.origin) {
    // Ilova ichidagi faylni (masalan, Excel shablon) yuklash: WebView sahifadan chiqib ketmasin — fayl o'qilib saqlanadi.
    void fetch(url.href)
      .then((javob) => (javob.ok ? javob.blob() : Promise.reject(new Error(String(javob.status)))))
      .then((blob) => faylniSaqlash(blob, yuklashNomi || url.pathname.split("/").pop() || ""))
      .catch(() => toast.error(nativMatn("saqlanmadi")));
    return true;
  }
  if (tashqiMi(url)) {
    void tashqiHavolaniOchish(url.href);
    return true;
  }
  return false;
}

/**
 * Bo'sh `window.open("")` o'rniga: yashirin iframe. Chaqiruvchi unga HTML yozadi (chop etish) yoki keyin PDF manzilini beradi.
 * Xavfsizlik: iframe `sandbox="allow-same-origin"` — ota sahifa unga yozib/o'qiy oladi, lekin yozilgan HTML ichidagi skript va
 * hodisa ishlovchilari (onerror va h.k.) BAJARILMAYDI. Shuning uchun HTML ichidagi `window.print()` o'rniga chop etish
 * `document.close()` paytida shu yerdan boshlanadi (yozilgan matnda print chaqiruvi bo'lsa).
 */
function ichkiOyna(): Window | null {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("sandbox", "allow-same-origin");
  iframe.tabIndex = -1;
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;visibility:hidden;pointer-events:none";
  document.body.appendChild(iframe);
  const asl = iframe.contentDocument;
  if (!asl) {
    iframe.remove();
    return null;
  }
  const hujjat: Document = asl;
  let yopildi = false;
  let yozilgan = "";
  const yopish = () => {
    if (yopildi) return;
    yopildi = true;
    iframe.remove();
  };
  const chopEtish = () => {
    if (yopildi) return;
    htmlniChopEtish(`<!doctype html>${hujjat.documentElement.outerHTML}`, hujjat.title);
    window.setTimeout(yopish, 0);
  };
  const otish = (manzil: string | URL) => {
    manzilniOchish(String(manzil));
    yopish();
  };
  // Chaqiruvchi ko'radigan `document`: haqiqiy hujjat, faqat write/writeln/close kuzatiladi.
  const hujjatOrami = new Proxy(hujjat, {
    get(nishon, kalit) {
      if (kalit === "write" || kalit === "writeln") {
        return (...qismlar: string[]) => {
          yozilgan += qismlar.join("");
          (kalit === "write" ? nishon.write : nishon.writeln).apply(nishon, qismlar);
        };
      }
      if (kalit === "close") {
        return () => {
          nishon.close();
          if (/\bprint\s*\(/.test(yozilgan)) window.setTimeout(chopEtish, 50);
        };
      }
      const qiymat = Reflect.get(nishon, kalit, nishon);
      return typeof qiymat === "function" ? qiymat.bind(nishon) : qiymat;
    },
    set(nishon, kalit, qiymat) {
      return Reflect.set(nishon, kalit, qiymat, nishon);
    },
  });
  const joylashuv = {
    get href() {
      return "about:blank";
    },
    set href(manzil: string) {
      otish(String(manzil));
    },
    assign: otish,
    replace: otish,
  };
  const oyna = {
    get document() {
      return hujjatOrami;
    },
    get closed() {
      return yopildi;
    },
    get location(): unknown {
      return joylashuv;
    },
    set location(manzil: unknown) {
      otish(String(manzil));
    },
    opener: null as unknown,
    close: yopish,
    print: chopEtish,
    focus: () => undefined,
    blur: () => undefined,
  };
  return oyna as unknown as Window;
}

function anchorniUshlash(a: HTMLAnchorElement): boolean {
  const href = a.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false;
  const yuklash = a.hasAttribute("download") ? a.getAttribute("download") || "" : null;
  // Ilova ichidagi oddiy havolalar (React Router) o'z holicha ishlaydi.
  if (yuklash === null && !/^(blob|data):/i.test(href)) {
    try {
      const url = new URL(href, window.location.href);
      if (!tashqiMi(url)) return false;
    } catch {
      return false;
    }
  }
  return manzilniOchish(href, yuklash);
}

export function fayllarniOrnatish() {
  const aslYaratish = URL.createObjectURL.bind(URL);
  const aslBekor = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (obyekt: Blob | MediaSource) => {
    const url = aslYaratish(obyekt);
    if (obyekt instanceof Blob) bloblar.set(url, obyekt);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    window.setTimeout(() => {
      bloblar.delete(url);
      aslBekor(url);
    }, BLOB_SAQLASH_MS);
  };

  const aslClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (anchorniUshlash(this)) return;
    aslClick.call(this);
  };
  document.addEventListener(
    "click",
    (event) => {
      if (event.defaultPrevented) return;
      const a = (event.target as Element | null)?.closest?.("a");
      if (a instanceof HTMLAnchorElement && anchorniUshlash(a)) event.preventDefault();
    },
    true
  );

  window.open = ((manzil?: string | URL, nishon?: string) => {
    const matn = manzil ? String(manzil) : "";
    if (!matn || matn === "about:blank") return ichkiOyna();
    if (manzilniOchish(matn)) return null;
    // Ilova ichidagi sahifa ("yangi oynada ochish"): ilovada tablar yo'q — shu oynada ochiladi.
    try {
      const url = new URL(matn, window.location.href);
      if (url.href !== window.location.href) window.location.assign(url.href);
    } catch {
      // noto'g'ri manzil — e'tiborsiz
    }
    void nishon;
    return null;
  }) as typeof window.open;

  window.print = () => {
    YePostNative.sahifaniChopEtish({ nom: document.title || "Aisa" }).catch(() => toast.error(nativMatn("chopXato")));
  };
}
