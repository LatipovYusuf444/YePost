import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import ModalActionRail from "./ModalActionRail";
import TasdiqlashOynasi from "./TasdiqlashOynasi";

// Modal panelining yuqori qismida o'zining yopish tugmasi (X) bormi? Telefonda yon "amallar ustuni"
// uchun joy yo'q: tugma bor bo'lsa ustun yashiriladi, yo'q bo'lsa faqat "Yopish" qoladi.
function oziningYopishTugmasiBormi(overlay: HTMLElement) {
  const yuqori = overlay.getBoundingClientRect().top + 150;
  return Array.from(overlay.querySelectorAll<HTMLButtonElement>("button")).some((tugma) => {
    if (tugma.closest('[data-modal-action-rail="true"]')) return false;
    if (tugma.closest('[class~="absolute"][class*="-left-"][class*="flex-col"]')) return false;
    const yopishTugmasi = Boolean(tugma.querySelector("svg.lucide-x")) || /yopish|close|закры/i.test(tugma.getAttribute("aria-label") ?? "");
    if (!yopishTugmasi) return false;
    const joy = tugma.getBoundingClientRect();
    // Ko'rinmaydigan (ekrandan tashqaridagi yoki o'lchamsiz) tugma "o'zining yopish tugmasi" hisoblanmaydi.
    if (joy.width === 0 || joy.left < 0 || joy.right > window.innerWidth || joy.top > yuqori) return false;
    return true;
  });
}

let ochiqModallarSoni = 0;
let oldingiBodyOverflow = "";
let oldingiHtmlOverflow = "";
// Saqlanmagan o'zgarishlar tekshiruvi yoqilgan modallar (ochilish tartibida): Esc faqat eng ustkisiga tegishli.
const himoyaliModallar: symbol[] = [];

// Yopish tugmasi: `ozgarishBor` bo'lganda shu atribut qo'yilgan tugma bosilsa avval tasdiq so'raladi.
export const MODAL_YOPISH_ATRIBUTI = "data-modal-yopish";

type AppModalProps = {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  actionRail?: boolean;
  // Foydalanuvchi forma ma'lumotini o'zgartirgan (saqlanmagan). `true` bo'lsa yon "Yopish", Esc va
  // `data-modal-yopish` tugmalari yopishdan oldin tasdiq so'raydi.
  ozgarishBor?: boolean;
};

