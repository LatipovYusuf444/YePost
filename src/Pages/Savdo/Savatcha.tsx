import type { Sotuv } from "@/types/savdo";
import SotuvlarJadvali from "./SotuvlarJadvali";
import { sotuvHolati } from "./savdoYordamchilari";

type SavatchaProps = {
  sotuvlar: Sotuv[];
  onSotuvniOchish: (sotuv: Sotuv) => void;
};

export default function Savatcha({ sotuvlar, onSotuvniOchish }: SavatchaProps) {
  const qoralamalar = sotuvlar.filter((sotuv) => sotuvHolati(sotuv) === "DRAFT");

  return (
    <SotuvlarJadvali
      sotuvlar={qoralamalar}
      onSotuvniOchish={onSotuvniOchish}
      boshMatn="Qoralama sotuvlar mavjud emas"
    />
  );
}
