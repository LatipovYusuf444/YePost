import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ModalActionRail from "./ModalActionRail";

type AppModalProps = {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
  actionRail?: boolean;
};

export default function AppModal({ children, className = "", onClose, actionRail = true }: AppModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [railHolati, setRailHolati] = useState<{ top: number; left: number } | null>(null);
  const [maxsusRailBor, setMaxsusRailBor] = useState(true);

  useLayoutEffect(() => {
    if (!actionRail) return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const maxsusRail = overlay.querySelector<HTMLElement>(
      '[class*="-left-"][class*="flex-col"]:not([data-modal-action-rail])'
    );
    setMaxsusRailBor(Boolean(maxsusRail));
    if (maxsusRail) return;

    const panel = Array.from(overlay.children).find(
      (child) => !(child as HTMLElement).dataset.modalActionRail
    ) as HTMLElement | undefined;
    if (!panel) return;
    const modalPanel = panel;

    function joylashtirish() {
      const rect = modalPanel.getBoundingClientRect();
      const left = Math.max(10, rect.left - 62);
      const top = Math.max(12, Math.min(rect.top + 24, window.innerHeight - 238));
      setRailHolati({ top, left });
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
      data-generated-action-rail={actionRail && !maxsusRailBor ? "true" : undefined}
      className={`app-modal-compact scrollbar-hidden fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm ${className}`}
    >
      {children}
      {actionRail && !maxsusRailBor && railHolati && (
        <ModalActionRail
          top={railHolati.top}
          left={railHolati.left}
          onClose={modalniYopish}
          onDownload={modalniYuklash}
          onOpenExternal={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
        />
      )}
    </div>,
    document.body
  );
}
