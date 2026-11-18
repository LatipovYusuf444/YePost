import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { foydalanuvchilarApi } from "@/api/accountsApi";
import { modifikatsiyalarApi } from "@/api/catalogApi";
import { ishlabChiqarishApi } from "@/api/ishlabChiqarishApi";
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

/** Tugma amali: ikki marta bosish bloklanadi, xato matni va kodi saqlanadi. `onXato` — server javobini (masalan, maydon xatolari uchun) olish. */
export function useAmal() {
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState("");
  const [xatoKodiQiymati, setXatoKodi] = useState("");
  const qulf = useRef(false);
  const bajar = useCallback(async <T,>(ish: () => Promise<T>, onXato?: (tafsilot: unknown) => void): Promise<T | undefined> => {
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
      onXato?.(axios.isAxiosError(error) ? error.response?.data : undefined);
      return undefined;
    } finally {
      qulf.current = false;
      setBand(false);
    }
  }, []);
  return { band, xato, xatoKodi: xatoKodiQiymati, bajar, setXato };
}

/**
 * Faqat qoralama tahrirlanadi: tahrir faollashtirish bilan bir vaqtda kelsa server uni rad etadi. Tahrir xato bersa hujjat serverdan qayta
 * o'qiladi; u endi qoralama bo'lmasa `qoralamaEmas` — oyna server xabarini ko'rsatib, saqlashni yopadi va yangilangan hujjatni ochishni taklif qiladi.
 */
export function useQoralamaNazorati(olish: (() => Promise<{ status?: string | null }>) | null) {
  const [qoralamaEmas, setQoralamaEmas] = useState(false);
  const tekshir = () => {
    if (!olish) return;
    olish()
      .then((hujjat) => { if (hujjat?.status && hujjat.status !== "DRAFT") setQoralamaEmas(true); })
      .catch(() => undefined);
  };
  return { qoralamaEmas, tekshir };
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

/** Xodim ismi id bo'yicha ("kim qabul qildi", "kim yopdi"). Ro'yxatga ruxsat bo'lmasa (KASSIR/OMBORCHI — 403) xarita bo'sh qoladi. */
export function useXodimNomlari() {
  const [nomlar, setNomlar] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    let faol = true;
    foydalanuvchilarApi.royxat()
      .then((royxat) => { if (faol) setNomlar(new Map(royxat.map((xodim) => [xodim.id, xodim.fullName?.trim() || xodim.username]))); })
      .catch(() => undefined);
    return () => { faol = false; };
  }, []);
  return nomlar;
}

/** Mahsulot (variant) nomi id bo'yicha: javobda faqat id keladigan joylar uchun (masalan, retseptning brak mahsuloti). */
export function useModifikatsiyaNomi(id?: string | null) {
  const [nom, setNom] = useState("");
  useEffect(() => {
    if (!id) { setNom(""); return; }
    let faol = true;
    modifikatsiyalarApi.olish(id)
      .then((mod) => {
        if (!faol || !mod) return;
        const variant = mod.name && mod.name !== "Asosiy variant" && mod.name !== mod.product?.name ? mod.name : "";
        setNom([mod.product?.name, variant].filter(Boolean).join(" / ") || mod.name || mod.barcode || "");
      })
      .catch(() => undefined);
    return () => { faol = false; };
  }, [id]);
  return nom;
}

/** Brak sabablari (GET /production/scrap-reasons): birinchi o'qishda tayyorlari o'zi qo'shiladi. */
export function useBrakSabablari() {
  return useMalumot(() => ishlabChiqarishApi.brakSabablari.royxat(), "scrap-reasons");
}

/** Qiymat o'zgarishini kechiktiradi (yozib bo'lingach so'rov yuborish uchun). */
export function useKechiktirilgan<T>(qiymat: T, ms = 400) {
  const [kechiktirilgan, setKechiktirilgan] = useState(qiymat);
  useEffect(() => {
    const taymer = window.setTimeout(() => setKechiktirilgan(qiymat), ms);
    return () => window.clearTimeout(taymer);
  }, [qiymat, ms]);
  return kechiktirilgan;
}

// Forma maydon xatolari: butun loyiha uchun umumiy hook.
export { useMaydonXatolari } from "@/hooks/useMaydonXatolari";
