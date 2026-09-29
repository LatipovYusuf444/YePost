import { useMemo, useState, type FormEvent } from "react";
import { Briefcase, Building2, CalendarDays, Hash, Phone, Truck, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import PhoneInput from "@/Components/ui/PhoneInput";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import FaoliyatPaneli from "./FaoliyatPaneli";
import IjtimoiyTanlov from "./IjtimoiyTanlov";
import TezkorPanel from "./TezkorPanel";
import { KirimTab, TarixTab, TolovlarTab } from "./XaridorTablari";
import type { Kirim, YetkazibBeruvchi } from "./types";
import { bugun, maydonKlass, yangiId } from "./yordamchilar";

type MalumotTab = "malumotlar" | "kirim" | "tolovlar" | "tarix";
const malumotTabKalitlari: MalumotTab[] = ["malumotlar", "kirim", "tolovlar", "tarix"];

type Props = {
  boshlangich: YetkazibBeruvchi | null;
  kirimlar: Kirim[];
  onYopish: () => void;
  onSaqlash: (yetkazibBeruvchi: YetkazibBeruvchi) => Promise<void>;
};

export default function YetkazibBeruvchiModal({ boshlangich, kirimlar, onYopish, onSaqlash }: Props) {
  const { t } = useTranslation(["xaridor_uchot", "common"]);
  const malumotTablari = malumotTabKalitlari.map((kalit) => ({ kalit, nom: t(`shared.tabs.${kalit}`) }));
  const [nomi, setNomi] = useState(boshlangich?.nomi ?? "");
  const [stir, setStir] = useState(boshlangich?.stir ?? "");
  const [telefon, setTelefon] = useState(boshlangich?.telefon ?? "");
  const [aloqaShaxsi, setAloqaShaxsi] = useState(boshlangich?.aloqaShaxsi ?? "");
  const [aloqaTelefoni, setAloqaTelefoni] = useState(boshlangich?.aloqaTelefoni ?? "");
  const [lavozim, setLavozim] = useState(boshlangich?.lavozim ?? "");
  const [telegram, setTelegram] = useState(boshlangich?.ijtimoiy.telegram ?? "");
  const [whatsapp, setWhatsapp] = useState(boshlangich?.ijtimoiy.whatsapp ?? "");
  const [instagram, setInstagram] = useState(boshlangich?.ijtimoiy.instagram ?? "");
  const [yaratilganSana, setYaratilganSana] = useState(boshlangich?.yaratilganSana ?? bugun());
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [faolTab, setFaolTab] = useState<MalumotTab>("malumotlar");

  const beruvchiKirimlari = useMemo(
    () => kirimlar.filter((kirim) => kirim.yetkazibBeruvchiId === boshlangich?.id),
    [boshlangich?.id, kirimlar]
  );

  async function saqlash(event: FormEvent) {
    event.preventDefault();

    if (!nomi.trim()) {
      setXato(t("yetkazibModal.requiredError"));
      return;
    }

    setSaqlanmoqda(true);
    try {
      await onSaqlash({
      id: boshlangich?.id ?? yangiId("ytk"),
      partnerId: boshlangich?.partnerId,
      nomi: nomi.trim(),
      stir: stir.trim(),
      telefon: telefon.trim(),
      aloqaShaxsi: aloqaShaxsi.trim(),
      aloqaTelefoni: aloqaTelefoni.trim(),
      lavozim: lavozim.trim(),
      ijtimoiy: {
        telegram: telegram.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
        website: boshlangich?.ijtimoiy.website ?? "",
      },
      yaratganMasul: boshlangich?.yaratganMasul ?? t("shared.defaultResponsible"),
      yaratilganSana,
      ozgartirilganSana: bugun(),
      ozgartirganMasul: t("shared.defaultResponsible"),
      customFields: boshlangich?.customFields ?? {},
      });
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-[88px] pr-4 backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={boshlangich?.id ?? "yangi"}
          faylNomi={`yetkazib-beruvchi-${boshlangich?.id ?? "yangi"}`}
          malumot={boshlangich ?? { nomi, stir, telefon }}
          onYopish={onYopish}
        />

        <form
          onSubmit={saqlash}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-l-[46px] rounded-r-[36px] bg-gradient-to-br from-[#F8FAFC] via-[#FFFFFF] to-[#E8EEF7] text-[#253044] shadow-[0_34px_120px_rgba(15,23,42,.42)] ring-1 ring-white/80"
        >
          <header className="border-b border-orange-100/80 bg-[#F8FAFC]/90 px-9 py-6 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#EFF6FF] text-[#2563EB]">
                  <Truck size={22} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {boshlangich ? t("yetkazibModal.editTitle") : t("yetkazibModal.newTitle")}
                  </h1>
                  <span className="text-xs font-black uppercase tracking-wider text-[#2563EB]">
                    {t("yetkazibModal.badge")}
                  </span>
                </div>
              </div>
            </div>

            <nav className="mt-6 flex items-center gap-3 overflow-x-auto">
              {malumotTablari.map((tab) => (
                <button
                  key={tab.kalit}
                  type="button"
                  onClick={() => setFaolTab(tab.kalit)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm transition ${
                    faolTab === tab.kalit
                      ? "border border-orange-200 bg-white text-[#2563EB]"
                      : "text-slate-500 hover:bg-white hover:text-[#2563EB]"
                  }`}
                >
                  {tab.nom}
                </button>
              ))}
            </nav>
          </header>

          <div className="scrollbar-orange flex-1 overflow-y-auto">
            {faolTab === "malumotlar" && (
              <div className="px-9 py-7">
                {xato && (
                  <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {xato}
                  </p>
                )}

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
                      <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                        {t("yetkazibModal.sectionTitle")}
                      </h2>

                      <div className="mt-5 space-y-4">
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Building2 size={14} className="text-[#2563EB]" />
                            {t("yetkazibModal.name")}
                          </span>
                          <input
                            value={nomi}
                            onChange={(event) => setNomi(event.target.value)}
                            placeholder={t("yetkazibModal.namePlaceholder")}
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Hash size={14} className="text-[#2563EB]" />
                            {t("yetkazibModal.stir")}
                          </span>
                          <input
                            value={stir}
                            onChange={(event) => setStir(event.target.value)}
                            placeholder={t("yetkazibModal.stirPlaceholder")}
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#2563EB]" />
                            {t("yetkazibModal.phone")}
                          </span>
                          <PhoneInput value={telefon} onChange={setTelefon} />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <UserRound size={14} className="text-[#2563EB]" />
                            {t("yetkazibModal.contactPerson")}
                          </span>
                          <input
                            value={aloqaShaxsi}
                            onChange={(event) => setAloqaShaxsi(event.target.value)}
                            placeholder={t("yetkazibModal.contactPersonPlaceholder")}
                            className={maydonKlass}
                          />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#2563EB]" />
                            {t("yetkazibModal.contactPhone")}
                          </span>
                          <PhoneInput value={aloqaTelefoni} onChange={setAloqaTelefoni} />
                        </label>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Briefcase size={14} className="text-[#2563EB]" />
                            {t("yetkazibModal.position")}
                          </span>
                          <input
                            value={lavozim}
                            onChange={(event) => setLavozim(event.target.value)}
                            placeholder={t("yetkazibModal.positionPlaceholder")}
                            className={maydonKlass}
                          />
                        </label>

                        <IjtimoiyTanlov
                          qiymatlar={{ telegram, whatsapp, instagram }}
                          onChange={(tarmoq, qiymat) => {
                            if (tarmoq === "telegram") setTelegram(qiymat);
                            else if (tarmoq === "whatsapp") setWhatsapp(qiymat);
                            else setInstagram(qiymat);
                          }}
                        />

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <CalendarDays size={14} className="text-[#2563EB]" />
                            {t("shared.registeredDateLabel")}
                          </span>
                          <input
                            type="date"
                            value={yaratilganSana}
                            onChange={(event) => setYaratilganSana(event.target.value)}
                            className={maydonKlass}
                          />
                        </label>
                      </div>
                    </section>
                  </div>

                  <FaoliyatPaneli partnerId={boshlangich?.partnerId} />
                </div>
              </div>
            )}

            {faolTab === "kirim" && (
              <KirimTab kirimlar={beruvchiKirimlari} beruvchiNomi={nomi || boshlangich?.nomi || "—"} />
            )}
            {faolTab === "tolovlar" && <TolovlarTab tolovlar={[]} />}
            {faolTab === "tarix" && <TarixTab tarix={[]} />}
          </div>

          <footer className="flex justify-end gap-3 border-t border-orange-100 bg-[#F8FAFC]/90 px-9 py-4 backdrop-blur-xl">
            <button
              type="button"
              onClick={onYopish}
              className="rounded-2xl bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-200"
            >
              {t("common:actions.cancel")}
            </button>
            <button disabled={saqlanmoqda} className="rounded-2xl bg-[#2563EB] px-6 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(37,99,235,.24)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] disabled:opacity-50">
              {saqlanmoqda ? t("root.saving") : t("common:actions.save")}
            </button>
          </footer>
        </form>
      </div>
    </AppModal>
  );
}
