# Aisa (YePost) — Android ilovasi

Android ilovasi (**Capacitor 8**) sahifani APK ichidan emas, to'g'ridan-to'g'ri **vebdan** ochadi: `https://ye-post.vercel.app`.
Ma'lumotlar vebdagi bilan bir xil backenddan keladi (`https://pos.169-58-167-219.sslip.io/api/v1`): akkauntlar, rollar, baza umumiy.

## Yangilanish qanday ishlaydi

| O'zgarish | Nima qilish kerak | Telefonda qachon ko'rinadi |
|---|---|---|
| Veb kod (`src/`, sahifalar, tugmalar, dizayn) | `main` ga push → Vercel deploy | Ilova keyingi ochilganda. Ilova ochiq tursa — fondan qaytganda / har 10 daqiqada "Ilovaning yangi versiyasi tayyor → **Yangilash**" chiqadi (ochiq sotuv yo'qolmasligi uchun o'zi qayta yuklanmaydi) |
| Backend (server, baza, API) | backend deploy | Darhol |
| Android qismi: `android/`, `android-shell/`, `capacitor.config.ts`, ikonka, ruxsatlar, yangi native plagin | **yangi APK** (pastga qarang) | Xodimlar yangi APK ni o'rnatganda |

Muhim: `src/native/` (chop etish, fayl yuklash/ochish, "Orqaga" tugmasi, yangilanish xabari) **veb build ichida** keladi —
u vebga deploy qilinmaguncha ilovada ishlamaydi. Vebda bu kod hech narsa qilmaydi (`Capacitor.isNativePlatform()` false).

| Narsa | Qiymat | O'zgartirish mumkinmi |
|---|---|---|
| Ilova nomi | **Aisa** (`android/app/src/main/res/values/strings.xml`) | ha |
| Paket identifikatori | **`uz.yepost.app`** | **YO'Q** — o'zgarsa telefon buni boshqa ilova deb biladi, yangilanmaydi |
| Imzolash kaliti | `%USERPROFILE%\.yepost-signing\yepost-release.jks`, alias `yepost` | **YO'Q** — yo'qolsa ilovani yangilab bo'lmaydi |
| Ochiladigan sayt | `capacitor.config.ts` → `server.url` | domen o'zgarsa — yangi APK |
| Versiya | `android/version.properties` | har yangi APK da oshiriladi |
| Minimal Android | 7.0 (API 24), target API 36 | |

## Kerakli dasturlar (yig'uvchi kompyuterda)

- Node.js + `npm install`
- **JDK 21** (Capacitor 8 talabi). Bu kompyuterda: `D:\Android\jdk-21` (JDK 17 boshqa loyihalar uchun qoldirilgan).
- Android SDK (`ANDROID_HOME=D:\Android\Sdk`), platforma 36 va build-tools.

## APK yig'ish (faqat Android qismi o'zgarganda)

```powershell
$env:JAVA_HOME = "D:\Android\jdk-21"
npm run android:apk:release     # imzolangan release:  android\app\build\outputs\apk\release\YePost-<versiya>-release.apk
npm run android:apk:debug       # sinov uchun debug:  android\app\build\outputs\apk\debug\YePost-<versiya>-debug.apk
```

