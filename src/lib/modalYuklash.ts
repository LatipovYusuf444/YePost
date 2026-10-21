type YuklashHodisalari<T> = {
  boshlash: () => void;
  natija: (value: T | null) => void;
  xato: (error: unknown) => void;
  yakun: () => void;
};

// Faqat eng oxirgi ochish so'rovi oynani yangilaydi. Bekor qilish serverdagi ma'lumotga tegmaydi.
export function modalYuklagichYaratish<T>(hodisalar: YuklashHodisalari<T>) {
  let sorov = 0;
  return {
    async yuklash(olish: () => Promise<T | null>): Promise<T | null> {
      const joriy = ++sorov;
      hodisalar.boshlash();
      try {
        const value = await olish();
        if (joriy !== sorov) return null;
        hodisalar.natija(value);
        return value;
      } catch (error) {
        if (joriy === sorov) hodisalar.xato(error);
        return null;
      } finally {
        if (joriy === sorov) hodisalar.yakun();
      }
    },
    bekorQilish() { sorov += 1; },
  };
}
