import { useTranslation } from "react-i18next";
import type { Qaytarish, Sotuv } from "@/types/savdo";
import SotuvlarJadvali from "./SotuvlarJadvali";
import { sotuvHolati } from "./savdoYordamchilari";

type TarixProps = {
  sotuvlar: Sotuv[];
  qaytarishlar: Qaytarish[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
  onQaytarish: (sotuv: Sotuv) => void;
};

export default function Tarix({
  sotuvlar,
  qaytarishlar,
  onSotuvniOchish,
  onQaytarish,
}: TarixProps) {
  const { t } = useTranslation("savdo_kichik");
  const tasdiqlanganlar = sotuvlar.filter(
    (sotuv) => sotuvHolati(sotuv) === "CONFIRMED"
  );

  return (
    <SotuvlarJadvali
      sotuvlar={tasdiqlanganlar}
      onSotuvniOchish={onSotuvniOchish}
      qaytarishlar={qaytarishlar}
      onQaytarish={onQaytarish}
      tarixKorinish
      boshMatn={t("tarix.boshMatn")}
    />
  );
}