Veb build kerak emas: APK ichida faqat `android-shell/` (internet yo'q sahifasi) bor. Debug APK boshqa (debug) kalit bilan
imzolanadi — u release ustiga o'rnatilmaydi, xodimlarga faqat release beriladi.

1. `android/version.properties`: `VERSION_CODE` ni **+1** (2 → 3 → 4 ...), `VERSION_NAME` ni oshiring (1.1.0 → 1.1.1 tuzatish, 1.2.0 yangi imkoniyat).
   `VERSION_CODE` oldingisidan katta bo'lmasa telefon yangilanishni rad etadi.
2. `npm run android:apk:release`.
3. Tekshirish:
   ```powershell
   D:\Android\Sdk\build-tools\37.0.0\apksigner.bat verify --print-certs android\app\build\outputs\apk\release\YePost-1.1.1-release.apk
   D:\Android\Sdk\build-tools\37.0.0\aapt2.exe dump badging android\app\build\outputs\apk\release\YePost-1.1.1-release.apk | findstr package
   ```
   Sertifikat SHA-256 doim bir xil bo'lishi kerak: `d9:45:c5:6c:8a:8e:85:a6:53:98:5e:c5:3b:d5:07:58:b8:99:3f:bd:30:2a:83:42:72:58:44:ff:28:60:e8:61`.
4. Faylni xodimlarga yuboring — eski ilova ustiga yangilanish sifatida o'rnatiladi, kirish sessiyasi saqlanadi.

### Dasturchi sinovi (deploy qilmasdan)

```powershell
npx vite build; npx vite preview --port 4173 --strictPort      # mahalliy veb (backend Vite proksi orqali)
$env:YEPOST_ILOVA_URL = "http://localhost:4173"; npm run android:apk:debug
adb reverse tcp:4173 tcp:4173; adb install -r android\app\build\outputs\apk\debug\YePost-<versiya>-debug.apk
Remove-Item Env:YEPOST_ILOVA_URL; npx cap sync android          # keyin albatta asl manzilga qaytaring!
```

`http://localhost` faqat debug APK da ruxsat etilgan (`android/app/src/debug/res/xml/network_security_config.xml`);
release faqat HTTPS. Release yig'ishdan oldin `android\app\src\main\assets\capacitor.config.json` da `"url": "https://ye-post.vercel.app"` ekanini tekshiring.

## Imzolash kaliti

- Kalit: `%USERPROFILE%\.yepost-signing\yepost-release.jks` (PKCS12, RSA 4096, 2059-yilgacha amal qiladi).
- Parollar: shu papkadagi `keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`). Papka faqat shu Windows
  foydalanuvchisiga ochiq. Git'ga tushmaydi (`.gitignore`: `*.jks`, `*.keystore`, `keystore.properties`), APK ichiga ham kirmaydi.
- Boshqa kompyuterda yig'ish: papkani xavfsiz nusxalang yoki `YEPOST_KEYSTORE_PROPERTIES=<yo'l>` muhit o'zgaruvchisi bilan
  `keystore.properties` joyini ko'rsating. Kalit topilmasa release yig'ish aniq xato bilan to'xtaydi (imzosiz APK chiqmaydi).
- **Zaxira nusxa shart**: `yepost-release.jks` + `keystore.properties` ni parollar menejeri / shifrlangan flesh / seyfga saqlang.
  Kalit yo'qolsa, o'rnatilgan ilovalarni yangilab bo'lmaydi — hamma qayta o'chirib-o'rnatishi kerak bo'ladi.

## Keyinroq Google Play

Telefonlardagi APK ni Play Market yangilay olishi uchun **o'sha paket (`uz.yepost.app`) va o'sha ilova imzolash kaliti** kerak:

1. Play Console'da ilova yaratib, **Play App Signing** sahifasida *"Use existing app signing key from Java keystore"* (o'z kalitingizni
   yuklash) ni tanlang va Google bergan PEPK vositasi bilan `yepost-release.jks` (alias `yepost`) ni shifrlangan holda yuklang.
   Google yangi kalit yaratishini **tanlamang** — aks holda Play versiyasi sideload qilingan APK ustiga o'rnatilmaydi.
2. Upload uchun alohida *upload key* yaratish mumkin (tavsiya etiladi); ilova imzosi baribir yuqoridagi kalit bo'lib qoladi.
3. Play'ga `.aab` yuklanadi: `cd android; .\gradlew.bat bundleRelease` (`versionCode` APK dagidan katta bo'lsin).
4. Play talablari: maxfiylik siyosati havolasi, ma'lumotlar xavfsizligi anketasi. Faqat saytni ochadigan ilovalarga Play qattiqroq
   qaraydi — ilovadagi native imkoniyatlar (chop etish, fayllar, internet yo'q sahifasi) buni yengillashtiradi.

## Android'ga xos qatlam

- `capacitor.config.ts` — `server.url`: ochiladigan sayt; `errorPath`: sayt ochilmasa APK ichidagi `android-shell/ilova-oflayn.html`
  ("Internet aloqasi yo'q", aloqa tiklanganda yoki "Qayta urinish" bilan ilova qayta ochiladi).
- Backend CORS faqat `https://ye-post.vercel.app` ga ruxsat beradi — ilova aynan shu domendan ochilgani uchun so'rovlar vebdagidek ishlaydi.
  Domen o'zgarsa: backend CORS + `capacitor.config.ts` + yangi APK.
