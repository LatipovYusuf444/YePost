import { useMemo, useState, type FormEvent } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  MapPin,
  Phone,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import PhoneInput from "@/Components/ui/PhoneInput";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import FaoliyatPaneli from "./FaoliyatPaneli";
import IjtimoiyTanlov from "./IjtimoiyTanlov";
import Tanlov from "./Tanlov";
import TezkorPanel from "./TezkorPanel";
import { SavdolarTab, TarixTab, TolovlarTab } from "./XaridorTablari";
import type {
  TarixYozuvi,
  Xaridor,
  XaridorKompaniyasi,
  XaridorSavdosi,
  XaridorTolovi,
} from "./types";
import { bugun, maydonKlass, xaridorNomi, yangiId } from "./yordamchilar";

import ModalTablari from "@/Components/common/ModalTablari";
type MalumotTab = "malumotlar" | "savdolar" | "tolovlar" | "tarix";
const malumotTabKalitlari: MalumotTab[] = ["malumotlar", "savdolar", "tolovlar", "tarix"];

type Props = {
  boshlangich: Xaridor | null;
  kompaniyalar: XaridorKompaniyasi[];
  savdolar?: XaridorSavdosi[];
  tolovlar?: XaridorTolovi[];
  tarix?: TarixYozuvi[];
  onYopish: () => void;
  onSaqlash: (xaridor: Xaridor) => Promise<void>;
};

