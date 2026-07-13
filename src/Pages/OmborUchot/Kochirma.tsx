import HujjatlarRoyxati from "./HujjatlarRoyxati";
import { boshlangichHujjatlar } from "./mockData";

export default function Kochirma() {
  return (
    <HujjatlarRoyxati
      prefiks="KOC"
      sarlavha="Ko'chirma"
      tavsif="Omborlar orasida tovar ko'chirish hujjatlari."
      kontragentYorligi="Sabab / izoh"
      omborYorligi="Qayerdan"
      ikkinchiOmborYorligi="Qayerga"
      boshlangichRoyxat={boshlangichHujjatlar.kochirma}
    />
  );
}
