package com.heartverse.yuki;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

public class MainActivity extends Activity {
  /** The app is served from this origin, intercepted into assets/www. */
  private static final String HOST = "yuki.local";
  private static final String START_URL = "https://" + HOST + "/index.html";
  private static final String CHANNEL = "yuki";

  private WebView web;
  private ApiBridge api;
  private TextToSpeech tts;
  private String pendingSpeech;
  private boolean ttsReady;

  @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);
    getWindow().setStatusBarColor(Color.parseColor("#140b16"));
    getWindow().setNavigationBarColor(Color.parseColor("#140b16"));

    web = new WebView(this);
    web.setBackgroundColor(Color.parseColor("#140b16"));
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setDatabaseEnabled(true);
    s.setAllowFileAccess(false);
    s.setAllowContentAccess(false);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setSupportMultipleWindows(false);
    s.setJavaScriptCanOpenWindowsAutomatically(false);
    s.setCacheMode(WebSettings.LOAD_DEFAULT);
    s.setTextZoom(100);

    web.setWebViewClient(new AssetClient());
    api = new ApiBridge(web);
    web.addJavascriptInterface(new Bridge(), "__yuki");

    initTts();

    setContentView(web);
    web.loadUrl(START_URL);
  }

  /* ------------------------------------------------------------- assets */

  private final class AssetClient extends WebViewClient {
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
      Uri uri = request.getUrl();
      if (uri == null || !HOST.equals(uri.getHost())) return null;
      return asset(uri.getPath() == null ? "/" : uri.getPath());
    }

    @SuppressWarnings("deprecation")
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
      try {
        Uri uri = Uri.parse(url);
        if (!HOST.equals(uri.getHost())) return null;
        return asset(uri.getPath() == null ? "/" : uri.getPath());
      } catch (Exception e) {
        return null;
      }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
      Uri uri = request.getUrl();
      if (uri != null && HOST.equals(uri.getHost())) return false;
      openOutside(uri);
      return true;
    }

    @SuppressWarnings("deprecation")
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
      Uri uri = Uri.parse(url);
      if (uri != null && HOST.equals(uri.getHost())) return false;
      openOutside(uri);
      return true;
    }
  }

  private void openOutside(Uri uri) {
    if (uri == null) return;
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, uri));
    } catch (Exception ignored) {
      /* no browser */
    }
  }

  private WebResourceResponse asset(String path) {
    String clean = path;
    if (clean.isEmpty() || "/".equals(clean)) clean = "/index.html";

    // API calls go through the native bridge, never the network.
    if (clean.startsWith("/api/")) {
      return new WebResourceResponse(
          "application/json", "utf-8",
          new ByteArrayInputStream("{\"error\":\"use_bridge\"}".getBytes()));
    }

    try {
      InputStream in = getAssets().open("www" + clean);
      return new WebResourceResponse(mime(clean), "utf-8", in);
    } catch (IOException missing) {
      if (!clean.contains(".")) {
        try {
          return new WebResourceResponse("text/html", "utf-8", getAssets().open("www/index.html"));
        } catch (IOException ignored) {
          /* fall through */
        }
      }
      return new WebResourceResponse(
          "text/plain", "utf-8",
          new ByteArrayInputStream("Not found".getBytes()));
    }
  }

  private String mime(String path) {
    String p = path.toLowerCase(Locale.US);
    if (p.endsWith(".html")) return "text/html";
    if (p.endsWith(".js")) return "text/javascript";
    if (p.endsWith(".css")) return "text/css";
    if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
    if (p.endsWith(".png")) return "image/png";
    if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
    if (p.endsWith(".webp")) return "image/webp";
    if (p.endsWith(".svg")) return "image/svg+xml";
    if (p.endsWith(".ico")) return "image/x-icon";
    if (p.endsWith(".woff2")) return "font/woff2";
    return "application/octet-stream";
  }

  /* ------------------------------------------------------------- bridge */

  private final class Bridge {
    @JavascriptInterface
    public void http(String id, String method, String path, String headers, String body) {
      api.http(id, method, path, headers, body);
    }

    @JavascriptInterface
    public void speak(String text, float rate, float pitch) {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          speakNow(text, rate, pitch);
        }
      });
    }

    @JavascriptInterface
    public void stopSpeak() {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          pendingSpeech = null;
          if (tts != null) tts.stop();
        }
      });
    }

    @JavascriptInterface
    public void toast(final String text) {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          Toast.makeText(MainActivity.this, text, Toast.LENGTH_SHORT).show();
        }
      });
    }

    @JavascriptInterface
    public void notify(String title, String body) {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          pushNotification(title, body);
        }
      });
    }

    @JavascriptInterface
    public void requestNotify() {
      runOnUiThread(new Runnable() {
        @Override
        public void run() {
          askNotificationPermission();
        }
      });
    }
  }

  /* ---------------------------------------------------------------- tts */

  private void initTts() {
    tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
      @Override
      public void onInit(int status) {
        if (status != TextToSpeech.SUCCESS) return;
        ttsReady = true;
        tts.setLanguage(Locale.US);
        tts.setPitch(1.22f);
        tts.setSpeechRate(1.0f);
        String queued = pendingSpeech;
        pendingSpeech = null;
        if (queued != null) speakNow(queued, 1f, 1.22f);
      }
    });
    tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
      @Override
      public void onStart(String utteranceId) {
      }

      @Override
      public void onDone(String utteranceId) {
        runOnUiThread(new Runnable() {
          @Override
          public void run() {
            web.evaluateJavascript("window.__yukiSpeakEnd&&window.__yukiSpeakEnd()", null);
          }
        });
      }

      @Override
      public void onError(String utteranceId) {
        onDone(utteranceId);
      }
    });
  }

  private void speakNow(String text, float rate, float pitch) {
    if (text == null || text.isEmpty()) return;
    if (!ttsReady) {
      pendingSpeech = text;
      return;
    }
    tts.setSpeechRate(rate > 0 ? rate : 1f);
    tts.setPitch(pitch > 0 ? pitch : 1.22f);
    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "yuki");
  }

  /* -------------------------------------------------------- notifications */

  private void askNotificationPermission() {
    if (Build.VERSION.SDK_INT >= 33
        && checkSelfPermission("android.permission.POST_NOTIFICATIONS") != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"}, 7);
    }
  }

  @SuppressLint("NotificationPermission")
  private void pushNotification(String title, String body) {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (nm == null) return;

    if (Build.VERSION.SDK_INT >= 26) {
      if (nm.getNotificationChannel(CHANNEL) == null) {
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Yuki", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Messages from Yuki");
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
      }
    }

    PendingIntent open = PendingIntent.getActivity(
        this, 0, new Intent(this, MainActivity.class),
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Notification.Builder b = Build.VERSION.SDK_INT >= 26
        ? new Notification.Builder(this, CHANNEL)
        : new Notification.Builder(this);
    b.setSmallIcon(android.R.drawable.stat_notify_chat)
        .setContentTitle(title == null ? "Yuki" : title)
        .setContentText(body == null ? "" : body)
        .setStyle(new Notification.BigTextStyle().bigText(body == null ? "" : body))
        .setAutoCancel(true)
        .setContentIntent(open);

    try {
      nm.notify(1001, b.build());
    } catch (Exception ignored) {
      /* notifications blocked */
    }
  }

  /* --------------------------------------------------------------- back */

  @Override
  public void onBackPressed() {
    web.evaluateJavascript("window.__yukiBack?window.__yukiBack():false", new android.webkit.ValueCallback<String>() {
      @Override
      public void onReceiveValue(String value) {
        if (value == null || "false".equals(value) || "null".equals(value)) {
          finish();
        }
      }
    });
  }

  @Override
  protected void onDestroy() {
    if (tts != null) {
      tts.stop();
      tts.shutdown();
    }
    View v = web;
    if (v != null) {
      web.destroy();
    }
    super.onDestroy();
  }
}
