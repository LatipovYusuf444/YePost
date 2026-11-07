import { useMemo, useState, type FormEvent } from "react";
import { Briefcase, Building2, CalendarDays, Hash, Phone, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import AppModal from "@/Components/common/AppModal";
import XatoliMaydon from "@/Components/common/XatoliMaydon";
import PhoneInput from "@/Components/ui/PhoneInput";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
import type { XatoMaydonQoidasi } from "@/lib/maydonXatolari";
import FaoliyatPaneli from "./FaoliyatPaneli";
import IjtimoiyTanlov from "./IjtimoiyTanlov";
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

// Server xatosi qaysi maydonga tegishli. Kalit — so'rov tanasidagi backend nomi (STIR — inn, ijtimoiy tarmoqlar — socials.*).
const KOMPANIYA_XATO_QOIDALARI: Record<string, XatoMaydonQoidasi> = {
  inn: { maydonlar: ["inn"], kodlar: ["inn"], sozlar: ["stir", "инн"] },
  phone: { maydonlar: ["phone"], kodlar: ["phone"], sozlar: ["telefon", "телефон"] },
  contactPerson: { maydonlar: ["contactPerson"], kodlar: ["contact"], sozlar: ["aloqa shaxsi", "контактн"] },
  position: { maydonlar: ["position"], kodlar: ["position"], sozlar: ["lavozim", "должност"] },
  socials: { maydonlar: ["socials", "socials.telegram", "socials.whatsapp", "socials.instagram", "socials.website"], kodlar: ["social", "telegram"], sozlar: ["telegram", "whatsapp", "instagram"] },
  name: { maydonlar: ["name"], kodlar: ["name"], sozlar: ["nomi", "названи"] },
};

type Props = {
  boshlangich: XaridorKompaniyasi | null;
  xaridorlar?: Xaridor[];
  savdolar?: XaridorSavdosi[];
  tolovlar?: XaridorTolovi[];
  tarix?: TarixYozuvi[];
  onYopish: () => void;
  onSaqlash: (kompaniya: XaridorKompaniyasi) => Promise<void>;
};

export default function KompaniyaModal({
  boshlangich,
  xaridorlar = [],
  savdolar = [],
  tolovlar = [],
  tarix = [],
  onYopish,
  onSaqlash,
}: Props) {
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
  const fx = useMaydonXatolari(KOMPANIYA_XATO_QOIDALARI);

  // Kompaniyaning savdolari/to'lovlari/tarixi — unga biriktirilgan xaridorlarники.
  const xaridorIdlar = useMemo(
    () =>
      new Set(
        xaridorlar
          .filter((xaridor) => xaridor.kompaniyaId === boshlangich?.id)
          .map((xaridor) => xaridor.id)
      ),
    [xaridorlar, boshlangich?.id]
  );

  const kompaniyaSavdolari = useMemo(
    () => savdolar.filter((savdo) => xaridorIdlar.has(savdo.xaridorId)),
    [savdolar, xaridorIdlar]
  );
  const kompaniyaTolovlari = useMemo(
    () => tolovlar.filter((tolov) => xaridorIdlar.has(tolov.xaridorId)),
    [tolovlar, xaridorIdlar]
  );
  const kompaniyaTarixi = useMemo(
    () =>
      tarix
        .filter((yozuv) => xaridorIdlar.has(yozuv.xaridorId))
        .sort((a, b) => new Date(b.sana).getTime() - new Date(a.sana).getTime()),
    [tarix, xaridorIdlar]
  );

  function savdoXaridori(savdo: XaridorSavdosi) {
    const xaridor = xaridorlar.find((item) => item.id === savdo.xaridorId);
    return xaridor ? xaridorNomi(xaridor) : "—";
  }

  async function saqlash(event: FormEvent) {
    event.preventDefault();

    if (!nomi.trim()) {
      // Xato maydon ostida ko'rinadi; tepadagi eski xabar qolmasin.
      setXato("");
      setFaolTab("malumotlar");
      fx.ornat({ name: t("kompaniyaModal.requiredError") });
      return;
    }

    setSaqlanmoqda(true);
    fx.ornat({});
    try {
      await fx.kuzat(() => onSaqlash({
      id: boshlangich?.id ?? yangiId("kmp"),
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
      }));
    } catch (error) {
      setXato(getApiErrorMessage(error));
    } finally {
      setSaqlanmoqda(false);
    }
  }

  return (
    <AppModal className="items-start justify-start bg-[rgba(15,23,42,.50)] p-0 py-4 pl-4 pr-4 md:pl-[88px] backdrop-blur-[3px]">
      <div className="relative h-[calc(100vh-32px)] w-full">
        <TezkorPanel
          havolaId={boshlangich?.id ?? "yangi"}
          faylNomi={`kompaniya-${boshlangich?.id ?? "yangi"}`}
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
                  <Building2 size={22} />
                </span>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {boshlangich ? t("kompaniyaModal.editTitle") : t("kompaniyaModal.newTitle")}
                  </h1>
                  <span className="text-xs font-black uppercase tracking-wider text-[#2563EB]">
                    {t("kompaniyaModal.badge")}
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
                {(fx.tepadagi || (fx.bor ? "" : xato)) && (
                  <p className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                    {fx.tepadagi || xato}
                  </p>
                )}

                {/* Chapda maydonlar, o'ngda faoliyat oqimi — xaridor modalidagidek. */}
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-6">
                    <section className="rounded-[26px] bg-white/92 p-6 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80">
                      <h2 className="border-b border-orange-100/80 pb-3 text-sm font-black uppercase tracking-wide text-slate-600">
                        {t("kompaniyaModal.sectionTitle")}
                      </h2>

                      <div className="mt-5 space-y-4">
                        <XatoliMaydon xato={fx.xato("name")}>
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Building2 size={14} className="text-[#2563EB]" />
                            {t("kompaniyaModal.name")}
                          </span>
                          <input
                            value={nomi}
                            onChange={(event) => { fx.tozala("name"); setNomi(event.target.value); }}
                            placeholder={t("kompaniyaModal.namePlaceholder")}
                            className={maydonKlass}
                          />
                        </label>
                        </XatoliMaydon>

                        <XatoliMaydon xato={fx.xato("inn")}>
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Hash size={14} className="text-[#2563EB]" />
                            {t("kompaniyaModal.stir")}
                          </span>
                          <input
                            value={stir}
                            onChange={(event) => { fx.tozala("inn"); setStir(event.target.value); }}
                            placeholder={t("kompaniyaModal.stirPlaceholder")}
                            className={maydonKlass}
                          />
                        </label>
                        </XatoliMaydon>

                        <XatoliMaydon xato={fx.xato("phone")}>
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#2563EB]" />
                            {t("kompaniyaModal.phone")}
                          </span>
                          <PhoneInput value={telefon} onChange={(qiymat) => { fx.tozala("phone"); setTelefon(qiymat); }} invalid={Boolean(fx.xato("phone"))} />
                        </label>
                        </XatoliMaydon>

                        <XatoliMaydon xato={fx.xato("contactPerson")}>
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <UserRound size={14} className="text-[#2563EB]" />
                            {t("kompaniyaModal.contactPerson")}
                          </span>
                          <input
                            value={aloqaShaxsi}
                            onChange={(event) => { fx.tozala("contactPerson"); setAloqaShaxsi(event.target.value); }}
                            placeholder={t("kompaniyaModal.contactPersonPlaceholder")}
                            className={maydonKlass}
                          />
                        </label>
                        </XatoliMaydon>

                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Phone size={14} className="text-[#2563EB]" />
                            {t("kompaniyaModal.contactPhone")}
                          </span>
                          <PhoneInput value={aloqaTelefoni} onChange={setAloqaTelefoni} />
                        </label>

                        <XatoliMaydon xato={fx.xato("position")}>
                        <label className="grid gap-2">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-400">
                            <Briefcase size={14} className="text-[#2563EB]" />
                            {t("kompaniyaModal.position")}
                          </span>
                          <input
                            value={lavozim}
                            onChange={(event) => { fx.tozala("position"); setLavozim(event.target.value); }}
                            placeholder={t("kompaniyaModal.positionPlaceholder")}
                            className={maydonKlass}
                          />
                        </label>
                        </XatoliMaydon>

                        <XatoliMaydon xato={fx.xato("socials")}>
                        <IjtimoiyTanlov
                          qiymatlar={{ telegram, whatsapp, instagram }}
                          onChange={(tarmoq, qiymat) => {
                            fx.tozala("socials");
                            if (tarmoq === "telegram") setTelegram(qiymat);
                            else if (tarmoq === "whatsapp") setWhatsapp(qiymat);
                            else setInstagram(qiymat);
                          }}
                        />
                        </XatoliMaydon>

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

            {faolTab === "savdolar" && (
              <SavdolarTab
                savdolar={kompaniyaSavdolari}
                xaridorNomiOlish={savdoXaridori}
                xaridorOlish={(savdo) =>
                  xaridorlar.find((xaridor) => xaridor.id === savdo.xaridorId)
                }
              />
            )}
            {faolTab === "tolovlar" && <TolovlarTab tolovlar={kompaniyaTolovlari} />}
            {faolTab === "tarix" && <TarixTab tarix={kompaniyaTarixi} />}
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
