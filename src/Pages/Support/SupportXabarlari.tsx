import { useState } from "react";
import { Check, CheckCheck, Download, FileText, Headset, LoaderCircle } from "lucide-react";
import { crmIlovalarApi } from "@/api/crmAttachmentsApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/Components/ui/avatar";
import { sanaSarlavhasi, vaqtMatni, type Guruh } from "./supportYordamchilar";

// Qo'llab-quvvatlash chatining umumiy yordamchilari va xabarlar ro'yxati
// (suhbat oynasi va inbox sahifasi ikkalasi ham shu yerdan foydalanadi).

type Props = {
  kunlar: Guruh[];
  compact?: boolean;
  t: (key: string) => string;
};

export function KunlarRoyxati({ kunlar, compact = false, t }: Props) {
  const [yuklabOlinmoqda, setYuklabOlinmoqda] = useState<string | null>(null);

  async function yuklabOlish(attachment: { id: string; name: string }) {
    setYuklabOlinmoqda(attachment.id);
    try {
      await crmIlovalarApi.yuklabOlish(attachment.id, attachment.name);
    } finally {
      setYuklabOlinmoqda(null);
    }
  }

  return (
    <>
      {kunlar.map((kun) => (
        <div key={kun.sana} className="space-y-4">
          <div className="flex justify-center py-1">
            <span className="rounded-full bg-white px-3.5 py-1 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
              {sanaSarlavhasi(kun.xabarlar[0][0].createdAt, t)}
            </span>
          </div>
          {kun.xabarlar.map((guruh, guruhIndex) => {
            const own = guruh[0].direction === "OUT";
            return (
              <div key={guruhIndex} className={`flex items-end gap-2.5 ${own ? "justify-end" : ""}`}>
                {!own && (
                  <Avatar size="default" className="!size-7 shrink-0 border border-blue-100 bg-blue-50 text-blue-700">
                    <AvatarImage src={guruh[0].senderAvatarUrl} alt="" />
                    <AvatarFallback className="bg-blue-50 text-blue-700">
                      <Headset size={14} />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`flex min-w-0 flex-col gap-1.5 ${own ? "items-end" : "items-start"} ${compact ? "max-w-[82%]" : "max-w-[75%]"}`}>
                  {!own && (
                    <span className="px-1 text-[11px] font-semibold text-slate-600">
                      {guruh[0].senderName?.trim() || t("defaultSenderName")}
                    </span>
                  )}
                  {guruh.map((xabar) => (
                    <div
                      key={xabar.id}
                      className={`min-w-0 max-w-full rounded-[20px] px-4 py-2.5 ${
                        own
                          ? "rounded-br-[6px] bg-gradient-to-br from-blue-600 to-sky-500 text-white shadow-[0_6px_18px_rgba(37,99,235,.22)]"
                          : "rounded-bl-[6px] border border-slate-100 bg-white text-slate-800 shadow-[0_4px_14px_rgba(15,23,42,.06)]"
                      }`}
                    >
                      {xabar.text && (
                        <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{xabar.text}</p>
                      )}
                      {xabar.attachments && xabar.attachments.length > 0 && (
                        <div className={`flex flex-col gap-1.5 ${xabar.text ? "mt-2" : ""}`}>
                          {xabar.attachments.map((ilova) => (
                            <button
                              key={ilova.id}
                              type="button"
                              onClick={() => void yuklabOlish(ilova)}
                              disabled={yuklabOlinmoqda === ilova.id}
                              className={`flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-xs font-medium transition disabled:opacity-60 ${
                                own
                                  ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              <FileText size={14} className="shrink-0" />
                              <span className="max-w-[160px] truncate">{ilova.name}</span>
                              {yuklabOlinmoqda === ilova.id ? (
                                <LoaderCircle size={13} className="shrink-0 animate-spin" />
                              ) : (
                                <Download size={13} className="shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-medium ${
                          own ? "text-white/75" : "text-slate-400"
                        }`}
                      >
                        <span>{vaqtMatni(xabar.createdAt)}</span>
                        {own &&
                          xabar.status &&
                          (xabar.status === "READ" ? (
                            <CheckCheck size={13} className="text-sky-100" />
                          ) : xabar.status === "DELIVERED" ? (
                            <CheckCheck size={13} />
                          ) : (
                            <Check size={13} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
