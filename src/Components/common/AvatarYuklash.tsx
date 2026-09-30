import { useRef, useState, type DragEvent } from "react";
import { Camera, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { rasmniTayyorlash, rasmniTekshirish, RASM_TURLARI } from "@/lib/rasmYordamchilari";

export type TanlanganRasm = { blob: Blob; dataUrl: string };

// Rasm tanlash bloki: kattalashtirilgan avatar, "Yuklash / O'zgartirish / Olib tashlash" tugmalari va drag&drop.
// Yuklash kod tomonidan (Saqlash bosilganda) amalga oshiriladi — bu komponent faqat tanlovni qaytaradi.
export default function AvatarYuklash({
  korinadiganRasm,
  bosHarflar,
  onTanlandi,
  onOlibTashlandi,
  disabled = false,
}: {
  korinadiganRasm?: string;
  bosHarflar: string;
  onTanlandi: (rasm: TanlanganRasm) => void;
  onOlibTashlandi: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation("sozlamalar_uchot");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [xato, setXato] = useState("");
  const [tayyorlanmoqda, setTayyorlanmoqda] = useState(false);
  const [tortilmoqda, setTortilmoqda] = useState(false);

  async function faylniQabulQilish(file?: File | null) {
    if (!file || disabled) return;
    const xatoKaliti = rasmniTekshirish(file);
    if (xatoKaliti) {
      setXato(t(xatoKaliti));
      return;
    }
    setXato("");
    setTayyorlanmoqda(true);
    try {
      onTanlandi(await rasmniTayyorlash(file));
    } catch {
      setXato(t("avatar.errors.read"));
    } finally {
      setTayyorlanmoqda(false);
    }
  }

  function tashlash(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setTortilmoqda(false);
    void faylniQabulQilish(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div
        onDragOver={(event) => { event.preventDefault(); setTortilmoqda(true); }}
        onDragLeave={() => setTortilmoqda(false)}
        onDrop={tashlash}
        className={`group relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] shadow-[0_12px_28px_rgba(15,23,42,.14)] ring-4 transition ${
          tortilmoqda ? "ring-gold-400" : "ring-white"
        }`}
      >
        {korinadiganRasm ? (
          <img src={korinadiganRasm} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gold-400 to-gold-600 text-3xl font-black tracking-wide text-white">
            {bosHarflar}
          </span>
        )}
        <button
          type="button"
          disabled={disabled || tayyorlanmoqda}
          onClick={() => inputRef.current?.click()}
          aria-label={t("avatar.change")}
          className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
        >
          {tayyorlanmoqda ? <LoaderCircle size={22} className="animate-spin" /> : <Camera size={22} />}
        </button>
      </div>

      <div className="min-w-0">
        <input
          ref={inputRef}
          type="file"
          accept={RASM_TURLARI.join(",")}
          className="hidden"
          onChange={(event) => {
            void faylniQabulQilish(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || tayyorlanmoqda}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 text-sm font-bold text-white shadow-sm shadow-gold-200 transition hover:bg-gold-600 disabled:opacity-60"
          >
            <ImagePlus size={16} />
            {korinadiganRasm ? t("avatar.change") : t("avatar.upload")}
          </button>
          {korinadiganRasm && (
            <button
              type="button"
              disabled={disabled}
              onClick={onOlibTashlandi}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 text-sm font-bold text-red-500 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 size={15} />
              {t("avatar.remove")}
            </button>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-400">{t("avatar.hint")}</p>
        {xato && <p className="mt-1.5 text-xs font-bold text-red-500">{xato}</p>}
      </div>
    </div>
  );
}
