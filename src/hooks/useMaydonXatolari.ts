import { useCallback, useState } from "react";
import axios from "axios";
import { belgidanKeyingiXato, serverXatoMaydonlari, xatoBelgisi, type FormaXatosi, type XatoMaydonQoidasi } from "@/lib/maydonXatolari";

/**
 * Forma maydonlari xatolari (butun loyiha uchun). Kalit — backend maydon yo'li ("customerId", qatorda "items.2.quantity"): mijoz
 * tekshiruvi ham, server validatsiyasi (`errors[].field`) ham shu yo'lni beradi.
 *
 * Xato qo'yilganda birinchi xatoli maydonga (`[data-maydon-xato='true']`) suriladi; bunday maydon ekranda bo'lmasa `tepadagi` — matnni
 * oyna tepasida ko'rsatish uchun. Maydon o'zgarganda `tozala(yol)` uning (va ichidagi qatorlarning) xatosini olib tashlaydi.
 */
export function useMaydonXatolari(qoidalar: Record<string, XatoMaydonQoidasi> = {}) {
  const [xatolar, setXatolar] = useState<Record<string, string>>({});
  const [korinmadi, setKorinmadi] = useState(false);
  const ornat = useCallback((yangi: Record<string, string>) => {
    setXatolar(yangi);
    setKorinmadi(false);
    if (Object.keys(yangi).length === 0) return;
    window.setTimeout(() => {
      // Oynalar body oxiriga chiziladi: xatoli maydoni bor eng ustki oyna olinadi (orqadagi forma yoki sahifadagi eski xato emas).
      const oynalar = [...document.querySelectorAll(".app-modal-compact")].reverse();
      const ildiz = oynalar.find((oyna) => oyna.querySelector("[data-maydon-xato='true']")) ?? document;
      const maydon = ildiz.querySelector("[data-maydon-xato='true']");
      if (maydon) maydon.scrollIntoView({ block: "center", behavior: "smooth" });
      else setKorinmadi(true);
    }, 60);
  }, []);
  const tozala = useCallback((...yollar: string[]) => {
    setXatolar((joriy) => {
      const qolgan = Object.entries(joriy).filter(([kalit]) => !yollar.some((yol) => kalit === yol || kalit.startsWith(`${yol}.`)));
      return qolgan.length === Object.keys(joriy).length ? joriy : Object.fromEntries(qolgan);
    });
  }, []);
  const serverdan = (tafsilot: unknown) => {
    const maydonlar = serverXatoMaydonlari(tafsilot, qoidalar);
    ornat(maydonlar);
    return Object.keys(maydonlar).length > 0;
  };
  const bor = Object.keys(xatolar).length > 0;
  return {
    xato: (yol: string): string | undefined => xatolar[yol],
    bor,
    /** Maydoni ekranda topilmagan xato matni: oyna tepasida ko'rsatiladi. */
    tepadagi: korinmadi ? Object.values(xatolar).join(" ") : "",
    ornat,
    tozala,
    /** Mijoz tekshiruvi natijasi (`{ xato, maydon }`) — tarjima qilingan matn bilan. */
    tekshiruv: (natija: FormaXatosi, matn: string) => ornat({ [natija.maydon ?? "_"]: matn }),
    /** Server xatosi tanasi: validatsiya maydoni, xato kodi yoki xabar so'zi bo'yicha maydonga bog'lanadi; bog'lanmasa `false`. */
    serverdan,
    /**
     * Store (yoki boshqa qatlam) orqali yuborilgan so'rov: natija `false`/`null` bo'lsa yoki xato otilsa, shu so'rovdan keyin kelgan
     * server xatosi maydonlarga bog'lanadi. Ko'p store xatoda `undefined` qaytaradi: bunda faqat shu orada xato bergan o'zgartirish
     * so'rovi (POST/PATCH/PUT/DELETE) olinadi. Natija o'zgarmay qaytariladi (xato qayta otiladi).
     */
    kuzat: async <T,>(ish: () => Promise<T>): Promise<T> => {
      const belgi = xatoBelgisi();
      try {
        const natija = await ish();
        if (natija === false || natija === null || natija === undefined) {
          const tafsilot = belgidanKeyingiXato(belgi, natija === undefined);
          if (tafsilot !== undefined) serverdan(tafsilot);
        }
        return natija;
      } catch (error) {
        serverdan(belgidanKeyingiXato(belgi) ?? (axios.isAxiosError(error) ? error.response?.data : undefined));
        throw error;
      }
    },
  };
}

export type MaydonXatolari = ReturnType<typeof useMaydonXatolari>;
