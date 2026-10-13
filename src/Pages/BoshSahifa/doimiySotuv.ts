import type { NomliMalumot, Sotuv } from "@/types/savdo";

/** POST qaytargan haqiqiy sotuvga faqat ekranda mavjud nomlarni qo'shadi; hisob/status o'zgarmaydi. */
export function doimiySotuvniModalgaTayyorlash(sotuv: Sotuv, context: {
  mijozlar: NomliMalumot[];
  omborlar: NomliMalumot[];
  xodimlar: NomliMalumot[];
  cart: Array<{ modificationId: string; nom: string }>;
}): Sotuv {
  return {
    ...sotuv,
    customer: sotuv.customer ?? context.mijozlar.find((item) => item.id === sotuv.customerId),
    warehouse: sotuv.warehouse ?? context.omborlar.find((item) => item.id === sotuv.warehouseId),
    responsible: sotuv.responsible ?? context.xodimlar.find((item) => item.id === sotuv.responsibleId),
    items: sotuv.items?.map((item) => {
      const mahsulot = context.cart.find((row) => row.modificationId === item.modificationId);
      if (!mahsulot || item.modification?.product?.name || item.modification?.name) return item;
      return { ...item, modification: { ...item.modification, id: item.modificationId, name: mahsulot.nom } };
    }),
  };
}
