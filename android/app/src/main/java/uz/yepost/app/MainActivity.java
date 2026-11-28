package uz.yepost.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Ilovaning o'z plaginlari bridge yaratilishidan OLDIN ro'yxatdan o'tadi.
        registerPlugin(YePostNativePlugin.class);
        super.onCreate(savedInstanceState);
        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) return;
        WebView webView = bridge.getWebView();
        // Telefon sozlamalaridagi katta shrift veb jadval/tugmalar joylashuvini buzmasin: dizayn vebdagi o'lchamda qoladi.
        webView.getSettings().setTextZoom(100);
        // "Internet yo'q" sahifasi (android-shell/ilova-oflayn.html) Capacitor ko'prigisiz ham ilovani qayta ocha olsin.
        webView.addJavascriptInterface(new Qobiq(bridge), "YePostQobiq");
        // "Internet yo'q" sahifasida veb ilovaning "Orqaga" ishlovchisi yo'q (sahifa almashganda Capacitor tinglovchilarni tozalaydi):
        // bu yerda "Orqaga" ilovani fonga yuboradi. Boshqa sahifalarda boshqaruv odatdagidek @capacitor/app va veb kodga o'tadi.
        // Plaginlar super.onCreate ichida ro'yxatdan o'tadi; keyin qo'shilgan bu callback birinchi chaqiriladi.
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    String joriy = webView.getUrl();
                    if (joriy != null && joriy.endsWith("/" + OFLAYN_SAHIFA)) {
                        moveTaskToBack(true);
                        return;
                    }
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        );
    }

    private static final String OFLAYN_SAHIFA = "ilova-oflayn.html";

    /** Faqat bitta amal: ilovani sozlangan manzildan (capacitor.config.ts -> server.url) qayta ochish. Ma'lumot qaytarmaydi. */
    private static final class Qobiq {

        private final Bridge bridge;

        Qobiq(Bridge bridge) {
            this.bridge = bridge;
        }

        @JavascriptInterface
        public void qaytaYuklash() {
            String manzil = bridge.getServerUrl();
            if (manzil == null || manzil.isEmpty()) manzil = bridge.getAppUrl();
            final String ochiladigan = manzil;
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(ochiladigan));
        }
    }
}
