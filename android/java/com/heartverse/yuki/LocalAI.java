package com.heartverse.yuki;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.StatFs;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Real on-device AI: llama.cpp + a GGUF model, downloaded inside the app.
 *
 * Nothing here touches the Nomi cloud path — this is a second, independent
 * reply engine selected from settings.
 */
public class LocalAI {
  public interface Model {
    String id();

    String name();

    String file();

    String url();

    long size();

    String sha256();

    int context();
  }

  /** Qwen 2.5 1.5B Instruct, 4-bit quant — compact, strong at roleplay. */
  static final class Qwen25 implements Model {
    public String id() { return "qwen2.5-1.5b"; }
    public String name() { return "Qwen 2.5 1.5B Instruct · Q4_K_M"; }
    public String file() { return "qwen2.5-1.5b-instruct-q4_k_m.gguf"; }
    public String url() {
      return "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf";
    }
    public long size() { return 1117320736L; }
    public String sha256() { return "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e"; }
    public int context() { return 2048; }
  }

  static final Model[] MODELS = {new Qwen25()};

  private final Context ctx;
  private final WebView web;
  private long handle;
  private volatile boolean loaded;
  private volatile boolean loading;
  private volatile String error = "";
  private String activeModel = "";
  private final AtomicBoolean downloadCancelled = new AtomicBoolean(false);

  /* llama.cpp entry points (libyuki_llm.so) */
  private native void nativeBind(LocalAI self);

  private native long nativeNew(String path, int nCtx, int nThreads);

  private native void nativeFree(long handle);

  private native void nativeGenerate(long handle, String id, String prompt, int maxTokens, float temp, float topP, float topK);

  private native String nativePrompt(long handle, String system, String history);

  private native void nativeCancel(long handle);

  static {
    System.loadLibrary("yuki_llm");
  }

  public LocalAI(Context ctx, WebView web) {
    this.ctx = ctx;
    this.web = web;
    nativeBind(this);
  }

  private File modelsDir() {
    File dir = new File(ctx.getFilesDir(), "models");
    if (!dir.exists()) dir.mkdirs();
    return dir;
  }

  private File modelFile(Model m) {
    return new File(modelsDir(), m.file());
  }

  /* ---------------------------------------------------------------- status */

  public JSONObject status() {
    JSONObject o = new JSONObject();
    try {
      JSONArray models = new JSONArray();
      for (Model m : MODELS) {
        JSONObject j = new JSONObject();
        j.put("id", m.id());
        j.put("name", m.name());
        j.put("file", m.file());
        j.put("url", m.url());
        j.put("size", m.size());
        j.put("sha256", m.sha256());
        j.put("context", m.context());
        j.put("installed", modelFile(m).exists() && modelFile(m).length() == m.size());
        models.put(j);
      }
      Model first = MODELS[0];
      File f = modelFile(first);
      o.put("supported", true);
      o.put("installed", f.exists() && f.length() == first.size());
      o.put("verified", f.exists() && f.length() == first.size() && error.isEmpty());
      o.put("loading", loading);
      o.put("loaded", loaded);
      o.put("modelId", activeModel);
      o.put("path", f.getAbsolutePath());
      o.put("size", f.exists() ? f.length() : 0);
      o.put("error", error);
      o.put("free", freeBytes());
      o.put("totalRam", totalRam());
      o.put("models", models);
    } catch (Exception ignored) {
      /* never fail the bridge */
    }
    return o;
  }

  private long freeBytes() {
    try {
      StatFs fs = new StatFs(ctx.getFilesDir().getAbsolutePath());
      return fs.getAvailableBytes();
    } catch (Exception e) {
      return 0;
    }
  }

  private long totalRam() {
    try {
      ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
      ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
      am.getMemoryInfo(mi);
      return mi.totalMem;
    } catch (Exception e) {
      return 0;
    }
  }

