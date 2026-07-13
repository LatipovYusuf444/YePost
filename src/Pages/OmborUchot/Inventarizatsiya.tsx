import HujjatlarRoyxati from "./HujjatlarRoyxati";
import { boshlangichHujjatlar } from "./mockData";

export default function Inventarizatsiya() {
  return (
    <HujjatlarRoyxati
      prefiks="INV"
      sarlavha="Inventarizatsiya"
      tavsif="Ombordagi haqiqiy qoldiqlarni tekshirish hujjatlari."
      kontragentYorligi="Sabab"
      omborYorligi="Ombor"
      boshlangichRoyxat={boshlangichHujjatlar.inventarizatsiya}
    />
  );
}
