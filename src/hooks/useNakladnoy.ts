import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { telegramApi } from "@/api/telegramApi";
import { xatolikXabari } from "@/lib/toast";

/**
 * Tasdiqlangan sotuvning PDF nakladnoyi (GET /sales/:id/nakladnoy.pdf). `korish` — yangi oynada ochadi ("Hujjatni ko'rish"),
 * `yuklash` — faylni yuklab oladi. Xato (masalan, qoralama sotuv) qizil toastda ko'rsatiladi.
 */
export function useNakladnoy(sotuvId: string, hujjatRaqami: string) {
  const [yuklanmoqda, setYuklanmoqda] = useState(false);
  const faolRef = useRef(true);
  const bandRef = useRef(false);

  useEffect(() => {
    faolRef.current = true;
    return () => {
      faolRef.current = false;
    };
  }, []);

  const bajarish = useCallback(
    async (amal: () => Promise<unknown>) => {
      if (bandRef.current) return;
      bandRef.current = true;
      setYuklanmoqda(true);
      try {
        await amal();
      } catch (error) {
        xatolikXabari(getApiErrorMessage(error));
      } finally {
        bandRef.current = false;
        if (faolRef.current) setYuklanmoqda(false);
      }
    },
    []
  );

  const korish = useCallback(() => {
    if (bandRef.current) return;
    // Bo'sh oyna bosish paytida (foydalanuvchi harakati ichida) ochiladi, PDF kelgach unga yuklanadi.
    const oyna = window.open("", "_blank");
    if (oyna) {
      oyna.opener = null;
      oyna.document.title = "Nakladnoy";
      oyna.document.body.style.cssText = "font-family:system-ui,sans-serif;color:#64748b;display:flex;align-items:center;justify-content:center;height:100vh;margin:0";
      oyna.document.body.textContent = "Nakladnoy yuklanmoqda...";
    }
    void bajarish(() => telegramApi.nakladnoyniKorish(sotuvId, hujjatRaqami, oyna));
  }, [bajarish, hujjatRaqami, sotuvId]);

  const yuklash = useCallback(() => {
    void bajarish(() => telegramApi.nakladnoyYuklash(sotuvId, hujjatRaqami));
  }, [bajarish, hujjatRaqami, sotuvId]);

  return { korish, yuklash, yuklanmoqda };
}
