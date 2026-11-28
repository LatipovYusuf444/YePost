import { registerPlugin } from "@capacitor/core";

/** android/app/src/main/java/uz/yepost/app/YePostNativePlugin.java bilan bir xil nomlar. */
export interface YePostNativePlugin {
  sahifaniChopEtish(opts: { nom?: string }): Promise<void>;
  htmlniChopEtish(opts: { html: string; nom?: string }): Promise<void>;
  pdfniChopEtish(opts: { base64: string; nom: string }): Promise<void>;
  faylniOchish(opts: { base64: string; nom: string; mime: string }): Promise<{ usul: "ochildi" | "chop" | "ulashish" }>;
  faylniSaqlash(opts: { base64: string; nom: string; mime: string }): Promise<{ uri: string; joy: string }>;
  saqlanganniOchish(opts: { uri: string; mime: string }): Promise<void>;
  tashqiHavola(opts: { url: string }): Promise<void>;
}

export const YePostNative = registerPlugin<YePostNativePlugin>("YePostNative");
