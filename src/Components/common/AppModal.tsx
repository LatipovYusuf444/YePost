import type { ReactNode } from "react";
import { createPortal } from "react-dom";

type AppModalProps = {
  children: ReactNode;
  className?: string;
};

export default function AppModal({ children, className = "" }: AppModalProps) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`scrollbar-hidden fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}
