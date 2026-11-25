import { useNavigate } from "react-router-dom";
import { Box, Building2, ExternalLink, FlaskConical, Truck, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";

// Sozlamalar → 3D Demo: zavodning 3D ko'rinishini ochish. Faqat ADMIN va DIREKTOR uchun (bo'lim ham, /demo/3d sahifasi ham).
export default function Demo3dBolimi() {
  const { t } = useTranslation("sozlamalar_uchot");
  const navigate = useNavigate();
  const imkoniyatlar = [
    { icon: Building2, matn: t("demo3d.f1") },
    { icon: Warehouse, matn: t("demo3d.f2") },
    { icon: Truck, matn: t("demo3d.f3") },
  ];
  return (
    <section data-demo3d-bolimi className="overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
      <div className="relative bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 px-6 py-7 text-white">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Box size={26} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black">{t("demo3d.title")}</h2>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-blue-50">{t("demo3d.desc")}</p>
          </div>
        </div>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-950">
          <FlaskConical size={13} aria-hidden="true" />
          {t("demo3d.badge")}
        </span>
      </div>
      <div className="space-y-5 p-6">
        <ul className="grid gap-3 sm:grid-cols-3">
          {imkoniyatlar.map(({ icon: Ikonka, matn }) => (
            <li key={matn} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
              <Ikonka size={18} className="mt-0.5 shrink-0 text-blue-600" aria-hidden="true" />
              {matn}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-500">{t("demo3d.access")}</p>
          <button
            type="button"
            data-demo-3d
            onClick={() => navigate("/demo/3d")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t("demo3d.open")}
          </button>
        </div>
      </div>
    </section>
  );
}
