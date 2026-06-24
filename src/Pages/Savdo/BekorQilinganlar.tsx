import type { Sotuv } from "@/types/savdo";
import SotuvlarJadvali from "./SotuvlarJadvali";
import { sotuvHolati } from "./savdoYordamchilari";

type BekorQilinganlarProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
};

export default function BekorQilinganlar({
  sotuvlar,
  onSotuvniOchish,
}: BekorQilinganlarProps) {
  const bekorQilinganlar = sotuvlar.filter(
    (sotuv) => sotuvHolati(sotuv) === "CANCELLED"
  );

  return (
    <SotuvlarJadvali
      sotuvlar={bekorQilinganlar}
      onSotuvniOchish={onSotuvniOchish}
      boshMatn="Bekor qilingan sotuvlar mavjud emas"
    />
  );
}