- `src/native/` — faqat ilovada yuklanadi:
  - `fayllar.ts`: `window.print()` → Android chop etish oynasi; `<a download>`/Excel/CSV/PDF eksport → `Download/Aisa` papkasi +
    "Ochish"; `window.open(blob)` (chek, nakladnoy) → telefondagi PDF ko'ruvchi, bo'lmasa chop etish oynasi;
    bo'sh popup oynaga yozilgan HTML (sotuv nakladnoyi) → chop etish; tashqi havolalar → brauzer/Telegram.
  - `orqagaTugmasi.ts`: "Orqaga" — ochiq oyna/ro'yxatni yopadi → oldingi sahifa → bosh sahifada ilovani fonga yuboradi.
  - `yangilanish.ts`: yangi deploy chiqqanini aniqlab, "Yangilash" taklif qiladi.
- `src/Components/common/UlanishBanneri.tsx` — internet uzilganda qizil ogohlantirish (vebda ham).
- `android/.../YePostNativePlugin.java` — chop etish, fayl saqlash/ochish, tashqi havola; `MainActivity.java` — shrift 100%,
  internet yo'q sahifasi uchun `YePostQobiq.qaytaYuklash()`.
- `index.html` — ilovada `viewport-fit=cover` olib tashlanadi: sahifa tizim panellari (soat, pastki navigatsiya) orasida turadi.
- Faqat HTTPS (release), `allowBackup=false` (kirish tokenlari zaxiraga ketmaydi).

## Ikonka va ochilish ekrani

Manba: `public/aisa-favicon.svg` (Aisa belgisi). `mipmap-*` (adaptive + eski) va `drawable*/splash.png` shu SVG dan
yasalgan. Brend o'zgarsa — ikonkalarni qayta yarating (Android Studio → *Image Asset* yoki `npx @capacitor/assets`) va yangi APK.

## Xodimlar uchun o'rnatish yo'riqnomasi

1. `YePost-<versiya>-release.apk` faylini Telegram/WhatsApp/flesh orqali telefonga oling.
2. Faylni bosing (Telegram'da — yuklab olib bosing; yoki **Fayllar → Yuklanmalar**).
3. Telefon *"Xavfsizlik uchun bu manbadan ilova o'rnatish taqiqlangan"* desa: **Sozlamalar** → **"Shu manbaga ruxsat berish"**
   (Allow from this source) ni yoqing → **Orqaga**.
   (Samsung: *Sozlamalar → Ilovalar → Maxsus kirish → Noma'lum ilovalarni o'rnatish → Telegram/Mening fayllarim → Ruxsat*.)
   Ruxsatdan keyin o'rnatish oynasi chiqmasa — APK faylni **yana bir marta bosing**.
4. **O'rnatish** (Install) → **Ochish**. Play Protect ogohlantirsa: *"Baribir o'rnatish"* (More details → Install anyway).
5. Bosh ekranda **Aisa** ikonkasi paydo bo'ladi. Vebdagi login/parol bilan kiring (do'kon kodi kerak bo'lsa — o'sha).
6. Ilova o'zi yangilanadi (internet orqali). Faqat yangi APK yuborilsa — uni xuddi shunday bosib o'rnating,
   **eski ilovani o'chirmang**, ma'lumot va sessiya saqlanadi.
