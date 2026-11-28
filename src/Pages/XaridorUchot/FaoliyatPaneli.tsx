import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Ban,
  Bell,
  CalendarClock,
  CircleCheck,
  ClipboardCheck,
  Link2,
  LoaderCircle,
  MessageSquare,
  PenLine,
  Receipt,
  Send,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { xodimNomi as umumiyXodimNomi } from "@/lib/mijozMasuli";
import AppSelect from "@/Components/ui/AppSelect";
import { xabarMuallifi } from "@/lib/savdoAgenti";
import { crmApi, royxatniAjratish } from "@/api/crmApi";
import { xodimlarRoyxatiniOlish } from "@/api/savdoApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { kunniSurish, vaqtMatni } from "@/lib/hujjatSanasi";
import { isoniAjratish, toshkentHozir, toshkentIso } from "@/lib/crmNatija";
import { foydalanuvchiAdminmi } from "@/lib/roles";
import { useAuthProfileStore } from "@/store/authProfileStore";
import type { Activity, ChatMessage, Comment, Contact, ContactTuri, CrmUser } from "@/types/crm";
import { CONTACT_TURI_IKONKALARI, CRM_MATN_MAYDONI, CRM_YORLIQ, natijaBelgisi, vazifaIkonkasi } from "./crm/crmBelgilar";
import KeyingiQadamFormasi from "./crm/KeyingiQadamFormasi";
import NatijaFormasi from "./crm/NatijaFormasi";
import { useNatijaFormasi, type NatijaSotuvi, type NatijaXodimi } from "./crm/useNatijaFormasi";
import VazifaBekorOynasi from "./crm/VazifaBekorOynasi";
import VazifaYakunlashOynasi from "./crm/VazifaYakunlashOynasi";
import { TelegramIkonka } from "./IjtimoiyIkonkalar";

// Tafsilotlar modalkalarining o'ng ustunidagi real CRM faoliyat oqimi:
// qo'ng'iroq/uchrashuv/xabar natija bilan (POST /crm/contacts), izoh, vazifa, Telegram xabari; rejadagi vazifalar va tarix.

export type FaoliyatTuri = "ish" | "izoh" | "xabar" | "vazifa" | "tolov" | "ozgarish";

export type FaoliyatYozuvi = {
  id: string;
  turi: FaoliyatTuri;
  sarlavha: string;
  matn: string;
  sana: string; // ISO — rejalashtirilgan muddat yoki qo'shilgan vaqt
};

type YozishTabi = ContactTuri | "izoh" | "vazifa" | "telegram";
const YOZISH_TABLARI: YozishTabi[] = ["CALL", "MEETING", "MESSAGE", "izoh", "vazifa", "telegram"];
const CONTACT_TABI = (tab: YozishTabi): tab is ContactTuri => tab === "CALL" || tab === "MEETING" || tab === "MESSAGE";
// Izoh va chat 100 tagacha olinadi — faoliyatlar ham shuncha: aralash lentada eski qo'ng'iroqlar "yo'qolgandek" ko'rinmasin.
const CONTACT_SAHIFASI = 100;

type Props = {
  boshlangichYozuvlar?: FaoliyatYozuvi[];
  customerId?: string;
  partnerId?: string;
  /** Shu mijozning sotuvlari ("Zakaz olindi" ga bog'lash uchun); berilmasa sotuv tanlovi ko'rinmaydi. */
  sotuvlar?: NatijaSotuvi[];
};

type OqimElementi =
  | { tur: "oddiy"; id: string; sana: string; yozuv: FaoliyatYozuvi }
  | { tur: "contact"; id: string; sana: string; contact: Contact }
  | { tur: "vazifa"; id: string; sana: string; vazifa: Activity };

const BOSH_YOZUVLAR: FaoliyatYozuvi[] = [];
const BOSH_SOTUVLAR: NatijaSotuvi[] = [];

function vaqtMs(iso?: string | null) {
  const ms = iso ? new Date(iso).getTime() : NaN;
  return Number.isNaN(ms) ? 0 : ms;
}

function odamNomi(user?: CrmUser | null) {
  // Xodimlar ro'yxati ism-familiyani alohida beradi (firstName/lastName) — umumiy yordamchi.
  return umumiyXodimNomi(user as Parameters<typeof umumiyXodimNomi>[0]);
}

// Ochiq vazifa muddati o'tganmi: backend `overdue`, bo'lmasa muddat bo'yicha.
function muddatiOtganmi(vazifa: Activity) {
  if (typeof vazifa.overdue === "boolean") return vazifa.overdue;
  return Boolean(vazifa.dueAt) && vaqtMs(vazifa.dueAt) < Date.now();
}

