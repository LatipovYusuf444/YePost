import type { ReactNode } from "react";

// Sozlamalar bo'limlari uchun umumiy UI qismlari.

export function BolimKarta({
  sarlavha,
  izoh,
  children,
  amal,
}: {
  sarlavha: string;
  izoh?: string;
  children: ReactNode;
  amal?: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-orange-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-orange-100/80 pb-4">
        <div>
          <h2 className="text-lg font-black text-gray-950">{sarlavha}</h2>
          {izoh && <p className="mt-0.5 text-sm text-gray-500">{izoh}</p>}
        </div>
        {amal}
      </div>
      {children}
    </section>
  );
}

export function Maydon({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function Switch({
  yoniq,
  onChange,
  disabled = false,
}: {
  yoniq: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={yoniq}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        yoniq ? "bg-[#FF6A00]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          yoniq ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function SaqlashTugma({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#FF6A00] px-6 text-sm font-black text-white shadow-[0_14px_32px_rgba(255,106,0,.24)] transition hover:-translate-y-0.5 hover:bg-[#EA580C]"
    >
      Saqlash
    </button>
  );
}
