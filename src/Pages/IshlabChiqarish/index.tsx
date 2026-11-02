import { useEffect, type ComponentType } from "react";
import { Link, Navigate } from "react-router-dom";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";
import LoadingState from "@/Components/common/LoadingState";
import { foydalanuvchiDirektormi, ishlabChiqarishRuxsati, type IshlabChiqarishBolimi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import { useIshlabChiqarishStore } from "@/store/ishlabChiqarishStore";
import Buyurtmalar from "./Buyurtmalar";
import Kalkulyatsiya from "./Kalkulyatsiya";
import Retseptlar from "./Retseptlar";
import Rulonlar from "./Rulonlar";
import SexgaBerish from "./SexgaBerish";
import Smena from "./Smena";
import { tugmaAsosiy } from "./umumiy";

const BOLIMLAR: Record<IshlabChiqarishBolimi, ComponentType> = {
  buyurtmalar: Buyurtmalar,
  retseptlar: Retseptlar,
  kalkulyatsiya: Kalkulyatsiya,
  "sexga-berish": SexgaBerish,
  smena: Smena,
  rulonlar: Rulonlar,
};
const TARTIB = Object.keys(BOLIMLAR) as IshlabChiqarishBolimi[];

// Ishlab chiqarish moduli: sozlamada yoqilmaguncha server 403 qaytaradi, shuning uchun sahifa ochilmasdan modul holati aytiladi.
export default function IshlabChiqarish({ bolim }: { bolim?: IshlabChiqarishBolimi }) {
  const { t } = useTranslation("ishlab_chiqarish");
  const profil = useAuthProfileStore((holat) => holat.profil);
  const enabled = useIshlabChiqarishStore((holat) => holat.enabled);
  const loaded = useIshlabChiqarishStore((holat) => holat.loaded);
  const load = useIshlabChiqarishStore((holat) => holat.load);
  useEffect(() => { void load(); }, [load]);

  if (!loaded) return <LoadingState matn={t("loading")} />;
  if (!enabled) {
    return (
      <div className="mx-auto max-w-lg rounded-[28px] border border-orange-100 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><Factory size={26} /></span>
        <h1 className="mt-4 text-xl font-black text-slate-900">{t("disabled.title")}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">{t(foydalanuvchiDirektormi(profil) ? "disabled.director" : "disabled.other")}</p>
        {foydalanuvchiDirektormi(profil) && <Link to="/sozlamalar?bolim=ishlabChiqarish" className={`${tugmaAsosiy} mt-5`}>{t("disabled.open")}</Link>}
      </div>
    );
  }
  const birinchi = TARTIB.find((nom) => ishlabChiqarishRuxsati(profil, nom));
  if (!bolim) return birinchi ? <Navigate to={`/ishlab-chiqarish/${birinchi}`} replace /> : <Navigate to="/" replace />;
  const Bolim = BOLIMLAR[bolim];
  return <Bolim />;
}
