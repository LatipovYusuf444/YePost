import type { CapacitorConfig } from "@capacitor/cli";

// Android ilovasi (Capacitor). Batafsil: docs/android/README.md
//
// Ilova sahifani APK ichidan EMAS, to'g'ridan-to'g'ri vebdan (https://ye-post.vercel.app) ochadi:
// `main` ga push -> Vercel deploy -> telefonlarda keyingi ochilishda (yoki "Yangilash" tugmasi bilan) yangi versiya.
// APK faqat Android qismi (plagin, ikonka, ruxsatlar, shu fayl) o'zgarganda qayta yig'iladi.
// Backend CORS shu domenga ruxsat bergan — API so'rovlari vebdagidek ishlaydi.
//
// YEPOST_ILOVA_URL — faqat dasturchi sinovi uchun (masalan, `vite preview`): http://localhost:4173.
const ILOVA_URL = process.env.YEPOST_ILOVA_URL || "https://ye-post.vercel.app";

const config: CapacitorConfig = {
  // Paket identifikatori va imzolash kaliti O'ZGARMAYDI: aks holda o'rnatilgan ilovani yangilab bo'lmaydi (Play Market ham shu paketni yangilaydi).
  appId: "uz.yepost.app",
  appName: "Aisa",
  // APK ichida faqat kichik "qobiq": internet yo'q paytdagi sahifa (ilova-oflayn.html). Asosiy ilova vebdan keladi.
  webDir: "android-shell",
  // index.html boshidagi skript ilovani tanisin (viewport), backend loglarida Android so'rovlari ko'rinsin.
  appendUserAgent: "YePostAndroid",
  server: {
    url: ILOVA_URL,
    hostname: new URL(ILOVA_URL).hostname,
    androidScheme: "https",
    // Sayt ochilmasa (internet yo'q, server javob bermadi) APK ichidagi sahifa ko'rsatiladi: "Qayta urinish" + aloqa tiklanganda avtomatik.
    errorPath: "ilova-oflayn.html",
  },
  android: {
    // Faqat HTTPS: aralash (http) kontent va cleartext yopiq.
    allowMixedContent: false,
    captureInput: false,
    // webContentsDebuggingEnabled berilmagan: debug APK da chrome://inspect ishlaydi, release APK da o'chiq (Capacitor standarti).
  },
  plugins: {
    SystemBars: {
      // Veb sahifa tizim panellari (soat/batareya va pastki navigatsiya) orasiga joylanadi — chetlarda tugma yashirinib qolmaydi.
      insetsHandling: "native",
      initialViewportFitValueHint: "contain",
      style: "LIGHT",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#245CC8",
      showSpinner: false,
      androidScaleType: "CENTER_INSIDE",
    },
  },
};

export default config;