  private void postStatus() {
    final String js = "window.__yukiLocalStatus&&window.__yukiLocalStatus(" + JSONObject.quote(status().toString()) + ")";
    web.post(new Runnable() {
      @Override
      public void run() {
        web.evaluateJavascript(js, null);
      }
    });
  }

  /* -------------------------------------------------------------- download */

  public void download(final String id) {
    final Model m = find(id);
    if (m == null) return;
    new Thread(new Runnable() {
      @Override
      public void run() {
        downloadModel(m);
      }
    }).start();
  }

  public void cancelDownload() {
    downloadCancelled.set(true);
  }

  private void downloadModel(Model m) {
    downloadCancelled.set(false);
    error = "";
    File target = modelFile(m);
    File part = new File(modelsDir(), m.file() + ".part");
    long size = m.size();
    if (freeBytes() < size + 1536L * 1024 * 1024) {
      error = "not_enough_storage";
      postStatus();
      return;
    }

    for (int attempt = 1; attempt <= 3 && !downloadCancelled.get(); attempt++) {
      long have = part.exists() ? part.length() : 0;
      if (have > size) have = 0;
      try {
        HttpURLConnection c = (HttpURLConnection) new URL(m.url()).openConnection();
        c.setConnectTimeout(20000);
        c.setReadTimeout(30000);
        c.setRequestProperty("User-Agent", "Yuki/1.0");
        if (have > 0) c.setRequestProperty("Range", "bytes=" + have + "-");
        int code = c.getResponseCode();
        long total = size;
        if (code == 206) {
          String cr = c.getHeaderField("Content-Range");
          if (cr != null && cr.contains("/")) {
            try { total = Long.parseLong(cr.substring(cr.lastIndexOf('/') + 1)); } catch (Exception ignored) { }
          }
        } else if (code == 200) {
          have = 0;
          total = c.getContentLengthLong() > 0 ? c.getContentLengthLong() : size;
        } else {
          c.disconnect();
          throw new IOException("http " + code);
        }

        InputStream in = c.getInputStream();
        OutputStream out = new FileOutputStream(part, have > 0);
        byte[] buf = new byte[1 << 16];
        long done = have;
        int n;
        long lastPost = 0;
        while ((n = in.read(buf)) > 0) {
          if (downloadCancelled.get()) {
            out.close();
            in.close();
            c.disconnect();
            error = "download_cancelled";
            postProgress(m.id(), done, total, true);
            postStatus();
            return;
          }
          out.write(buf, 0, n);
          done += n;
          long now = System.currentTimeMillis();
          if (now - lastPost > 250) {
            lastPost = now;
            postProgress(m.id(), done, total, false);
          }
        }
        out.close();
        in.close();
        c.disconnect();

        if (part.length() != size) {
          throw new IOException("size mismatch " + part.length() + " != " + size);
        }
        if (!verify(part, m.sha256())) {
          part.delete();
          error = "checksum_mismatch";
          postProgress(m.id(), part.length(), size, true);
          postStatus();
          return;
        }
        if (target.exists()) target.delete();
        if (!part.renameTo(target)) {
          throw new IOException("rename failed");
        }
        error = "";
        postProgress(m.id(), size, size, true);
        postStatus();
        return;
      } catch (Exception e) {
        error = "download_failed";
        postProgress(m.id(), part.exists() ? part.length() : 0, size, false);
        try {
          Thread.sleep(800L * attempt);
        } catch (InterruptedException ignored) {
          Thread.currentThread().interrupt();
        }
      }
    }
    if (!downloadCancelled.get()) {
      error = "download_failed";
      postProgress(m.id(), part.exists() ? part.length() : 0, size, true);
      postStatus();
    }
  }

