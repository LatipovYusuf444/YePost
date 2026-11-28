package uz.yepost.app;

import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Veb ilova Android WebView ichida qila olmaydigan ishlar:
 * - window.print() — Android chop etish oynasi (Wi-Fi/Bluetooth printer xizmatlari yoki "PDF sifatida saqlash");
 * - blob: fayllar (chek/nakladnoy PDF, Excel/CSV eksport) — Yuklanmalar papkasiga saqlash yoki boshqa ilovada ochish;
 * - tashqi havolalar — tizim brauzerida.
 */
@CapacitorPlugin(name = "YePostNative")
public class YePostNativePlugin extends Plugin {

    private static final String YUKLANMALAR_PAPKASI = "Aisa";

    // WebView chop etish adapteri ish tugaguncha WebView'ga havola saqlanishi kerak (Android hujjatlari).
    private WebView chopWebView;

    @PluginMethod
    public void sahifaniChopEtish(PluginCall call) {
        String nom = call.getString("nom", "Aisa");
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                printManager().print(nom, webView.createPrintDocumentAdapter(nom), new PrintAttributes.Builder().build());
                call.resolve();
            } catch (Exception e) {
                call.reject("Chop etib bo'lmadi: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void htmlniChopEtish(PluginCall call) {
        String html = call.getString("html");
        String nom = call.getString("nom", "Aisa");
        if (html == null) {
            call.reject("html yo'q");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = new WebView(getActivity());
                // Chop etiladigan HTML ichidagi skriptlar (window.print chaqiruvi va h.k.) ishlamaydi — faqat ko'rinish.
                webView.getSettings().setJavaScriptEnabled(false);
                webView.setWebViewClient(
                    new WebViewClient() {
                        private boolean yuborildi = false;

                        @Override
                        public void onPageFinished(WebView view, String url) {
                            if (yuborildi) return;
                            yuborildi = true;
                            printManager().print(nom, view.createPrintDocumentAdapter(nom), new PrintAttributes.Builder().build());
                        }
                    }
                );
                chopWebView = webView;
                webView.loadDataWithBaseURL("https://ye-post.vercel.app/", html, "text/html", "UTF-8", null);
                call.resolve();
            } catch (Exception e) {
                call.reject("Chop etib bo'lmadi: " + e.getMessage());
            }
        });
    }

    /** PDF (chek, nakladnoy, yorliq) ni Android chop etish oynasida ko'rsatadi: sahifalar ko'rinadi, printer yoki PDF tanlanadi. */
    @PluginMethod
    public void pdfniChopEtish(PluginCall call) {
        try {
            File fayl = keshgaYozish(call);
            String nom = call.getString("nom", fayl.getName());
            getActivity().runOnUiThread(() -> {
                try {
                    printManager().print(nom, new PdfFaylAdapteri(fayl, nom), new PrintAttributes.Builder().build());
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Chop etib bo'lmadi: " + e.getMessage());
                }
            });
        } catch (Exception e) {
            call.reject("Faylni tayyorlab bo'lmadi: " + e.getMessage());
        }
    }

    /**
     * Faylni telefondagi mos ilovada ochadi (PDF ko'ruvchi, Excel va h.k.).
     * Mos ilova bo'lmasa: PDF — chop etish oynasida ko'rsatiladi, boshqa fayl — "Ulashish" oynasi.
     */
    @PluginMethod
    public void faylniOchish(PluginCall call) {
        try {
            File fayl = keshgaYozish(call);
            String mime = mimeTuri(call);
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", fayl);
            JSObject natija = new JSObject();
            if (korishgaOchish(uri, mime)) {
                natija.put("usul", "ochildi");
                call.resolve(natija);
                return;
            }
            if (mime.contains("pdf")) {
                String nom = call.getString("nom", fayl.getName());
                getActivity().runOnUiThread(() -> printManager().print(nom, new PdfFaylAdapteri(fayl, nom), new PrintAttributes.Builder().build()));
                natija.put("usul", "chop");
                call.resolve(natija);
                return;
            }
            ulashish(uri, mime);
            natija.put("usul", "ulashish");
            call.resolve(natija);
        } catch (Exception e) {
            call.reject("Faylni ochib bo'lmadi: " + e.getMessage());
        }
    }

    /** Faylni telefonning "Download/Aisa" papkasiga saqlaydi (fayl menejerida ko'rinadi). */
    @PluginMethod
    public void faylniSaqlash(PluginCall call) {
        String nom = xavfsizNom(call.getString("nom", "fayl"));
        String mime = mimeTuri(call);
        String base64 = call.getString("base64");
        if (base64 == null) {
            call.reject("Fayl bo'sh");
            return;
        }
        try {
            byte[] baytlar = Base64.decode(base64, Base64.DEFAULT);
            Uri uri;
            String joy;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues qiymatlar = new ContentValues();
                qiymatlar.put(MediaStore.Downloads.DISPLAY_NAME, nom);
                qiymatlar.put(MediaStore.Downloads.MIME_TYPE, mime);
                qiymatlar.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + YUKLANMALAR_PAPKASI);
                qiymatlar.put(MediaStore.Downloads.IS_PENDING, 1);
                uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, qiymatlar);
                if (uri == null) throw new IOException("MediaStore yozuvi yaratilmadi");
                try (OutputStream chiqish = resolver.openOutputStream(uri)) {
                    if (chiqish == null) throw new IOException("Faylga yozib bo'lmadi");
                    chiqish.write(baytlar);
                }
                qiymatlar.clear();
                qiymatlar.put(MediaStore.Downloads.IS_PENDING, 0);
                resolver.update(uri, qiymatlar, null, null);
                joy = Environment.DIRECTORY_DOWNLOADS + "/" + YUKLANMALAR_PAPKASI + "/" + nom;
            } else {
                // Android 9 va eskilarida ruxsatsiz yoziladigan joy: ilovaning o'z Download papkasi.
                File papka = new File(getContext().getExternalFilesDir(null), "Download");
                if (!papka.exists() && !papka.mkdirs()) throw new IOException("Papka yaratilmadi");
                File fayl = new File(papka, nom);
                try (FileOutputStream chiqish = new FileOutputStream(fayl)) {
                    chiqish.write(baytlar);
                }
                uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", fayl);
                joy = fayl.getAbsolutePath();
            }
            JSObject natija = new JSObject();
            natija.put("uri", uri.toString());
            natija.put("joy", joy);
            call.resolve(natija);
        } catch (Exception e) {
            call.reject("Faylni saqlab bo'lmadi: " + e.getMessage());
        }
    }

    /** faylniSaqlash qaytargan uri bo'yicha faylni ochadi. */
    @PluginMethod
    public void saqlanganniOchish(PluginCall call) {
        String uriMatni = call.getString("uri");
        if (uriMatni == null) {
            call.reject("uri yo'q");
            return;
        }
        Uri uri = Uri.parse(uriMatni);
        String mime = mimeTuri(call);
        if (korishgaOchish(uri, mime)) {
            call.resolve();
            return;
        }
        try {
            ulashish(uri, mime);
            call.resolve();
        } catch (Exception e) {
            call.reject("Faylni ochadigan ilova topilmadi");
        }
    }

    @PluginMethod
    public void tashqiHavola(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://") || url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("tg:"))) {
            call.reject("Havola noto'g'ri");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("Havolani ochadigan ilova topilmadi");
        }
    }

    // ---------- yordamchilar ----------

    private PrintManager printManager() {
        return (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
    }

    private boolean korishgaOchish(Uri uri, String mime) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, mime);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    private void ulashish(Uri uri, String mime) {
        Intent yuborish = new Intent(Intent.ACTION_SEND);
        yuborish.setType(mime);
        yuborish.putExtra(Intent.EXTRA_STREAM, uri);
        yuborish.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent tanlov = Intent.createChooser(yuborish, null);
        tanlov.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(tanlov);
    }

    private File keshgaYozish(PluginCall call) throws IOException {
        String base64 = call.getString("base64");
        if (base64 == null) throw new IOException("Fayl bo'sh");
        File papka = new File(getContext().getCacheDir(), "fayllar");
        if (!papka.exists() && !papka.mkdirs()) throw new IOException("Papka yaratilmadi");
        File fayl = new File(papka, xavfsizNom(call.getString("nom", "fayl")));
        try (FileOutputStream chiqish = new FileOutputStream(fayl)) {
            chiqish.write(Base64.decode(base64, Base64.DEFAULT));
        }
        return fayl;
    }

    private static String mimeTuri(PluginCall call) {
        String mime = call.getString("mime");
        return mime == null || mime.isEmpty() ? "application/octet-stream" : mime;
    }

    private static String xavfsizNom(String nom) {
        String toza = nom.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_").trim();
        if (toza.isEmpty() || toza.equals(".") || toza.equals("..")) return "fayl";
        return toza.length() > 120 ? toza.substring(toza.length() - 120) : toza;
    }

    /** Tayyor PDF faylni Android chop etish tizimiga beradi (ko'rib chiqish + printer/PDF tanlash). */
    private static class PdfFaylAdapteri extends PrintDocumentAdapter {

        private final File fayl;
        private final String nom;

        PdfFaylAdapteri(File fayl, String nom) {
            this.fayl = fayl;
            this.nom = nom;
        }

        @Override
        public void onLayout(
            PrintAttributes eski,
            PrintAttributes yangi,
            CancellationSignal bekor,
            LayoutResultCallback natija,
            Bundle qoshimcha
        ) {
            if (bekor.isCanceled()) {
                natija.onLayoutCancelled();
                return;
            }
            natija.onLayoutFinished(
                new PrintDocumentInfo.Builder(nom).setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT).build(),
                true
            );
        }

        @Override
        public void onWrite(PageRange[] sahifalar, ParcelFileDescriptor manzil, CancellationSignal bekor, WriteResultCallback natija) {
            try (InputStream kirish = new FileInputStream(fayl); OutputStream chiqish = new FileOutputStream(manzil.getFileDescriptor())) {
                byte[] bufer = new byte[16 * 1024];
                int n;
                while ((n = kirish.read(bufer)) > 0) {
                    if (bekor.isCanceled()) {
                        natija.onWriteCancelled();
                        return;
                    }
                    chiqish.write(bufer, 0, n);
                }
                natija.onWriteFinished(new PageRange[] { PageRange.ALL_PAGES });
            } catch (IOException e) {
                natija.onWriteFailed(e.getMessage());
            }
        }
    }
}
