import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ModalActionRail from "./ModalActionRail";

// Modal panelining yuqori qismida o'zining yopish tugmasi (X) bormi? Telefonda yon "amallar ustuni"
// uchun joy yo'q: tugma bor bo'lsa ustun yashiriladi, yo'q bo'lsa faqat "Yopish" qoladi.
function oziningYopishTugmasiBormi(overlay: HTMLElement) {
  const yuqori = overlay.getBoundingClientRect().top + 150;
  return Array.from(overlay.querySelectorAll<HTMLButtonElement>("button")).some((tugma) => {
    if (tugma.closest('[data-modal-action-rail="true"]')) return false;
    if (tugma.closest('[class~="absolute"][class*="-left-"][class*="flex-col"]')) return false;
    const joy = tugma.getBoundingClientRect();
    // Ko'rinmaydigan (ekrandan tashqaridagi yoki o'lchamsiz) tugma "o'zining yopish tugmasi" hisoblanmaydi.
    if (joy.width === 0 || joy.left < 0 || joy.right > window.innerWidth || joy.top > yuqori) return false;
    return Boolean(tugma.querySelector("svg.lucide-x")) || /yopish|close|закры/i.test(tugma.getAttribute("aria-label") ?? "");
  });
}

let ochiqModallarSoni = 0;
let oldingiBodyOverflow = "";
let oldingiHtmlOverflow = "";

type AppModalProps = {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  actionRail?: boolean;
};

export default function AppModal({ children, className = "", onClose, actionRail = true }: AppModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
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
      setRailHolati({ top, left, ixcham: joyYoq });
    }

    joylashtirish();
    const observer = new ResizeObserver(joylashtirish);
    observer.observe(modalPanel);
    window.addEventListener("resize", joylashtirish);
    window.addEventListener("scroll", joylashtirish, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", joylashtirish);
      window.removeEventListener("scroll", joylashtirish, true);
    };
  }, [actionRail, children]);

  function modalniYopish() {
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

  function modalniYuklash() {
    const matn = overlayRef.current?.innerText.trim();
    if (!matn) return;
    const blob = new Blob([matn], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `modal-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
          onDownload={modalniYuklash}
          onOpenExternal={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
        />
      )}
    </div>,
    document.body
  );
}
