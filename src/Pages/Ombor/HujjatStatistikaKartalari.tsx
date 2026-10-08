import { CheckCircle2, CircleX, Clock3, FileText } from "lucide-react";
import KorsatkichKartasi, { KartaOlchagich, type KartaRangi } from "@/Components/common/KorsatkichKartasi";

type Props = {
  labels: [string, string, string, string];
  values: [number, number, number, number];
  selected: string;
  onSelect: (status: string) => void;
  ariaLabel?: string;
  loading?: boolean;
  loadingText?: string;
};

const filters = ["ALL", "CONFIRMED", "DRAFT", "CANCELLED"];
const icons = [FileText, CheckCircle2, Clock3, CircleX];
const ranglar: KartaRangi[] = ["blue", "emerald", "amber", "rose"];
const bezakRanglari = ["bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400"];

// Hujjat holatlari bo'yicha 4 ta karta (hammasi / tasdiqlangan / jarayonda / bekor qilingan): har biri filtr tugmasi.
// Belgi va o'lchagich shu holatdagi hujjatlarning jami hujjatlarga nisbatini ko'rsatadi.
export default function HujjatStatistikaKartalari({ labels, values, selected, onSelect, ariaLabel, loading, loadingText }: Props) {
  const total = values[0];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={ariaLabel ?? "Hujjatlar statistikasi"}>
      {labels.map((label, index) => {
        const percent = total ? Math.round((values[index] / total) * 100) : 0;
        return (
          <KorsatkichKartasi
            key={filters[index]}
            icon={icons[index]}
            nom={label}
            qiymat={String(values[index])}
            rang={ranglar[index]}
            belgi={{ matn: `${percent}%` }}
            ornament={<KartaOlchagich faol={values[index]} jami={total} klass={bezakRanglari[index]} />}
            yuklanmoqda={loading}
            yuklanishMatni={loadingText}
            onClick={() => onSelect(filters[index])}
            tanlangan={selected === filters[index]}
          />
        );
      })}
    </section>
  );
}