export default function XaridorModal({
  boshlangich,
  kompaniyalar,
  savdolar = [],
  tolovlar = [],
  tarix = [],
  onYopish,
  onSaqlash,
}: Props) {
  const { t } = useTranslation(["xaridor_uchot", "common"]);
  const malumotTablari = malumotTabKalitlari.map((kalit) => ({ kalit, nom: t(`shared.tabs.${kalit}`) }));
  const [ism, setIsm] = useState(boshlangich?.ism ?? "");
  const [familiya, setFamiliya] = useState(boshlangich?.familiya ?? "");
  const [telefonlar, setTelefonlar] = useState<string[]>(
    boshlangich?.telefonlar.length ? boshlangich.telefonlar : [""]
  );
  const [telegram, setTelegram] = useState(boshlangich?.ijtimoiy.telegram ?? "");
  const [whatsapp, setWhatsapp] = useState(boshlangich?.ijtimoiy.whatsapp ?? "");
  const [instagram, setInstagram] = useState(boshlangich?.ijtimoiy.instagram ?? "");
  const [manzil, setManzil] = useState(boshlangich?.manzil ?? "");
  const [kompaniyaId, setKompaniyaId] = useState(boshlangich?.kompaniyaId ?? "");
  const [lavozim, setLavozim] = useState(boshlangich?.lavozim ?? "");
  const [yaratilganSana, setYaratilganSana] = useState(boshlangich?.yaratilganSana ?? bugun());
  const [xato, setXato] = useState("");
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [faolTab, setFaolTab] = useState<MalumotTab>("malumotlar");

  const xaridorSavdolari = useMemo(
    () => savdolar.filter((savdo) => savdo.xaridorId === boshlangich?.id),
    [savdolar, boshlangich?.id]
  );
  const xaridorTolovlari = useMemo(
    () => tolovlar.filter((tolov) => tolov.xaridorId === boshlangich?.id),
    [tolovlar, boshlangich?.id]
  );
  const xaridorTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => yozuv.xaridorId === boshlangich?.id)
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, boshlangich?.id]
  );

  function telefonYangilash(index: number, qiymat: string) {
    setTelefonlar((joriy) => joriy.map((telefon, i) => (i === index ? qiymat : telefon)));
  }

  function telefonQoshish() {
    setTelefonlar((joriy) => [...joriy, ""]);
  }

  function telefonOchirish(index: number) {
    setTelefonlar((joriy) => (joriy.length === 1 ? [""] : joriy.filter((_, i) => i !== index)));
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();

    const tozaTelefonlar = telefonlar.map((telefon) => telefon.trim()).filter(Boolean);

    if (!ism.trim() || !familiya.trim() || tozaTelefonlar.length === 0) {
      setXato(t("xaridorModal.requiredError"));
      return;
    }

    setSaqlanmoqda(true);
    try {
      await onSaqlash({
      id: boshlangich?.id ?? yangiId("xrd"),
      partnerId: boshlangich?.partnerId,
      ism: ism.trim(),
      familiya: familiya.trim(),
      telefonlar: tozaTelefonlar,
      ijtimoiy: {
        telegram: telegram.trim(),
        whatsapp: whatsapp.trim(),
        instagram: instagram.trim(),
      },
      manzil: manzil.trim(),
      kompaniyaId,
      lavozim: lavozim.trim(),
      balans: boshlangich?.balans ?? 0,
      yaratganMasul: boshlangich?.yaratganMasul ?? t("shared.defaultResponsible"),
      yaratilganSana,
      ozgartirilganSana: bugun(),
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
          faylNomi={`xaridor-${boshlangich?.id ?? "yangi"}`}
          malumot={boshlangich ?? { ism, familiya, telefonlar }}
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
                  <UserRound size={22} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {boshlangich ? t("xaridorModal.editTitle") : t("xaridorModal.newTitle")}
                  </h1>
                  <span className="text-xs font-black uppercase tracking-wider text-[#2563EB]">
                    {t("xaridorModal.badge")}
                  </span>
                </div>
              </div>
            </div>

            <ModalTablari
                className="mt-6"
                tablar={malumotTablari.map((tab) => ({ id: tab.kalit, nom: tab.nom }))}
                faol={faolTab}
                onChange={(id) => setFaolTab(id as typeof faolTab)}
              />
          </header>

          <div className="scrollbar-orange flex-1 overflow-y-auto">
            {faolTab === "malumotlar" && (
            <div className="px-9 py-7">
            {xato && (
              <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                {xato}
              </p>
            )}

            {/* Chapda maydonlar, o'ngda faoliyat oqimi — tafsilotlar modalkasidagidek. */}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
                  <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    {t("xaridorModal.personalInfoTitle")}
                  </h2>

                  <div className="mt-5 space-y-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">{t("xaridorModal.firstName")}</span>
                      <input
                        value={ism}
                        onChange={(event) => setIsm(event.target.value)}
                        placeholder={t("xaridorModal.firstNamePlaceholder")}
                        className={maydonKlass}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-400">{t("xaridorModal.lastName")}</span>
                      <input
                        value={familiya}
                        onChange={(event) => setFamiliya(event.target.value)}
                        placeholder={t("xaridorModal.lastNamePlaceholder")}
                        className={maydonKlass}
                      />
                    </label>

                    <div className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <Phone size={14} className="text-[#2563EB]" />
                        {t("xaridorModal.phone")}
                      </span>

                      {telefonlar.map((telefon, index) => (
                        <div key={index} className="flex gap-2">
                          <PhoneInput value={telefon} onChange={(qiymat) => telefonYangilash(index, qiymat)} className="min-w-0 flex-1" />
                          <button
                            type="button"
                            onClick={() => telefonOchirish(index)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                            aria-label={t("xaridorModal.removePhoneAria")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={telefonQoshish}
                        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3.5 text-xs font-black uppercase text-[#2563EB] transition hover:bg-orange-100"
                      >
                        <Plus size={15} />
                        {t("xaridorModal.addPhone")}
                      </button>
                    </div>

                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <MapPin size={14} className="text-[#2563EB]" />
                        {t("xaridorModal.address")}
                      </span>
                      <textarea
                        value={manzil}
                        onChange={(event) => setManzil(event.target.value)}
                        placeholder={t("xaridorModal.addressPlaceholder")}
                        className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-semibold outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-orange-100"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
                  <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                    {t("xaridorModal.workSectionTitle")}
                  </h2>

                  <div className="mt-5 space-y-4">
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
                        <Building2 size={14} className="text-[#2563EB]" />
                        {t("xaridorModal.company")}
                      </span>
                      <Tanlov
                        qiymat={kompaniyaId}
                        onChange={setKompaniyaId}
                        placeholder={t("xaridorModal.companyUnassigned")}
                        variantlar={[
                          { value: "", label: t("xaridorModal.companyUnassigned") },
                          ...kompaniyalar.map((kompaniya) => ({
                            value: kompaniya.id,
                            label: kompaniya.nomi,
                          })),
                        ]}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                        <Briefcase size={14} className="text-[#2563EB]" />
                        {t("xaridorModal.position")}
                      </span>
                      <input
                        value={lavozim}
                        onChange={(event) => setLavozim(event.target.value)}
                        placeholder={t("xaridorModal.positionPlaceholder")}
                        className={maydonKlass}
                      />
                    </label>

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

              <FaoliyatPaneli partnerId={boshlangich?.partnerId} customerId={boshlangich?.id} />
            </div>
            </div>
            )}

            {faolTab === "savdolar" && (
              <SavdolarTab
                savdolar={xaridorSavdolari}
                xaridorNomi={boshlangich ? xaridorNomi(boshlangich) : ""}
                xaridorOlish={() => boshlangich ?? undefined}
              />
            )}
            {faolTab === "tolovlar" && <TolovlarTab tolovlar={xaridorTolovlari} />}
            {faolTab === "tarix" && <TarixTab tarix={xaridorTarixi} />}
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
