import type { HisobKitobHujjati } from "./types";

export function ochilaganHujjatmi(hujjat: HisobKitobHujjati) {
  return hujjat.turi === "realizatsiya" || hujjat.turi === "xarid";
}
