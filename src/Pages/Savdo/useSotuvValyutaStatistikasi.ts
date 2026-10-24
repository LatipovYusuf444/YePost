import { useEffect, useMemo, useRef, useState } from "react";
import { sotuvTafsilotiniFondaOlish } from "@/api/savdoApi";
import type { Sotuv } from "@/types/savdo";
import { sotuvValyutaStatistikasi, statistikaTafsilotiKerak, statistikaTafsilotlariniYuklash } from "./sotuvValyutaStatistikasi";

export function useSotuvValyutaStatistikasi(sotuvlar: Sotuv[], yuklanmoqda: boolean, dan: string, gacha: string, sanaOlish: (sale: Sotuv) => string | undefined) {
  const [loaded, setLoaded] = useState<{ source: Sotuv[]; rows: Sotuv[] } | null>(null);
  const request = useRef<{ source: Sotuv[]; promise: Promise<Sotuv[]> } | null>(null);
  const needsDetail = sotuvlar.some(statistikaTafsilotiKerak);
  useEffect(() => {
    if (yuklanmoqda || !needsDetail) return;
    let active = true;
    // StrictMode bir ro'yxat uchun takroran detail so'rovlarini yubormaydi.
    if (request.current?.source !== sotuvlar) {
      request.current = { source: sotuvlar, promise: statistikaTafsilotlariniYuklash(sotuvlar, sotuvTafsilotiniFondaOlish) };
    }
    void request.current.promise.then((rows) => { if (active) setLoaded({ source: sotuvlar, rows }); });
    return () => { active = false; };
  }, [sotuvlar, yuklanmoqda, needsDetail]);
  const rows = loaded?.source === sotuvlar ? loaded.rows : sotuvlar;
  const natija = useMemo(() => sotuvValyutaStatistikasi(rows, dan, gacha, sanaOlish), [rows, dan, gacha, sanaOlish]);
  return { natija, yuklanmoqda: yuklanmoqda || (needsDetail && loaded?.source !== sotuvlar) };
}
