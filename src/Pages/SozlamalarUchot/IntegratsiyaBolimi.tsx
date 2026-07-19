import { useState } from "react";
import { CreditCard, Send } from "lucide-react";
import { BolimKarta, Switch } from "./UmumiyUI";
import { maydonKlass } from "./yordamchilar";

// Integratsiya — faqat superadmin/direktor uchun (Sozlamalar index'ida qulflangan).
// To'lov tizimlari (Payme/Click/Uzum) va Telegram bot integratsiyasi. Mock.

type Tizim = { id: string; nomi: string; tavsif: string };

const tolovTizimlari: Tizim[] = [
  { id: "payme", nomi: "Payme", tavsif: "Payme orqali onlayn to'lovlarni qabul qilish." },
  { id: "click", nomi: "Click", tavsif: "Click to'lov tizimi integratsiyasi." },
  { id: "uzum", nomi: "Uzum Nasiya", tavsif: "Uzum orqali to'lov va bo'lib to'lash." },
];

type TizimHolat = { ulangan: boolean; merchant: string };

export default function IntegratsiyaBolimi() {
  const [holat, setHolat] = useState<Record<string, TizimHolat>>({
    payme: { ulangan: true, merchant: "PM-4471209" },
    click: { ulangan: false, merchant: "" },
    uzum: { ulangan: false, merchant: "" },
  });
  const [tg, setTg] = useState({ ulangan: false, token: "" });

  function ulashToggle(id: string) {
    setHolat((o) => ({ ...o, [id]: { ...o[id], ulangan: !o[id].ulangan } }));
  }
  function merchantOzgar(id: string, qiymat: string) {
    setHolat((o) => ({ ...o, [id]: { ...o[id], merchant: qiymat } }));
  }

  return (
    <div className="space-y-5">
      <BolimKarta
        sarlavha="To'lov tizimlari"
        izoh="Onlayn to'lovlarni qabul qilish uchun to'lov tizimini ulang."
      >
        <div className="space-y-3">
          {tolovTizimlari.map((t) => {
            const h = holat[t.id];
            return (
              <div key={t.id} className="rounded-2xl border border-orange-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#FF6A00]">
                      <CreditCard size={18} />
                    </span>
                    <div>
                      <p className="font-black text-gray-800">
                        {t.nomi}
                        <StatusBelgi ulangan={h.ulangan} />
                      </p>
                      <p className="text-xs text-gray-400">{t.tavsif}</p>
                    </div>
                  </div>
                  <Switch yoniq={h.ulangan} onChange={() => ulashToggle(t.id)} />
                </div>
                {h.ulangan && (
                  <input
                    value={h.merchant}
                    onChange={(e) => merchantOzgar(t.id, e.target.value)}
                    placeholder="Merchant ID / maxfiy kalit"
                    className={`${maydonKlass} mt-3`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </BolimKarta>

      <BolimKarta
        sarlavha="Telegram bot"
        izoh="Bot orqali bildirishnoma yuborish va buyurtmalarni qabul qilish."
      >
        <div className="rounded-2xl border border-orange-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                <Send size={18} />
              </span>
              <div>
                <p className="font-black text-gray-800">
                  Telegram bot
                  <StatusBelgi ulangan={tg.ulangan} />
                </p>
                <p className="text-xs text-gray-400">BotFather'dan olingan tokenni kiriting.</p>
              </div>
            </div>
            <Switch yoniq={tg.ulangan} onChange={() => setTg((s) => ({ ...s, ulangan: !s.ulangan }))} />
          </div>
          {tg.ulangan && (
            <input
              value={tg.token}
              onChange={(e) => setTg((s) => ({ ...s, token: e.target.value }))}
              placeholder="Bot token (masalan: 123456:ABC-DEF...)"
              className={`${maydonKlass} mt-3`}
            />
          )}
        </div>
      </BolimKarta>
    </div>
  );
}

function StatusBelgi({ ulangan }: { ulangan: boolean }) {
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
        ulangan ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
      }`}
    >
      {ulangan ? "Ulangan" : "Ulanmagan"}
    </span>
  );
}
