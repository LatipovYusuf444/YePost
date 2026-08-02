import { Check, Download, ExternalLink, Link as LinkIcon, X } from "lucide-react";
import { useState } from "react";

type Props = {
  top: number;
  left: number;
  onClose: () => void;
  onDownload: () => void;
  onOpenExternal: () => void;
};

export default function ModalActionRail({ top, left, onClose, onDownload, onOpenExternal }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const input = document.createElement("textarea");
      input.value = url;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const actions = [
    { label: "Yopish", icon: X, onClick: onClose, close: true },
    { label: copied ? "Havola nusxalandi" : "Havolani nusxalash", icon: copied ? Check : LinkIcon, onClick: () => void copyLink() },
    { label: "Modal ma'lumotini yuklab olish", icon: Download, onClick: onDownload },
    { label: "Alohida oynada ochish", icon: ExternalLink, onClick: onOpenExternal },
  ];

  return (
    <div
      data-modal-action-rail="true"
      className="app-modal-action-rail fixed z-[100120] flex flex-col items-center gap-2"
      style={{ top, left }}
    >
      {actions.map(({ label, icon: Icon, onClick, close }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          title={label}
          aria-label={label}
          className={`flex h-10 w-10 items-center justify-center rounded-[14px] shadow-[0_8px_20px_rgba(15,23,42,.2)] ring-1 ring-white/80 transition duration-200 hover:-translate-x-0.5 hover:scale-105 active:scale-95 ${
            close
              ? "bg-[#FF5A00] text-white hover:bg-[#E95200]"
              : "bg-white text-[#FF5A00] hover:bg-orange-50"
          }`}
        >
          <Icon size={close ? 18 : 17} strokeWidth={2.2} />
        </button>
      ))}
    </div>
  );
}
