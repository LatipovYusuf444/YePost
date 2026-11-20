import SmartTable from "@/Components/common/smart-table/SmartTable";
import { useEffect, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import TablePagination from "@/Components/common/TablePagination";
import { TanlashKatagi } from "@/Components/common/KopTanlov";
import { guruhSahifasi } from "@/lib/guruhSahifasi";

// Ustun kengligini sichqoncha bilan o'zgartirsa (resize) va sudrab joyini
// almashtirsa (reorder) bo'ladigan umumiy hisobot jadvali.

export type Ustun<T> = {
  id: string;
  nom: string;
  kenglik?: number; // boshlang'ich piksel kenglik
  hizalash?: "left" | "right" | "center"; // katak matnini tekislash
  katak: (row: T) => ReactNode;
  jami?: () => ReactNode; // footer katagi (ixtiyoriy)
  boshlangichYashirin?: boolean;
};

function hizKlass(hizalash?: "left" | "right" | "center") {
  return hizalash === "right" ? "text-right" : hizalash === "center" ? "text-center" : "text-left";
}

const ODATIY_KENGLIK = 140;

export default function KengaytiriladiganJadval<T extends { id: string }>({
  tableId,
  ustunlar,
  qatorlar,
  jamiBor = false,
  onQatorBosildi,
  kengaytir = true,
  qatorKlass,
  sozlamaBor = false,
  onQatorOchirish,
  qatorOchirishHolati,
  qatorGuruhKaliti,
  tanlash,
}: {
  tableId: string;
  ustunlar: Ustun<T>[];
  qatorlar: T[];
  jamiBor?: boolean;
  onQatorBosildi?: (row: T) => void;
  kengaytir?: boolean; // true — jadval konteynerni to'ldirib oxirigacha cho'ziladi
  qatorKlass?: (row: T) => string; // qatorga qo'shimcha klass (masalan guruh sarlavhasi)
  sozlamaBor?: boolean; // true — jadval oxirida ustunlarni sozlash (yashirish) tugmasi
  onQatorOchirish?: (row: T) => void; // oxirgi ustunda (⚙ ostida) har qator uchun o'chirish tugmasi
  // Qator o'chirilishi mumkin emas bo'lsa tugma o'chirib qo'yiladi va sarlavhada sababi ko'rsatiladi.
  qatorOchirishHolati?: (row: T) => { mumkin: boolean; sarlavha?: string };
  qatorGuruhKaliti?: (row: T) => string;
  // Belgilash ustuni (ixtiyoriy): har qatorda katak, sarlavhada "hammasini tanlash" — hozir sahifada ko'rinib turgan qatorlar uchun.
  tanlash?: {
    holat: (ids: readonly string[]) => boolean | "qisman";
    tanlangan: ReadonlySet<string>;
    onChange: (ids: string[], belgilansin: boolean) => void;
    hammasiAria: string;
    qatorAria: (row: T) => string;
    disabled?: boolean;
  };
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const SOZLAMA_KENGLIK = 52;
  const TANLASH_KENGLIK = 48;

  const korinadigan = ustunlar;
  const grouped = qatorGuruhKaliti ? guruhSahifasi(qatorlar, qatorGuruhKaliti, page, pageSize) : null;
  const visibleRows = grouped?.rows ?? qatorlar.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [qatorlar, pageSize]);

  // Oxirgi (amallar) ustuni: header'da ⚙, qatorlarda o'chirish tugmasi.
  const amallarUstuni = sozlamaBor || Boolean(onQatorOchirish);

  const jamiKenglik =
    korinadigan.reduce((s, u) => s + (u.kenglik ?? ODATIY_KENGLIK), 0) +
    (amallarUstuni ? SOZLAMA_KENGLIK : 0) +
    (tanlash ? TANLASH_KENGLIK : 0);
  const korinadiganIds = visibleRows.map((row) => row.id);

  return (
    <div className="scrollbar-orange w-full overflow-x-auto rounded-2xl border border-orange-100">
      <SmartTable tableId={tableId} replaceColumnControls><table
        className="min-w-full text-left text-sm"
        style={
          kengaytir
            ? { tableLayout: "fixed", width: "100%", minWidth: jamiKenglik }
            : { tableLayout: "fixed", width: jamiKenglik }
        }
      >
        <colgroup>
          {tanlash && <col style={{ width: TANLASH_KENGLIK }} />}
          {korinadigan.map((u) => (
            <col key={u.id} style={{ width: u.kenglik ?? ODATIY_KENGLIK }} />
          ))}
          {amallarUstuni && <col style={{ width: SOZLAMA_KENGLIK }} />}
        </colgroup>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {tanlash && (
              <th data-column-id="tanlash" className="px-3 py-4">
                <TanlashKatagi holat={tanlash.holat(korinadiganIds)} onChange={(belgilansin) => tanlash.onChange(korinadiganIds, belgilansin)} ariaLabel={tanlash.hammasiAria} disabled={!korinadiganIds.length || tanlash.disabled} />
              </th>
            )}
            {korinadigan.map((u) => (
              <th key={u.id} data-column-id={u.id} data-default-hidden={u.boshlangichYashirin || undefined} className={`relative px-4 py-4 ${hizKlass(u.hizalash)}`}>{u.nom}</th>
            ))}
            {amallarUstuni && <th data-column-id="h1" className="px-3 py-4" aria-label="Amallar" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-orange-100/70">
          {visibleRows.map((row) => (
            <tr
              key={row.id}
              onClick={onQatorBosildi ? () => onQatorBosildi(row) : undefined}
              data-tanlangan={tanlash?.tanlangan.has(row.id) || undefined}
              className={`hover:bg-orange-50/50 ${onQatorBosildi ? "cursor-pointer" : ""} ${tanlash?.tanlangan.has(row.id) ? "bg-red-50/40" : ""} ${
                qatorKlass?.(row) ?? ""
              }`}
            >
              {tanlash && (
                <td className="px-3 py-4" onClick={(event) => event.stopPropagation()}>
                  <TanlashKatagi holat={tanlash.tanlangan.has(row.id)} onChange={(belgilansin) => tanlash.onChange([row.id], belgilansin)} ariaLabel={tanlash.qatorAria(row)} disabled={tanlash.disabled} />
                </td>
              )}
              {korinadigan.map((u) => (
                <td key={u.id} className={`truncate px-4 py-4 font-semibold text-gray-700 ${hizKlass(u.hizalash)}`}>
                  {u.katak(row)}
                </td>
              ))}
              {amallarUstuni && (
                <td className="px-3 py-4">
                  {onQatorOchirish && (() => {
                    const holat = qatorOchirishHolati?.(row) ?? { mumkin: true };
                    return (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!holat.mumkin}
                          onClick={(e) => {
                            e.stopPropagation();
                            onQatorOchirish(row);
                          }}
                          aria-label="O'chirish"
                          title={holat.sarlavha}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-slate-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })()}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {jamiBor && (
          <tfoot className="border-t border-orange-100 bg-orange-50/40 text-sm font-black text-gray-700">
            <tr>
              {tanlash && <td />}
              {korinadigan.map((u) => (
                <td key={u.id} className={`truncate px-4 py-4 ${hizKlass(u.hizalash)}`}>
                  {u.jami?.()}
                </td>
              ))}
              {amallarUstuni && <td />}
            </tr>
          </tfoot>
        )}
      </table></SmartTable>
      <TablePagination page={grouped?.page ?? page} pageSize={pageSize} totalItems={grouped?.total ?? qatorlar.length} onPageChange={setPage} onPageSizeChange={setPageSize} />
    </div>
  );
}