  private boolean verify(File f, String expected) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      InputStream in = new FileInputStream(f);
      byte[] buf = new byte[1 << 16];
      int n;
      while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
      in.close();
      StringBuilder sb = new StringBuilder();
      for (byte b : md.digest()) sb.append(String.format("%02x", b));
      return sb.toString().equals(expected);
    } catch (Exception e) {
      return false;
    }
  }

  private void postProgress(String id, long bytes, long total, boolean done) {
    JSONObject o = new JSONObject();
    try {
      o.put("id", id);
      o.put("bytes", bytes);
      o.put("total", total);
      o.put("ok", done && error.isEmpty());
      o.put("done", done);
      o.put("error", error);
    } catch (Exception ignored) {
      return;
    }
    final String js = "window.__yukiLocalProgress&&window.__yukiLocalProgress(" + JSONObject.quote(o.toString()) + ")";
    web.post(new Runnable() {
      @Override
      public void run() {
        web.evaluateJavascript(js, null);
      }
    });
  }

  /* ------------------------------------------------------------ model mgmt */

  public void delete(String id) {
    Model m = find(id);
    if (m == null) return;
    if (loaded && m.id().equals(activeModel)) unload();
    File f = modelFile(m);
    if (f.exists()) f.delete();
    new File(modelsDir(), m.file() + ".part").delete();
    error = "";
    postStatus();
  }

  public void load(final String id) {
    final Model m = find(id);
    if (m == null) return;
    if (loaded && m.id().equals(activeModel)) return;
    File f = modelFile(m);
    if (!f.exists() || f.length() != m.size()) {
      error = "not_installed";
      postStatus();
      return;
    }
    loading = true;
    error = "";
    postStatus();
    new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          unload();
          int threads = Math.max(1, Math.min(4, Runtime.getRuntime().availableProcessors()));
          handle = nativeNew(f.getAbsolutePath(), m.context(), threads);
          if (handle == 0) {
            error = "load_failed";
          } else {
            loaded = true;
            activeModel = m.id();
          }
        } catch (Throwable t) {
          error = "load_failed";
        }
        loading = false;
        postStatus();
      }
    }).start();
  }

  public void unload() {
    if (handle != 0) {
      nativeFree(handle);
      handle = 0;
    }
    loaded = false;
    activeModel = "";
    postStatus();
  }

  /* ------------------------------------------------------------- generate */

  public void generate(final String id, final String prompt, final int maxTokens,
                       final float temp, final float topP, final float topK) {
    if (!loaded || handle == 0) {
      localEnd(id, false, "not_loaded");
      return;
    }
    final long h = handle;
    new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          nativeGenerate(h, id, prompt, maxTokens, temp, topP, topK);
          localEnd(id, true, "done");
        } catch (Throwable t) {
          localEnd(id, false, "crash");
        }
      }
    }).start();
  }

  public void cancel(String id) {
    if (handle != 0) nativeCancel(handle);
  }

  /** Called from native code on a llama.cpp worker thread. */
  public void localToken(String id, String text) {
    if (text == null || text.isEmpty()) return;
    final String js = "window.__yukiLocalToken&&window.__yukiLocalToken("
        + JSONObject.quote(id) + "," + JSONObject.quote(text) + ")";
    web.post(new Runnable() {
      @Override
      public void run() {
        web.evaluateJavascript(js, null);
      }
    });
  }

  public void localEnd(String id, boolean ok, String reason) {
    final String js = "window.__yukiLocalEnd&&window.__yukiLocalEnd("
        + JSONObject.quote(id) + "," + (ok ? "true" : "false") + "," + JSONObject.quote(reason == null ? "" : reason) + ")";
    web.post(new Runnable() {
      @Override
      public void run() {
        web.evaluateJavascript(js, null);
      }
    });
  }

  public String prompt(String system, String history) {
    if (!loaded || handle == 0) return "";
    try {
      String out = nativePrompt(handle, system, history);
      return out == null ? "" : out;
    } catch (Throwable t) {
      return "";
    }
  }

  private Model find(String id) {
    for (Model m : MODELS) if (m.id().equals(id)) return m;
    return MODELS.length > 0 ? MODELS[0] : null;
  }
}
