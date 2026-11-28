import { App } from "@capacitor/app";

/**
 * Android "Orqaga" tugmasi:
 * 1) ochiq oyna/ro'yxat/menyu bo'lsa — uni yopadi (Esc bilan bir xil: saqlanmagan o'zgarish bo'lsa tasdiq so'raladi);
 * 2) ilova ichida oldingi sahifa bo'lsa — orqaga qaytadi;
 * 3) bosh sahifa yoki login'da — ilovani yopmasdan fonga yuboradi (sessiya saqlanadi).
 */

const QATLAMLAR = [
  ".app-modal-compact",
  "[role='dialog']",
  "[role='alertdialog']",
  "[data-radix-popper-content-wrapper]",
  "[role='listbox']",
  "[role='menu']",
].join(",");

function korinadimi(el: Element) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const uslub = window.getComputedStyle(el);
  return uslub.display !== "none" && uslub.visibility !== "hidden";
}

function ustkiQatlam(): Element | null {
  const qatlamlar = Array.from(document.querySelectorAll(QATLAMLAR)).filter(korinadimi);
  return qatlamlar.length ? qatlamlar[qatlamlar.length - 1] : null;
}

function escYuborish() {
  const nishon = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : document.body;
  nishon.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true }));
}

const YOPISH_TUGMASI = "button[aria-label*='yopish' i], button[title*='yopish' i], button[aria-label*='close' i], button[aria-label*='закрыть' i]";

const YOPISH_MATNI = /^(yopish|close|закрыть)$/i;

function matnliYopishTugmasi(ildiz: Element) {
  return Array.from(ildiz.querySelectorAll<HTMLButtonElement>("button")).find((b) => YOPISH_MATNI.test(b.textContent?.trim() ?? "") && korinadimi(b));
}

function yopishTugmasiniBosish(qatlam: Element) {
  // AppModal: yon amallar panelining birinchi tugmasi "Yopish" (saqlanmagan o'zgarish bo'lsa tasdiq so'raladi).
  const modal = qatlam.closest(".app-modal-compact");
  const tugma =
    qatlam.querySelector<HTMLButtonElement>("button[data-modal-yopish]") ??
    qatlam.querySelector<HTMLButtonElement>(YOPISH_TUGMASI) ??
    (qatlam.querySelector("svg.lucide-x")?.closest("button") as HTMLButtonElement | null) ??
    modal?.querySelector<HTMLButtonElement>("[data-modal-action-rail] button") ??
    matnliYopishTugmasi(qatlam) ??
    // Ochiladigan ro'yxat yonidagi shaffof "yopish" qatlami (masalan, til tanlash menyusi).
    (Array.from(qatlam.parentElement?.children ?? []).find((el) => el !== qatlam && el.matches(YOPISH_TUGMASI)) as HTMLButtonElement | undefined);
  if (tugma && !tugma.disabled) {
    tugma.click();
    return;
  }
  // Oxirgi chora: "tashqariga bosish" (ko'p ro'yxatlar tashqaridagi pointerdown/mousedown bilan yopiladi). Hech narsa bosilmaydi.
  const hodisa = { bubbles: true, cancelable: true, clientX: 1, clientY: 1 };
  document.body.dispatchEvent(new PointerEvent("pointerdown", hodisa));
  document.body.dispatchEvent(new MouseEvent("mousedown", hodisa));
}

export function orqagaTugmasiniOrnatish() {
  void App.addListener("backButton", ({ canGoBack }) => {
    const qatlam = ustkiQatlam();
    if (qatlam) {
      escYuborish();
      // Esc'ni tinglamaydigan oyna bo'lsa — uning "Yopish"/X tugmasi bosiladi.
      window.setTimeout(() => {
        if (qatlam.isConnected && korinadimi(qatlam) && ustkiQatlam() === qatlam) yopishTugmasiniBosish(qatlam);
      }, 180);
      return;
    }
    const yol = window.location.pathname;
    if (canGoBack && yol !== "/" && yol !== "/login") {
      window.history.back();
      return;
    }
    void App.minimizeApp();
  });
}
