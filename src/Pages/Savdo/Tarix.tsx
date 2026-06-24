import type { Sotuv } from "@/types/savdo";
import SotuvlarJadvali from "./SotuvlarJadvali";
import { sotuvHolati } from "./savdoYordamchilari";

type TarixProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
};

export default function Tarix({ sotuvlar, onSotuvniOchish }: TarixProps) {
  const tasdiqlanganlar = sotuvlar.filter(
    (sotuv) => sotuvHolati(sotuv) === "CONFIRMED"
  );

  return (
    <SotuvlarJadvali
      sotuvlar={tasdiqlanganlar}
      onSotuvniOchish={onSotuvniOchish}
      boshMatn="Tasdiqlangan sotuvlar mavjud emas"
    />
  );
}