export default function AppModal({ children, className = "", onClose, actionRail = true, ozgarishBor = false }: AppModalProps) {
  const { t } = useTranslation("common");
  const overlayRef = useRef<HTMLDivElement>(null);
  const [yopishSorovi, setYopishSorovi] = useState<{ amal: () => void } | null>(null);
  const bypass = useRef(false);
  const holat = useRef({ ozgarishBor, sorovOchiq: false, yopish: () => {} });
  useEffect(() => {
    holat.current = { ozgarishBor, sorovOchiq: yopishSorovi !== null, yopish: modalniAslYopish };
  });
  const [railHolati, setRailHolati] = useState<{ top: number; left: number; ixcham: boolean } | null>(null);

  useLayoutEffect(() => {
    if (ochiqModallarSoni === 0) {
      oldingiBodyOverflow = document.body.style.overflow;
      oldingiHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    ochiqModallarSoni += 1;

    return () => {
      ochiqModallarSoni = Math.max(0, ochiqModallarSoni - 1);
      if (ochiqModallarSoni === 0) {
        document.body.style.overflow = oldingiBodyOverflow;
        document.documentElement.style.overflow = oldingiHtmlOverflow;
      }
    };
  }, []);

  useEffect(() => {
    if (!actionRail) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.dataset.ownClose = oziningYopishTugmasiBormi(overlay) ? "true" : "false";

    const maxsusRail = overlay.querySelector<HTMLElement>(
      '[class*="-left-"][class*="flex-col"]:not([data-modal-action-rail])'
    );
    if (maxsusRail) return;

    const panel = Array.from(overlay.children).find(
      (child) => !(child as HTMLElement).dataset.modalActionRail
    ) as HTMLElement | undefined;
    if (!panel) return;
    const modalPanel = panel;

    function joylashtirish() {
      const rect = modalPanel.getBoundingClientRect();
      // Chapda 4 ta tugma sig'adigan joy yo'q (telefon): o'z X tugmasi bor modalda ustun yashiriladi,
      // yo'q bo'lsa panelning yuqori-o'ng burchagiga faqat "Yopish" qo'yiladi.
      const joyYoq = rect.left < 62;
      if (joyYoq && overlay!.dataset.ownClose === "true") {
        setRailHolati(null);
        return;
      }
      const left = joyYoq ? Math.max(12, rect.right - 54) : Math.max(12, rect.left - 50);
      const top = joyYoq ? rect.top + 10 : Math.max(12, Math.min(rect.top + 20, window.innerHeight - 208));
      setRailHolati((oldingi) =>
        oldingi?.top === top && oldingi.left === left && oldingi.ixcham === joyYoq
          ? oldingi
          : { top, left, ixcham: joyYoq }
      );
    }

    // Scroll/resize hodisalari bitta kadrda bir martagina joylashuvni o'lchaydi.
    let kadr: number | null = null;
    function navbatgaQoyish() {
      if (kadr !== null) return;
      kadr = window.requestAnimationFrame(() => { kadr = null; joylashtirish(); });
    }
    navbatgaQoyish();
    const observer = new ResizeObserver(navbatgaQoyish);
    observer.observe(modalPanel);
    window.addEventListener("resize", navbatgaQoyish);
    window.addEventListener("scroll", navbatgaQoyish, true);
    return () => {
      if (kadr !== null) window.cancelAnimationFrame(kadr);
      observer.disconnect();
      window.removeEventListener("resize", navbatgaQoyish);
      window.removeEventListener("scroll", navbatgaQoyish, true);
    };
  }, [actionRail, children]);

  // Esc va `data-modal-yopish` tugmalarini ushlaydi: saqlanmagan o'zgarish bo'lsa avval tasdiq so'raladi.
  useEffect(() => {
    const id = Symbol("modal");
    himoyaliModallar.push(id);
    function ushlash(amal: () => void) {
      setYopishSorovi({ amal });
    }
    function tugma(event: KeyboardEvent) {
      const joriy = holat.current;
      if (event.key !== "Escape" || bypass.current || !joriy.ozgarishBor || joriy.sorovOchiq) return;
      if (himoyaliModallar[himoyaliModallar.length - 1] !== id) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      ushlash(() => holat.current.yopish());
    }
    function bosish(event: MouseEvent) {
      const joriy = holat.current;
      if (bypass.current || !joriy.ozgarishBor) return;
      const nishon = (event.target as Element | null)?.closest<HTMLButtonElement>(`button[${MODAL_YOPISH_ATRIBUTI}]`);
      if (!nishon || nishon.disabled) return;
      event.stopPropagation();
      event.preventDefault();
      ushlash(() => {
        bypass.current = true;
        try { nishon.click(); } finally { bypass.current = false; }
      });
    }
    const overlay = overlayRef.current;
    window.addEventListener("keydown", tugma, true);
    overlay?.addEventListener("click", bosish, true);
    return () => {
      window.removeEventListener("keydown", tugma, true);
      overlay?.removeEventListener("click", bosish, true);
      const indeks = himoyaliModallar.indexOf(id);
      if (indeks >= 0) himoyaliModallar.splice(indeks, 1);
    };
  }, []);

  // Yon "Yopish" tugmasi ham shu yerdan o'tadi.
  function modalniYopish() {
    if (ozgarishBor && !bypass.current) setYopishSorovi({ amal: modalniAslYopish });
    else modalniAslYopish();
  }

  function modalniAslYopish() {
    bypass.current = true;
    try {
      modalniYopishAmali();
    } finally {
      bypass.current = false;
    }
  }

  function modalniYopishAmali() {
    if (onClose) {
      onClose();
      return;
    }
    const overlay = overlayRef.current;
    const closeButton = Array.from(
      overlay?.querySelectorAll<HTMLButtonElement>(
        'button[aria-label*="yopish" i], button[title*="yopish" i]'
      ) ?? []
    ).find((button) => !button.closest('[data-modal-action-rail="true"]'));
    if (closeButton) {
      closeButton.click();
      return;
    }
    const xIcon = overlay?.querySelector<SVGElement>("svg.lucide-x");
    const xButton = xIcon?.closest("button");
    if (xButton instanceof HTMLButtonElement) {
      xButton.click();
      return;
    }
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-generated-action-rail={actionRail && railHolati ? "true" : undefined}
      className={`app-modal-compact fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden overscroll-none bg-black/55 p-4 backdrop-blur-sm ${className}`}
    >
      {children}
      {actionRail && railHolati && (
        <ModalActionRail
          top={railHolati.top}
          left={railHolati.left}
          ixcham={railHolati.ixcham}
          onClose={modalniYopish}
          onOpenExternal={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
        />
      )}
      {yopishSorovi && (
        <TasdiqlashOynasi
          ikonka={<TriangleAlert size={26} />}
          ohang="sariq"
          sarlavha={t("unsavedGuard.title")}
          nom=""
          tavsif={t("unsavedGuard.description")}
          ortgaMatni={t("unsavedGuard.stay")}
          tasdiqMatni={t("unsavedGuard.leave")}
          jarayonMatni={t("unsavedGuard.leaving")}
          onTasdiq={async () => yopishSorovi.amal()}
          onYopish={() => setYopishSorovi(null)}
        />
      )}
    </div>,
    document.body
  );
}