export default function FaoliyatPaneli({ boshlangichYozuvlar = BOSH_YOZUVLAR, partnerId, sotuvlar = BOSH_SOTUVLAR }: Props) {
  const { t } = useTranslation(["xaridor_uchot", "crm", "common"]);
  const profil = useAuthProfileStore((state) => state.profil);

  const commentYozuvi = useCallback((item: Comment): FaoliyatYozuvi => {
    return { id: item.id, turi: "izoh", sarlavha: t("faoliyatPaneli.commentSubject"), matn: item.text || "", sana: item.createdAt || new Date().toISOString() };
  }, [t]);

  // Kim yozgan — backend `author` (mijoz, xodim, do'kon akkaunti Telegram ilovasidan, savdo agenti, buyurtma haqidagi tayyor xabar);
  // eski xabarlarda direction/sentById bo'yicha.
  const chatYozuvi = useCallback((item: ChatMessage, index: number): FaoliyatYozuvi => {
    const muallif = xabarMuallifi(item);
    const sarlavha =
      muallif === "mijoz"
        ? t("faoliyatPaneli.chatFromCustomer")
        : muallif === "akkaunt"
          ? t("faoliyatPaneli.chatFromAccount")
          : muallif === "agent"
            ? t("faoliyatPaneli.chatFromAgent")
            : muallif === "shablon"
              ? t("faoliyatPaneli.chatTemplate")
              : t("faoliyatPaneli.chatSent");
    return { id: item.id || `chat-${item.createdAt || index}`, turi: "xabar", sarlavha, matn: item.text || "", sana: item.createdAt || new Date().toISOString() };
  }, [t]);

  // "Bugun, 10:00" / "Ertaga, 10:00" / "Kecha, 10:00" / "21.11.2026 10:00" (Toshkent).
  const vaqtYorligi = useCallback((iso?: string | null) => {
    const { kun, vaqt } = isoniAjratish(iso);
    if (!kun) return "";
    const bugungi = toshkentHozir().kun;
    if (kun === bugungi) return t("crm:faoliyat.bugun", { time: vaqt });
    if (kun === kunniSurish(bugungi, 1)) return t("crm:faoliyat.ertaga", { time: vaqt });
    if (kun === kunniSurish(bugungi, -1)) return t("crm:faoliyat.kecha", { time: vaqt });
    return vaqtMatni(iso);
  }, [t]);

  const [faoliyatTab, setFaoliyatTab] = useState<YozishTabi>("CALL");
  const [ochiq, setOchiq] = useState(false);
  const [matn, setMatn] = useState("");
  const [vazifalar, setVazifalar] = useState<Activity[]>([]);
  const [contactlar, setContactlar] = useState<Contact[]>([]);
  const [contactKursori, setContactKursori] = useState<string | null>(null);
  const [boshqaYozuvlar, setBoshqaYozuvlar] = useState<FaoliyatYozuvi[]>(boshlangichYozuvlar);
  const [xodimlar, setXodimlar] = useState<NatijaXodimi[]>([]);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [yanaYuklanmoqda, setYanaYuklanmoqda] = useState(false);
  const [saqlanmoqda, setSaqlanmoqda] = useState(false);
  const [xatolik, setXatolik] = useState("");
  const [yakunlanadigan, setYakunlanadigan] = useState<Activity | null>(null);
  const [bekorQilinadigan, setBekorQilinadigan] = useState<Activity | null>(null);
  const sorovRaqami = useRef(0);

  // Qo'ng'iroq/uchrashuv/xabar natijasi; vazifa formasi — "keyingi qadam" bilan bir xil (yashirin LATER — faqat tekshiruv uchun, yuborilmaydi).
  const natija = useNatijaFormasi();
  const vazifaForma = useNatijaFormasi({ result: "LATER", keyingi: { type: "TASK", subject: "" } });

  // Mas'ul tanlovi: /accounts/users ruxsati bo'lmasa (kassir) bo'sh — tanlov yashiriladi, backend standarti ishlaydi.
  useEffect(() => {
    if (!partnerId) return;
    let faol = true;
    void xodimlarRoyxatiniOlish()
      .then((items) => {
        if (!faol) return;
        setXodimlar(items.map((x) => ({ id: x.id, nom: umumiyXodimNomi(x as Parameters<typeof umumiyXodimNomi>[0]) || x.id })).filter((x) => x.id));
      })
      .catch(() => undefined);
    return () => { faol = false; };
  }, [partnerId]);

  const yuklash = useCallback(async () => {
    const raqam = ++sorovRaqami.current;
    if (!partnerId) {
      setVazifalar([]); setContactlar([]); setContactKursori(null); setBoshqaYozuvlar(boshlangichYozuvlar);
      return;
    }
    setYuklanmoqda(true); setXatolik("");
    try {
      const [activities, comments, chat, contactSahifa] = await Promise.all([
        crmApi.activities({ partnerId }),
        crmApi.partnerComments(partnerId, { limit: 100 }),
        crmApi.partnerChatTarixi(partnerId, { limit: 100 }),
        // Yangi endpoint: xato bo'lsa oqim faoliyatlarsiz ishlayveradi.
        crmApi.contactlar(partnerId, { limit: CONTACT_SAHIFASI }).catch(() => ({ items: [] as Contact[], nextCursor: null })),
      ]);
      if (raqam !== sorovRaqami.current) return;
      setVazifalar(activities);
      setContactlar(contactSahifa.items);
      setContactKursori(contactSahifa.nextCursor);
      setBoshqaYozuvlar([
        ...royxatniAjratish(comments).map(commentYozuvi),
        ...royxatniAjratish(chat).map(chatYozuvi),
        ...boshlangichYozuvlar,
      ]);
    } catch (error) {
      if (raqam === sorovRaqami.current) setXatolik(getApiErrorMessage(error));
    } finally {
      if (raqam === sorovRaqami.current) setYuklanmoqda(false);
    }
  }, [boshlangichYozuvlar, chatYozuvi, commentYozuvi, partnerId]);

  useEffect(() => { void yuklash(); }, [yuklash]);

  async function yanaContactlar() {
    if (!partnerId || !contactKursori || yanaYuklanmoqda) return;
    // Shu orada to'liq qayta yuklash (yoki boshqa mijoz) bo'lsa, eski sahifa qo'shilmaydi.
    const raqam = sorovRaqami.current;
    setYanaYuklanmoqda(true);
    try {
      const sahifa = await crmApi.contactlar(partnerId, { cursor: contactKursori, limit: CONTACT_SAHIFASI });
      if (raqam !== sorovRaqami.current) return;
      setContactlar((joriy) => {
        const bor = new Set(joriy.map((c) => c.id));
        return [...joriy, ...sahifa.items.filter((c) => !bor.has(c.id))];
      });
      setContactKursori(sahifa.nextCursor);
    } catch (error) {
      if (raqam === sorovRaqami.current) setXatolik(getApiErrorMessage(error));
    } finally {
      setYanaYuklanmoqda(false);
    }
  }

  // Ochiq vazifalar tepada (eng yaqin muddat birinchi), qolgan hammasi — vaqt bo'yicha yangisi birinchi.
  const ochiqVazifalar = useMemo(
    () => vazifalar.filter((v) => v.status === "PENDING").sort((a, b) => vaqtMs(a.dueAt) - vaqtMs(b.dueAt)),
    [vazifalar]
  );
  const oqim = useMemo<OqimElementi[]>(() => {
    const elementlar: OqimElementi[] = [
      ...vazifalar.filter((v) => v.status !== "PENDING").map((v): OqimElementi => ({ tur: "vazifa", id: `a-${v.id}`, sana: v.dueAt || v.createdAt || "", vazifa: v })),
      ...contactlar.map((c): OqimElementi => ({ tur: "contact", id: `c-${c.id}`, sana: c.createdAt || "", contact: c })),
      ...boshqaYozuvlar.map((y): OqimElementi => ({ tur: "oddiy", id: `o-${y.turi}-${y.id}`, sana: y.sana, yozuv: y })),
    ];
    return elementlar.sort((a, b) => vaqtMs(b.sana) - vaqtMs(a.sana));
  }, [boshqaYozuvlar, contactlar, vazifalar]);

  const sotuvRaqamlari = useMemo(() => new Map(sotuvlar.map((s) => [s.id, s.docNumber || ""])), [sotuvlar]);
  const masulTanlashMumkin = xodimlar.length > 0;

  function yopish() {
    setMatn("");
    natija.tozala();
    vazifaForma.tozala();
    setOchiq(false);
  }

  async function saqlash() {
    if (saqlanmoqda) return;
    if (!partnerId) { setXatolik(t("faoliyatPaneli.errors.noPartnerId")); return; }
    const tab = faoliyatTab;
    if (CONTACT_TABI(tab)) {
      if (!natija.tekshir()) return;
      setSaqlanmoqda(true);
      try {
        const javob = await crmApi.contactYozish(natija.contactTanasi(partnerId));
        const keyingi = javob.nextTask;
        toast.success(t("crm:faoliyat.contactSaqlandi"), {
          description: keyingi ? t("crm:faoliyat.keyingiVazifa", { subject: keyingi.subject ?? "", due: vaqtYorligi(keyingi.dueAt) }) : undefined,
        });
        yopish();
        await yuklash();
      } catch (error) {
        // Matn global toastda; tegishli maydon qizil bo'ladi.
        natija.serverXatosi(error);
      } finally {
        setSaqlanmoqda(false);
      }
      return;
    }
    if (tab === "vazifa") {
      if (!vazifaForma.tekshir()) return;
      const k = vazifaForma.forma.keyingi;
      setSaqlanmoqda(true); setXatolik("");
      try {
        await crmApi.activityYaratish({
          type: k.type,
          partnerId,
          subject: k.subject.trim(),
          description: k.description.trim() || undefined,
          dueAt: toshkentIso(k.kun, k.vaqt),
          // Tanlanmasa backend o'zi: mijoz mas'uli, bo'lmasa joriy xodim.
          ...(k.assigneeId ? { assigneeId: k.assigneeId } : {}),
          ...(k.saleId ? { saleId: k.saleId } : {}),
        });
        yopish();
        await yuklash();
      } catch (error) { setXatolik(getApiErrorMessage(error)); }
      finally { setSaqlanmoqda(false); }
      return;
    }
    const toza = matn.trim();
    if (!toza) return;
    setSaqlanmoqda(true); setXatolik("");
    try {
      if (tab === "izoh") await crmApi.partnerCommentYaratish(partnerId, { text: toza });
      else await crmApi.partnerChatXabarYuborish(partnerId, toza);
      yopish();
      await yuklash();
    } catch (error) { setXatolik(getApiErrorMessage(error)); }
    finally { setSaqlanmoqda(false); }
  }

  const matnliTab = faoliyatTab === "izoh" || faoliyatTab === "telegram";
  const saqlashMatni = saqlanmoqda
    ? t("crm:faoliyat.saqlanmoqda")
    : faoliyatTab === "telegram"
      ? t("crm:faoliyat.yuborish")
      : faoliyatTab === "vazifa"
        ? t("crm:faoliyat.vazifaQoshish")
        : t("crm:faoliyat.saqlash");

  return (
    <div className="space-y-5">
      {xatolik && <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-600">{xatolik}</div>}
      <section className="overflow-hidden rounded-[22px] bg-white/92 p-4 shadow-[0_18px_46px_rgba(37,99,235,.08)] ring-1 ring-orange-100/80 backdrop-blur">
        <nav className="mb-4 flex flex-wrap items-center gap-1 rounded-2xl bg-slate-50 p-1.5 text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
          {YOZISH_TABLARI.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setFaoliyatTab(tab);
                setOchiq(true);
              }}
              aria-pressed={faoliyatTab === tab && ochiq}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${
                faoliyatTab === tab && ochiq
                  ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-orange-100"
                  : "hover:bg-white/70 hover:text-[#2563EB]"
              }`}
            >
              <TabIkonka tab={tab} />
              {t(`crm:faoliyat.tablar.${tab}`)}
            </button>
          ))}
        </nav>

        {!ochiq ? (
          <button
            type="button"
            onClick={() => setOchiq(true)}
            className="flex h-14 w-full items-center gap-3 rounded-xl border border-orange-100 bg-[#F8FAFC]/60 px-5 text-left text-slate-400 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm"
          >
            <PenLine size={18} className="shrink-0 text-slate-300" />
            <span>{t(`crm:faoliyat.yigiq.${faoliyatTab}`)}</span>
          </button>
        ) : (
          <form
            className="animate-in slide-in-from-top-2 fade-in-0 duration-300"
            onSubmit={(e) => {
              e.preventDefault();
              // Bu forma xaridor/kompaniya/yetkazib beruvchi tahrir formasi ichida (yoki portal orqali) turadi: submit tashqi formaga chiqmasin.
              e.stopPropagation();
              void saqlash();
            }}
          >
            <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-[#F8FAFC] p-4">
              {CONTACT_TABI(faoliyatTab) && (
                <NatijaFormasi
                  natija={natija}
                  qatiyTur={faoliyatTab}
                  sotuvlar={sotuvlar}
                  xodimlar={xodimlar}
                  masulTanlashMumkin={masulTanlashMumkin}
                  disabled={saqlanmoqda}
                />
              )}
              {faoliyatTab === "vazifa" && (
                <div className="space-y-3.5">
                  <KeyingiQadamFormasi natija={vazifaForma} xodimlar={xodimlar} masulTanlashMumkin={masulTanlashMumkin} disabled={saqlanmoqda} />
                  {sotuvlar.length > 0 && (
                    <div>
                      <span className={CRM_YORLIQ}>{t("crm:faoliyat.vazifaSotuv")}</span>
                      <AppSelect
                        value={vazifaForma.forma.keyingi.saleId}
                        disabled={saqlanmoqda}
                        aria-label={t("crm:faoliyat.vazifaSotuv")}
                        onChange={(e) => vazifaForma.keyinginiOzgartir({ saleId: e.target.value })}
                        className="h-11 rounded-xl text-sm font-semibold text-slate-800"
                      >
                        <option value="">{t("crm:faoliyat.sotuvYoq")}</option>
                        {sotuvlar.map((s) => (
                          <option key={s.id} value={s.id}>{sotuvTanlovMatni(s)}</option>
                        ))}
                      </AppSelect>
                    </div>
                  )}
                </div>
              )}
              {matnliTab && (
                <>
                  <textarea
                    value={matn}
                    onChange={(event) => setMatn(event.target.value)}
                    rows={3}
                    autoFocus
                    disabled={saqlanmoqda}
                    maxLength={4000}
                    aria-label={t(`crm:faoliyat.tablar.${faoliyatTab}`)}
                    placeholder={faoliyatTab === "izoh" ? t("crm:faoliyat.izohPlaceholder") : t("crm:faoliyat.telegramPlaceholder")}
                    className={CRM_MATN_MAYDONI}
                  />
                  {faoliyatTab === "telegram" && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <TelegramIkonka size={13} />
                      {t("crm:faoliyat.telegramIzoh")}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saqlanmoqda || !partnerId || (matnliTab && !matn.trim())}
                className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-5 py-2 text-xs font-bold uppercase text-white transition hover:-translate-y-0.5 hover:bg-[#1D4ED8] hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {saqlanmoqda && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
                {saqlashMatni}
              </button>
              <button
                type="button"
                onClick={yopish}
                disabled={saqlanmoqda}
                className="text-xs font-bold uppercase text-slate-600 transition hover:text-slate-900 disabled:opacity-60"
              >
                {t("crm:faoliyat.bekor")}
              </button>
            </div>
          </form>
        )}
      </section>

      {ochiqVazifalar.length > 0 && (
        <section className="space-y-2" aria-label={t("crm:faoliyat.rejadagi")}>
          <h3 className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wide text-slate-500">
            <CalendarClock size={14} className="text-[#2563EB]" aria-hidden />
            {t("crm:faoliyat.rejadagi")}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{ochiqVazifalar.length}</span>
          </h3>
          {ochiqVazifalar.map((vazifa) => (
            <OchiqVazifaKartasi
              key={vazifa.id}
              vazifa={vazifa}
              vaqtYorligi={vaqtYorligi}
              sotuvRaqami={vazifa.sale?.docNumber || (vazifa.saleId ? sotuvRaqamlari.get(vazifa.saleId) : "") || ""}
              onBajarildi={() => setYakunlanadigan(vazifa)}
              onBekor={() => setBekorQilinadigan(vazifa)}
            />
          ))}
        </section>
      )}

      <div className="flex justify-center">
        <span className="rounded-full bg-orange-50 px-5 py-1.5 text-sm font-bold text-[#2563EB]">
          {t("faoliyatPaneli.sectionBadge")}
        </span>
      </div>

      <div className="space-y-3">
        {yuklanmoqda && <p className="rounded-[22px] bg-white/70 p-6 text-center text-sm font-semibold text-slate-400">{t("faoliyatPaneli.loading")}</p>}
        {oqim.map((element) => {
          if (element.tur === "contact") {
            return (
              <ContactKartasi
                key={element.id}
                contact={element.contact}
                vaqtYorligi={vaqtYorligi}
                sotuvlar={sotuvlar}
                sotuvRaqamlari={sotuvRaqamlari}
                boglashMumkin={(() => {
                  if (!profil || foydalanuvchiAdminmi(profil)) return true;
                  const c = element.contact;
                  const muallifIdlari = [c.createdById, c.author?.id, c.createdBy?.id].filter(Boolean);
                  return muallifIdlari.length === 0 || muallifIdlari.includes(profil.id);
                })()}
                onBoglandi={() => void yuklash()}
              />
            );
          }
          if (element.tur === "vazifa") {
            return <YopiqVazifaKartasi key={element.id} vazifa={element.vazifa} vaqtYorligi={vaqtYorligi} />;
          }
          const yozuv = element.yozuv;
          return (
            <OqimKartasi key={element.id} ikonka={<FaoliyatIkonka turi={yozuv.turi} />} sarlavha={yozuv.sarlavha} vaqt={vaqtYorligi(yozuv.sana)}>
              {yozuv.matn && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{yozuv.matn}</p>}
            </OqimKartasi>
          );
        })}

        {contactKursori && !yuklanmoqda && (
          <button
            type="button"
            onClick={() => void yanaContactlar()}
            disabled={yanaYuklanmoqda}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 transition hover:border-[#2563EB] hover:bg-blue-50/60 hover:text-[#2563EB] disabled:opacity-60"
          >
            {yanaYuklanmoqda && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
            {yanaYuklanmoqda ? t("crm:faoliyat.yuklanmoqda") : t("crm:faoliyat.yana")}
          </button>
        )}

        {!yuklanmoqda && oqim.length === 0 && ochiqVazifalar.length === 0 && (
          <p className="rounded-[22px] border border-dashed border-orange-200 bg-white/60 p-10 text-center text-sm font-semibold text-slate-400">
            {t("faoliyatPaneli.empty")}
          </p>
        )}
      </div>

      {yakunlanadigan && (
        <VazifaYakunlashOynasi
          vazifa={yakunlanadigan}
          xodimlar={xodimlar}
          masulTanlashMumkin={masulTanlashMumkin}
          sotuvlar={sotuvlar}
          onYopish={() => setYakunlanadigan(null)}
          onBajarildi={() => {
            const id = yakunlanadigan.id;
            setYakunlanadigan((joriy) => (joriy?.id === id ? null : joriy));
            void yuklash();
          }}
          onEskirdi={() => {
            const id = yakunlanadigan.id;
            setYakunlanadigan((joriy) => (joriy?.id === id ? null : joriy));
            void yuklash();
          }}
        />
      )}
      {bekorQilinadigan && (
        <VazifaBekorOynasi
          vazifa={bekorQilinadigan}
          onYopish={() => setBekorQilinadigan(null)}
          onBekorQilindi={() => {
            const id = bekorQilinadigan.id;
            setBekorQilinadigan((joriy) => (joriy?.id === id ? null : joriy));
            void yuklash();
          }}
          onEskirdi={() => {
            const id = bekorQilinadigan.id;
            setBekorQilinadigan((joriy) => (joriy?.id === id ? null : joriy));
            void yuklash();
          }}
        />
      )}
    </div>
  );
}

function sotuvTanlovMatni(sotuv: NatijaSotuvi) {
  return [sotuv.docNumber || `#${sotuv.id.slice(0, 8)}`, sotuv.jamiMatni].filter(Boolean).join(" · ");
}

// Oqimdagi umumiy karta: ikonka, sarlavha, nishonlar, vaqt va tana.
function OqimKartasi({
  ikonka,
  ikonkaRangi = "bg-orange-50 text-[#2563EB] ring-orange-100",
  sarlavha,
  nishonlar,
  vaqt,
  children,
}: {
  ikonka: ReactNode;
  ikonkaRangi?: string;
  sarlavha: ReactNode;
  nishonlar?: ReactNode;
  vaqt?: string;
  children?: ReactNode;
}) {
  return (
    <article className="rounded-[20px] border border-orange-100/80 bg-white/92 p-4 shadow-[0_14px_38px_rgba(37,99,235,.06)] transition duration-300 hover:shadow-[0_20px_50px_rgba(37,99,235,.10)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${ikonkaRangi}`}>{ikonka}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-black text-slate-800">{sarlavha}</h3>
            {nishonlar}
            {vaqt && <span className="ml-auto shrink-0 text-xs font-bold text-slate-400">{vaqt}</span>}
          </div>
          {children}
        </div>
      </div>
    </article>
  );
}

function Nishon({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${className}`}>{children}</span>;
}

function ContactKartasi({
  contact,
  vaqtYorligi,
  sotuvlar,
  sotuvRaqamlari,
  boglashMumkin,
  onBoglandi,
}: {
  contact: Contact;
  vaqtYorligi: (iso?: string | null) => string;
  sotuvlar: NatijaSotuvi[];
  sotuvRaqamlari: Map<string, string>;
  boglashMumkin: boolean;
  onBoglandi: () => void;
}) {
  const { t } = useTranslation("crm");
  const [boglashOchiq, setBoglashOchiq] = useState(false);
  const [tanlangan, setTanlangan] = useState("");
  const [jarayon, setJarayon] = useState(false);
  const tur = (contact.type === "MEETING" || contact.type === "MESSAGE" ? contact.type : "CALL") as ContactTuri;
  const Ikonka = CONTACT_TURI_IKONKALARI[tur];
  const belgi = natijaBelgisi(contact.result);
  const NatijaIkonka = belgi?.ikonka;
  const muallif = odamNomi(contact.author) || odamNomi(contact.createdBy);
  const sotuvRaqami = contact.saleId
    ? contact.sale?.docNumber || sotuvRaqamlari.get(contact.saleId) || `#${contact.saleId.slice(0, 8)}`
    : "";
  const boglashKorinadi = contact.result === "ORDER" && !contact.saleId && boglashMumkin && sotuvlar.length > 0;

  async function boglash() {
    if (!tanlangan || jarayon) return;
    setJarayon(true);
    try {
      await crmApi.contactSotuviniBoglash(contact.id, tanlangan);
      setBoglashOchiq(false);
      onBoglandi();
    } catch {
      // Matn global toastda.
    } finally {
      setJarayon(false);
    }
  }

  return (
    <OqimKartasi
      ikonka={<Ikonka size={15} aria-hidden />}
      ikonkaRangi={belgi ? belgi.nishon : undefined}
      sarlavha={t(`turlar.${tur}`)}
      vaqt={vaqtYorligi(contact.createdAt)}
      nishonlar={
        <>
          {belgi && NatijaIkonka && (
            <Nishon className={belgi.nishon}>
              <NatijaIkonka size={12} aria-hidden />
              {t(`natijalar.${contact.result}`)}
            </Nishon>
          )}
          {contact.result === "REJECTED" && contact.rejectReason && (
            <Nishon className="bg-white text-rose-700 ring-rose-200">{t(`sabablar.${contact.rejectReason}`, { defaultValue: String(contact.rejectReason) })}</Nishon>
          )}
        </>
      }
    >
      {contact.text && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{contact.text}</p>}
      {(muallif || sotuvRaqami || boglashKorinadi) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
          {muallif && (
            <span className="inline-flex items-center gap-1">
              <UserRound size={13} className="text-slate-400" aria-hidden />
              {muallif}
            </span>
          )}
          {sotuvRaqami && (
            <Nishon className="bg-emerald-50 text-emerald-700 ring-emerald-200">
              <Receipt size={12} aria-hidden />
              {sotuvRaqami}
            </Nishon>
          )}
          {boglashKorinadi && !boglashOchiq && (
            <button
              type="button"
              onClick={() => setBoglashOchiq(true)}
              className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-bold text-[#2563EB] ring-1 ring-blue-200 transition hover:bg-blue-50"
            >
              <Link2 size={13} aria-hidden />
              {t("faoliyat.sotuvniBoglash")}
            </button>
          )}
        </div>
      )}
      {boglashKorinadi && boglashOchiq && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-100">
          <AppSelect
            value={tanlangan}
            disabled={jarayon}
            aria-label={t("faoliyat.sotuvTanlang")}
            onChange={(e) => setTanlangan(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg text-sm font-semibold text-slate-800"
          >
            <option value="">{t("faoliyat.sotuvTanlang")}</option>
            {sotuvlar.map((s) => (
              <option key={s.id} value={s.id}>{sotuvTanlovMatni(s)}</option>
            ))}
          </AppSelect>
          <button
            type="button"
            onClick={() => void boglash()}
            disabled={!tanlangan || jarayon}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-black text-white transition hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {jarayon ? <LoaderCircle size={13} className="animate-spin" aria-hidden /> : <Link2 size={13} aria-hidden />}
            {t("faoliyat.boglash")}
          </button>
          <button
            type="button"
            onClick={() => setBoglashOchiq(false)}
            disabled={jarayon}
            aria-label={t("faoliyat.yopish")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700"
          >
            <X size={15} aria-hidden />
          </button>
        </div>
      )}
    </OqimKartasi>
  );
}

function OchiqVazifaKartasi({
  vazifa,
  vaqtYorligi,
  sotuvRaqami,
  onBajarildi,
  onBekor,
}: {
  vazifa: Activity;
  vaqtYorligi: (iso?: string | null) => string;
  sotuvRaqami: string;
  onBajarildi: () => void;
  onBekor: () => void;
}) {
  const { t } = useTranslation("crm");
  const otgan = muddatiOtganmi(vazifa);
  const Ikonka = vazifaIkonkasi(vazifa.type);
  const masul = odamNomi(vazifa.assignee);
  const muddat = vaqtYorligi(vazifa.dueAt);
  return (
    <article
      className={`rounded-[18px] border bg-white/95 p-3.5 shadow-[0_10px_30px_rgba(37,99,235,.06)] ${
        otgan ? "border-rose-200 ring-1 ring-rose-100" : "border-orange-100/80"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${
            otgan ? "bg-rose-50 text-rose-600 ring-rose-200" : "bg-blue-50 text-[#2563EB] ring-blue-100"
          }`}
        >
          <Ikonka size={15} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-black leading-5 text-slate-800">
            {vazifa.subject || t(`vazifaTurlari.${vazifa.type ?? "TASK"}`, { defaultValue: t("vazifaTurlari.TASK") })}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
            {muddat && (
              <Nishon className={otgan ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-50 text-slate-600 ring-slate-200"}>
                <CalendarClock size={12} aria-hidden />
                {muddat}
                {otgan && <span>· {t("faoliyat.muddatiOtgan")}</span>}
              </Nishon>
            )}
            {masul && (
              <span className="inline-flex items-center gap-1">
                <UserRound size={13} className="text-slate-400" aria-hidden />
                {masul}
              </span>
            )}
            {sotuvRaqami && (
              <Nishon className="bg-white text-slate-600 ring-slate-200">
                <Receipt size={12} aria-hidden />
                {sotuvRaqami}
              </Nishon>
            )}
          </div>
          {vazifa.description && <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-5 text-slate-600">{vazifa.description}</p>}
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onBajarildi}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-black text-white shadow-[0_6px_16px_rgba(16,185,129,.25)] transition hover:bg-emerald-600"
            >
              <CircleCheck size={14} aria-hidden />
              {t("faoliyat.bajarildi")}
            </button>
            <button
              type="button"
              onClick={onBekor}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-slate-500 ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200"
            >
              <Ban size={14} aria-hidden />
              {t("faoliyat.bekorQilish")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// Bajarilgan/bekor qilingan (yoki holati noma'lum eski) vazifa.
function YopiqVazifaKartasi({ vazifa, vaqtYorligi }: { vazifa: Activity; vaqtYorligi: (iso?: string | null) => string }) {
  const { t } = useTranslation(["crm", "xaridor_uchot"]);
  const Ikonka = vazifaIkonkasi(vazifa.type);
  const holat = vazifa.status === "DONE" || vazifa.status === "CANCELLED" ? vazifa.status : "";
  const matn = vazifa.description || "";
  return (
    <OqimKartasi
      ikonka={<Ikonka size={15} aria-hidden />}
      ikonkaRangi={holat === "CANCELLED" ? "bg-slate-50 text-slate-400 ring-slate-200" : undefined}
      sarlavha={vazifa.subject || t("xaridor_uchot:faoliyatPaneli.defaultActivitySubject")}
      vaqt={vaqtYorligi(vazifa.dueAt || vazifa.createdAt)}
      nishonlar={
        holat ? (
          <Nishon className={holat === "DONE" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}>
            {holat === "DONE" ? <CircleCheck size={12} aria-hidden /> : <Ban size={12} aria-hidden />}
            {t(`crm:faoliyat.holat.${holat}`)}
          </Nishon>
        ) : undefined
      }
    >
      {matn && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{matn}</p>}
      {vazifa.result && (
        <p className={`${matn ? "mt-1" : "mt-2"} break-words text-sm leading-6 text-slate-600`}>
          {matn ? t("crm:faoliyat.natijaMatni", { result: vazifa.result }) : vazifa.result}
        </p>
      )}
      {holat === "CANCELLED" && vazifa.cancelReason && (
        <p className="mt-1.5 break-words text-xs font-semibold text-rose-600">{t("crm:faoliyat.bekorSababi", { reason: vazifa.cancelReason })}</p>
      )}
    </OqimKartasi>
  );
}

function TabIkonka({ tab }: { tab: YozishTabi }) {
  if (CONTACT_TABI(tab)) {
    const Ikonka = CONTACT_TURI_IKONKALARI[tab];
    return <Ikonka size={16} aria-hidden />;
  }
  if (tab === "izoh") return <MessageSquare size={16} aria-hidden />;
  if (tab === "vazifa") return <ClipboardCheck size={16} aria-hidden />;
  return <TelegramIkonka size={16} />;
}

function FaoliyatIkonka({ turi, size = 15 }: { turi: FaoliyatTuri; size?: number }) {
  if (turi === "tolov") return <Wallet size={size} />;
  if (turi === "izoh") return <MessageSquare size={size} />;
  if (turi === "xabar") return <Send size={size} />;
  if (turi === "vazifa") return <ClipboardCheck size={size} />;
  if (turi === "ish") return <CalendarClock size={size} />;
  return <Bell size={size} />;
}
