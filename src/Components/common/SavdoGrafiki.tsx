import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

type Davr = "kunlik" | "haftalik" | "oylik" | "yillik";

const data = {
  kunlik: [
    { nom: "09:00", savdo: 1200000 },
    { nom: "11:00", savdo: 2800000 },
    { nom: "13:00", savdo: 2100000 },
    { nom: "15:00", savdo: 3900000 },
    { nom: "17:00", savdo: 5200000 },
    { nom: "19:00", savdo: 4700000 },
  ],
  haftalik: [
    { nom: "Du", savdo: 4500000 },
    { nom: "Se", savdo: 7000000 },
    { nom: "Ch", savdo: 5500000 },
    { nom: "Pa", savdo: 9000000 },
    { nom: "Ju", savdo: 6800000 },
    { nom: "Sh", savdo: 7800000 },
    { nom: "Ya", savdo: 10000000 },
  ],
  oylik: [
    { nom: "1-hafta", savdo: 28000000 },
    { nom: "2-hafta", savdo: 36000000 },
    { nom: "3-hafta", savdo: 31000000 },
    { nom: "4-hafta", savdo: 47000000 },
  ],
  yillik: [
    { nom: "Yan", savdo: 120000000 },
    { nom: "Fev", savdo: 145000000 },
    { nom: "Mar", savdo: 132000000 },
    { nom: "Apr", savdo: 168000000 },
    { nom: "May", savdo: 190000000 },
    { nom: "Iyun", savdo: 210000000 },
  ],
};

function formatSumma(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} mlrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} mln`;
  return `${value.toLocaleString("ru-RU")} so‘m`;
}

export default function SavdoGrafiki() {
  const [davr, setDavr] = useState<Davr>("haftalik");

  const activeData = useMemo(() => data[davr], [davr]);

  return (
    <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
      {/* Tepasi */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Savdo grafigi</h2>
          <p className="mt-1 text-sm text-gray-500">
            Kunlik, haftalik, oylik va yillik savdo tahlili
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-2xl bg-orange-50 p-1">
            {(["kunlik", "haftalik", "oylik", "yillik"] as Davr[]).map((item) => (
              <button
                key={item}
                onClick={() => setDavr(item)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${davr === item
                    ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                    : "text-orange-600 hover:bg-white"
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-600">
            <TrendingUp size={17} />
            +24%
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div className="h-[320px] rounded-[28px] bg-gradient-to-b from-orange-50 to-white p-4">
        <ResponsiveContainer width="100%" height="100%">
          {davr === "kunlik" || davr === "haftalik" ? (
            <AreaChart data={activeData}>
              <defs>
                <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B2C" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FF6B2C" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FED7AA" />
              <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={formatSumma} />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString("ru-RU")} so‘m`, "Savdo"]}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid #FED7AA",
                  boxShadow: "0 10px 30px rgba(249,115,22,0.15)",
                }}
              />
              <Area
                type="monotone"
                dataKey="savdo"
                stroke="#FF6B2C"
                strokeWidth={4}
                fill="url(#orangeGradient)"
                activeDot={{ r: 7 }}
              />
            </AreaChart>
          ) : (
            <BarChart data={activeData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FED7AA" />
              <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} tickFormatter={formatSumma} />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString("ru-RU")} so‘m`, "Savdo"]}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid #FED7AA",
                  boxShadow: "0 10px 30px rgba(249,115,22,0.15)",
                }}
              />
              <Bar dataKey="savdo" fill="#FF6B2C" radius={[14, 14, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
