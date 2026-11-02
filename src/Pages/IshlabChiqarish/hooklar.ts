import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { omborlarApi } from "@/api/omborApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatoKodi } from "@/api/xatoKodlari";
import type { Ombor } from "@/types/ombor";

/** Ro'yxat/hujjat yuklash. `kalit` o'zgarganda qayta olinadi. */
export function useMalumot<T>(yuklash: () => Promise<T>, kalit: string) {
  const [malumot, setMalumot] = useState<T | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(true);
  const [xato, setXato] = useState("");
  const [urinish, setUrinish] = useState(0);
  useEffect(() => {
    let faol = true;
    setYuklanmoqda(true);
    setXato("");
    yuklash()
      .then((natija) => { if (faol) setMalumot(natija); })
      .catch((error) => {
        if (faol) setXato(getApiErrorMessage(error));
      })
      .finally(() => { if (faol) setYuklanmoqda(false); });
    return () => { faol = false; };
    // `yuklash` har chizishda yangi funksiya: so'rov faqat `kalit` yoki qayta urinish bilan yuboriladi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalit, urinish]);
  return { malumot, yuklanmoqda, xato, qayta: useCallback(() => setUrinish((son) => son + 1), []) };
}

/** Tugma amali: ikki marta bosish bloklanadi, xato matni va kodi saqlanadi. */
export function useAmal() {
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [xatoKodiQiymati, setXatoKodi] = useState("");
  const qulf = useRef(false);
  const bajar = useCallback(async <T,>(ish: () => Promise<T>): Promise<T | undefined> => {
    if (qulf.current) return undefined;
    qulf.current = true;
    setBand(true);
    setXato("");
    setXatoKodi("");
    try {
      return await ish();
    } catch (error) {
      setXato(getApiErrorMessage(error));
      setXatoKodi((axios.isAxiosError(error) ? xatoKodi(error.response?.data) : "") ?? "");
      return undefined;
    } finally {
      qulf.current = false;
      setBand(false);
    }
  }, []);
  return { band, xato, xatoKodi: xatoKodiQiymati, bajar, setXato };
}

export function useOmborlar() {
  const [omborlar, setOmborlar] = useState<Ombor[]>([]);
  useEffect(() => {
    let faol = true;
    omborlarApi.royxat().then((royxat) => { if (faol) setOmborlar(royxat); }).catch(() => undefined);
    return () => { faol = false; };
  }, []);
  return omborlar;
}
