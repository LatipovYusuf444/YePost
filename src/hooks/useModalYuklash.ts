import { useCallback, useEffect, useState } from "react";
import { modalYuklagichYaratish } from "@/lib/modalYuklash";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { xatolikXabari } from "@/lib/toast";

export function useModalYuklash<T>() {
  const [malumot, setMalumot] = useState<T | null>(null);
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const [yuklagich] = useState(() => modalYuklagichYaratish<T>({
    boshlash: () => { setMalumot(null); setYuklanmoqda(true); },
    natija: setMalumot,
    xato: (error) => xatolikXabari(getApiErrorMessage(error)),
    yakun: () => setYuklanmoqda(false),
  }));
  useEffect(() => () => yuklagich.bekorQilish(), [yuklagich]);
  const yopish = useCallback(() => {
    yuklagich.bekorQilish();
    setMalumot(null);
    setYuklanmoqda(false);
  }, [yuklagich]);
  return { malumot, yuklanmoqda, ochish: yuklagich.yuklash, yopish };
}
