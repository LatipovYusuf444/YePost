import { Download, ExternalLink, Link as LinkIcon, X } from "lucide-react";

type Props = {
  havolaId: string;
  faylNomi: string;
  malumot: unknown;
  onYopish: () => void;
};

// Modalkaning chap chetidagi tezkor amallar ustuni (sotuv modalkasidagi kabi).
export default function TezkorPanel({ havolaId, faylNomi, malumot, onYopish }: Props) {
  const havola = `${window.location.origin}${window.location.pathname}?xaridor=${havolaId}`;

  function havolaniNusxalash() {
    void navigator.clipboard?.writeText(havola);
  }

  function jsonYuklash() {
    const blob = new Blob([JSON.stringify(malumot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${faylNomi}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const amallar = [
    { label: "Yopish", icon: X, onClick: onYopish },
    { label: "Havolani nusxalash", icon: LinkIcon, onClick: havolaniNusxalash },
    { label: "Ma'lumotni yuklab olish", icon: Download, onClick: jsonYuklash },
    {
      label: "Alohida oynada ochish",
      icon: ExternalLink,
      onClick: () => window.open(havola, "_blank", "noopener,noreferrer"),
    },
  ];

  return (
    <div className="absolute -left-[52px] top-7 z-50 flex flex-col items-center gap-2">
      {amallar.map((amal, index) => {
        const Icon = amal.icon;
        const yopish = index === 0;
        return (
          <button
            key={amal.label}
            type="button"
            onClick={amal.onClick}
            title={amal.label}
            className={`flex h-11 w-11 items-center justify-center rounded-[15px] shadow-[0_10px_24px_rgba(15,23,42,.18)] ring-1 ring-white/70 transition duration-300 hover:-translate-x-0.5 hover:scale-105 active:scale-95 ${
              yopish
                ? "bg-[#FF6A00] text-white hover:bg-[#EA580C]"
                : "bg-white text-[#FF6A00] hover:bg-[#FFF3E2] hover:text-[#EA580C]"
            }`}
            aria-label={amal.label}
          >
            <Icon size={yopish ? 19 : 17} strokeWidth={2.3} />
          </button>
        );
      })}
    </div>
  );
}
