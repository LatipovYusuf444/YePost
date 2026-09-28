import { useMemo, useState } from "react";
import { Building2, Hash, Phone, Plus, Search, Trash2, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import KengaytiriladiganJadval, { type Ustun } from "../HisobotUchot/KengaytiriladiganJadval";
import IjtimoiyIkonlar from "./IjtimoiyIkonlar";
import KartaSozlama, { type Maydon } from "./KartaSozlama";
import KompaniyaModal from "./KompaniyaModal";
import KompaniyaTafsilotlariModal from "./KompaniyaTafsilotlariModal";
import KorinishTanlov, { type Korinish } from "./KorinishTanlov";
import type { Xaridor, XaridorKompaniyasi } from "./types";
import { sanaFormat } from "./yordamchilar";

type Props = {
  kompaniyalar: XaridorKompaniyasi[];
  xaridorlar: Xaridor[];
  savdolar: import("./types").XaridorSavdosi[];
  onSaqlash: (kompaniya: XaridorKompaniyasi) => Promise<XaridorKompaniyasi | null>;
  onOchirish: (id: string) => Promise<boolean>;
};

export default function Kompaniyalar({ kompaniyalar, xaridorlar, savdolar, onSaqlash, onOchirish }: Props) {
  const { t } = useTranslation("xaridor_uchot");
  const [qidiruv, setQidiruv] = useState("");
  const [korinish, setKorinish] = useState<Korinish>("karta");
  const [yashirinMaydon, setYashirinMaydon] = useState<Set<string>>(() => new Set());

  const kartaMaydonlari: Maydon[] = [
    { id: "nomi", nom: t("kompaniyalar.cardFields.nomi") },
    { id: "stir", nom: t("kompaniyalar.cardFields.stir") },
    { id: "tel", nom: t("kompaniyalar.cardFields.tel") },
    { id: "ijtimoiy", nom: t("kompaniyalar.cardFields.ijtimoiy") },
    { id: "aloqa", nom: t("kompaniyalar.cardFields.aloqa") },
    { id: "yaratilgan", nom: t("kompaniyalar.cardFields.yaratilgan") },
    { id: "yaratgan", nom: t("kompaniyalar.cardFields.yaratgan") },
  ];

  function maydonToggle(id: string) {
    setYashirinMaydon((oldingi) => {
      const yangi = new Set(oldingi);
      if (yangi.has(id)) yangi.delete(id);
      else yangi.add(id);
      return yangi;
    });
  }

  const korinadi = (id: string) => !yashirinMaydon.has(id);
  const [modalOchiq, setModalOchiq] = useState(false);
  const [tahrirKompaniya, setTahrirKompaniya] = useState<XaridorKompaniyasi | null>(null);
  const [tafsilotKompaniya, setTafsilotKompaniya] = useState<XaridorKompaniyasi | null>(null);

  const ustunlar: Ustun<XaridorKompaniyasi>[] = [
    { id: "nomi", nom: t("kompaniyalar.columns.nomi"), kenglik: 180, katak: (k) => <span className="font-black text-slate-900">{k.nomi}</span> },
    { id: "stir", nom: t("kompaniyalar.columns.stir"), kenglik: 130, katak: (k) => <span className="text-slate-500">{k.stir || "—"}</span> },
    { id: "tel", nom: t("kompaniyalar.columns.tel"), kenglik: 150, katak: (k) => <span className="text-slate-500">{k.telefon || "—"}</span> },
    { id: "aloqa", nom: t("kompaniyalar.columns.aloqa"), kenglik: 160, katak: (k) => <span className="text-slate-600">{k.aloqaShaxsi || "—"}</span> },
    { id: "lavozim", nom: t("kompaniyalar.columns.lavozim"), kenglik: 150, katak: (k) => <span className="text-slate-500">{k.lavozim || "—"}</span> },
    { id: "aloqaTel", nom: t("kompaniyalar.columns.aloqaTel"), kenglik: 150, katak: (k) => <span className="text-slate-500">{k.aloqaTelefoni || "—"}</span> },
    { id: "ijtimoiy", nom: t("kompaniyalar.columns.ijtimoiy"), kenglik: 140, katak: (k) => <IjtimoiyIkonlar ijtimoiy={k.ijtimoiy} /> },
    {
      id: "yaratgan",
      nom: t("kompaniyalar.columns.yaratgan"),
      kenglik: 170,
      katak: (k) => <span className="text-slate-500">{k.yaratganMasul}</span>,
    },
    { id: "yaratilgan", nom: t("kompaniyalar.columns.yaratilgan"), kenglik: 140, katak: (k) => <span className="text-slate-500">{sanaFormat(k.yaratilganSana)}</span> },
    { id: "ozgartirilgan", nom: t("kompaniyalar.columns.ozgartirilgan"), kenglik: 150, katak: (k) => <span className="text-slate-500">{sanaFormat(k.ozgartirilganSana)}</span> },
    { id: "ozgartgan", nom: t("kompaniyalar.columns.ozgartgan"), kenglik: 180, katak: (k) => <span className="text-slate-500">{k.ozgartirganMasul}</span> },
  ];

  const royxat = useMemo(() => {
    const soz = qidiruv.trim().toLowerCase();
    if (!soz) return kompaniyalar;
    return kompaniyalar.filter((kompaniya) =>
      [kompaniya.nomi, kompaniya.stir, kompaniya.telefon].join(" ").toLowerCase().includes(soz)
    );
  }, [kompaniyalar, qidiruv]);

  function modalniOchish(kompaniya?: XaridorKompaniyasi) {
    setTahrirKompaniya(kompaniya ?? null);
    setModalOchiq(true);
  }

  async function ochirish(kompaniya: XaridorKompaniyasi) {
    if (!window.confirm(t("kompaniyalar.deleteConfirm", { name: kompaniya.nomi }))) return;
    return onOchirish(kompaniya.id);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">
            {t("shared.eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-black text-gray-950">{t("kompaniyalar.title")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("kompaniyalar.subtitle")}
          </p>
        </div>
      </header>

      {/* Chapda: qidiruv + yonida Ko'rinish. O'ngda: qo'shish tugmasi. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex h-11 w-full max-w-xl items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 shadow-sm">
            <Search size={17} className="text-gray-400" />
            <input
              value={qidiruv}
              onChange={(event) => setQidiruv(event.target.value)}
              className="min-w-0 flex-1 text-sm font-semibold outline-none"
              placeholder={t("kompaniyalar.searchPlaceholder")}
            />
          </label>
          <KorinishTanlov qiymat={korinish} onChange={setKorinish} />
        </div>

        <button
          onClick={() => modalniOchish()}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-orange-500 px-4 text-sm font-black text-white"
        >
          <Plus size={17} />
          {t("kompaniyalar.addButton")}
        </button>
      </div>

      {korinish === "jadval" && (
        <KengaytiriladiganJadval
          ustunlar={ustunlar}
          qatorlar={royxat}
          kengaytir
          sozlamaBor
          onQatorBosildi={setTafsilotKompaniya}
          onQatorOchirish={ochirish}
        />
      )}

      {korinish === "karta" && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {royxat.map((kompaniya) => (
          <article
            key={kompaniya.id}
            onClick={() => setTafsilotKompaniya(kompaniya)}
            className="cursor-pointer rounded-[24px] border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <Building2 size={22} />
              </div>
              <div className="flex items-center gap-2">
                <KartaSozlama
                  maydonlar={kartaMaydonlari}
                  yashirin={yashirinMaydon}
                  onToggle={maydonToggle}
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void ochirish(kompaniya);
                  }}
                  title={t("shared.deleteAria")}
                  aria-label={t("shared.deleteAria")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* 1 Nomi */}
            {korinadi("nomi") && (
              <h2 className="mt-5 text-xl font-black text-gray-950">{kompaniya.nomi}</h2>
            )}

            {korinadi("stir") && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
                <Hash size={14} className="text-orange-400" />
                {t("kompaniyalar.stirPrefix", { value: kompaniya.stir || "—" })}
              </p>
            )}

            {/* 2 Tel nomer */}
            {korinadi("tel") && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-gray-500">
                <Phone size={14} className="text-orange-400" />
                {kompaniya.telefon || "—"}
              </p>
            )}

            {/* 3 Ijtimoiy tarmoq */}
            {korinadi("ijtimoiy") && (
              <div className="mt-3">
                <IjtimoiyIkonlar ijtimoiy={kompaniya.ijtimoiy} />
              </div>
            )}

            {/* 4 Aloqa shaxsi (bo'lsa) */}
            {korinadi("aloqa") && kompaniya.aloqaShaxsi && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
                <UserRound size={14} className="text-orange-400" />
                {kompaniya.aloqaShaxsi}
              </p>
            )}

            {/* 5 Yaratilgan sana · 6 Yaratgan mas'ul shaxs */}
            {(korinadi("yaratilgan") || korinadi("yaratgan")) && (
            <div className="mt-5 space-y-1 border-t border-gray-100 pt-4 text-sm">
              {korinadi("yaratilgan") && (
              <p className="flex items-center justify-between gap-2">
                <span className="text-gray-400">{t("shared.createdLabel")}</span>
                <span className="font-semibold text-gray-600">
                  {sanaFormat(kompaniya.yaratilganSana)}
                </span>
              </p>
              )}
              {korinadi("yaratgan") && (
              <p className="flex items-center justify-between gap-2">
                <span className="text-gray-400">{t("shared.createdByLabel")}</span>
                <span className="truncate font-semibold text-gray-600">
                  {kompaniya.yaratganMasul}
                </span>
              </p>
              )}
            </div>
            )}
          </article>
        ))}

        {royxat.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-orange-200 bg-white p-14 text-center">
            <Building2 className="mx-auto text-orange-200" size={42} />
            <p className="mt-3 font-bold text-gray-500">{t("kompaniyalar.empty")}</p>
          </div>
        )}
      </div>
      )}

      {tafsilotKompaniya && (
        <KompaniyaTafsilotlariModal
          kompaniya={tafsilotKompaniya}
          xaridorlar={xaridorlar}
          savdolar={savdolar}
          tolovlar={[]}
          tarix={[]}
          onTahrirlash={() => modalniOchish(tafsilotKompaniya)}
          onOchirish={async () => {
            if (await ochirish(tafsilotKompaniya)) setTafsilotKompaniya(null);
          }}
          onYopish={() => setTafsilotKompaniya(null)}
        />
      )}

      {modalOchiq && (
        <KompaniyaModal
          boshlangich={tahrirKompaniya}
          xaridorlar={xaridorlar}
          savdolar={savdolar}
          tolovlar={[]}
          tarix={[]}
          onYopish={() => setModalOchiq(false)}
          onSaqlash={async (kompaniya) => {
            const saqlangan = await onSaqlash(kompaniya);
            if (!saqlangan) return;
            setTafsilotKompaniya((joriy) => (joriy?.id === saqlangan.id ? saqlangan : joriy));
            setModalOchiq(false);
          }}
        />
      )}

    </div>
  );
}
