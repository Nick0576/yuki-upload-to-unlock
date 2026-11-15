package com.heartverse.yuki;

import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Native HTTP proxy for the two APIs the app uses.
 *
 * The web app runs from https://yuki.local inside the WebView, so plain fetch
 * would be blocked by CORS and would need the secret keys in JavaScript. Here
 * the keys stay compiled in the app and the requests are made with
 * HttpURLConnection, exactly like server.mjs does on the desktop.
 */
public class ApiBridge {
  private static final String NOMI_BASE = "https://api.nomi.ai";
  private static final String KB_BASE = "https://api.koolbase.com";

  private static final Map<String, String> AUTH = new HashMap<>();
  static {
    AUTH.put("/api/auth/register", "/v1/sdk/auth/register");
    AUTH.put("/api/auth/login", "/v1/sdk/auth/login");
    AUTH.put("/api/auth/logout", "/v1/sdk/auth/logout");
    AUTH.put("/api/auth/forgot", "/v1/sdk/auth/forgot-password");
    AUTH.put("/api/auth/reset", "/v1/sdk/auth/reset-password");
    AUTH.put("/api/auth/verify-email", "/v1/sdk/auth/verify-email");
    AUTH.put("/api/auth/resend", "/v1/sdk/auth/send-verification");
  }

  private final WebView web;

  ApiBridge(WebView web) {
    this.web = web;
  }

  public void http(final String id, final String method, final String path, final String headersJson, final String body) {
    new Thread(new Runnable() {
      @Override
      public void run() {
        int status;
        String out;
        try {
          Result r = route(method, path, parseHeaders(headersJson), body == null ? "" : body);
          status = r.status;
          out = r.body;
        } catch (Exception e) {
          status = 503;
          try {
            JSONObject err = new JSONObject();
            err.put("error", "bridge_error");
            err.put("message", String.valueOf(e.getMessage()));
            out = err.toString();
          } catch (Exception ignored) {
            out = "{\"error\":\"bridge_error\"}";
          }
        }
        reply(id, status, out);
      }
    }).start();
  }

  private void reply(String id, int status, String body) {
    String js = "window.__yukiHttpResult(" + JSONObject.quote(id) + "," + status + "," + JSONObject.quote(body) + ")";
    web.post(new Runnable() {
      @Override
      public void run() {
        web.evaluateJavascript(js, null);
      }
    });
  }

  private Result route(String method, String path, Map<String, String> headers, String body) throws Exception {
    if ("/api/health".equals(path)) {
      return Result.of(200, "{\"ok\":true,\"nomi\":true,\"koolbase\":true}");
    }

    if (path.startsWith("/api/nomi")) {
      if (BuildKeys.NOMI_API_KEY.isEmpty()) {
        return Result.of(503, "{\"error\":\"nomi_not_configured\"}");
      }
      if ("/api/nomi/nomis".equals(path) && "GET".equals(method)) {
        return request("GET", NOMI_BASE + "/v1/nomis", nomiHeaders(), null);
      }
      if ("/api/nomi/chat".equals(path) && "POST".equals(method)) {
        JSONObject in = new JSONObject(body.isEmpty() ? "{}" : body);
        String nomisId = in.optString("nomisId", "");
        String message = in.optString("messageText", "");
        if (message.isEmpty()) return Result.of(400, "{\"error\":\"message_required\"}");

        if (nomisId.isEmpty()) {
          Result list = request("GET", NOMI_BASE + "/v1/nomis", nomiHeaders(), null);
          if (list.status != 200) return list;
          JSONObject data = new JSONObject(list.body);
          JSONArray nomis = data.optJSONArray("nomis");
          if (nomis == null || nomis.length() == 0) return Result.of(400, "{\"error\":\"no_nomi\"}");
          nomisId = nomis.getJSONObject(0).optString("uuid", "");
          if (nomisId.isEmpty()) return Result.of(400, "{\"error\":\"no_nomi\"}");
        }

        JSONObject payload = new JSONObject();
        payload.put("messageText", message.length() > 4000 ? message.substring(0, 4000) : message);
        Result r = request("POST", NOMI_BASE + "/v1/nomis/" + nomisId + "/chat", nomiHeaders(), payload.toString());
        if (r.status != 200 && r.status != 201) return r;

        JSONObject data = new JSONObject(r.body);
        JSONObject reply = data.optJSONObject("replyMessage");
        String text = "";
        if (reply != null) text = reply.optString("text", reply.optString("messageText", ""));

        JSONObject out = new JSONObject();
        out.put("nomisId", nomisId);
        out.put("text", text.trim());
        return Result.of(200, out.toString());
      }
      return Result.of(404, "{\"error\":\"not_found\"}");
    }

    if (path.startsWith("/api/auth")) {
      if (BuildKeys.KOOLBASE_SECRET_KEY.isEmpty()) {
        return Result.of(503, "{\"error\":\"auth_not_configured\"}");
      }
      Map<String, String> kb = new HashMap<>();
      kb.put("x-api-key", BuildKeys.KOOLBASE_SECRET_KEY);
      kb.put("Content-Type", "application/json");
      String auth = headers.get("authorization");
      if (auth != null) kb.put("Authorization", auth);

      if ("/api/auth/me".equals(path) && "GET".equals(method)) {
        if (auth == null) return Result.of(401, "{\"error\":\"unauthorized\"}");
        return request("GET", KB_BASE + "/v1/sdk/auth/me", kb, null);
      }
      String target = AUTH.get(path);
      if (target != null && "POST".equals(method)) {
        return request("POST", KB_BASE + target, kb, body.isEmpty() ? "{}" : body);
      }
      return Result.of(404, "{\"error\":\"not_found\"}");
    }

    return Result.of(404, "{\"error\":\"not_found\"}");
  }

  private Map<String, String> nomiHeaders() {
    Map<String, String> h = new HashMap<>();
    h.put("Authorization", BuildKeys.NOMI_API_KEY);
    h.put("Content-Type", "application/json");
    return h;
  }

  private Map<String, String> parseHeaders(String json) {
    Map<String, String> out = new HashMap<>();
    if (json == null || json.isEmpty()) return out;
    try {
      JSONObject obj = new JSONObject(json);
      Iterator<String> keys = obj.keys();
      while (keys.hasNext()) {
        String k = keys.next();
        out.put(k.toLowerCase(), obj.optString(k));
      }
    } catch (Exception ignored) {
      /* no headers */
    }
    return out;
  }

  private Result request(String method, String urlStr, Map<String, String> headers, String body) throws Exception {
    HttpURLConnection c = (HttpURLConnection) new URL(urlStr).openConnection();
    c.setConnectTimeout(25_000);
    c.setReadTimeout(120_000);
    c.setRequestMethod(method);
    for (Map.Entry<String, String> e : headers.entrySet()) {
      c.setRequestProperty(e.getKey(), e.getValue());
    }
    if (body != null) {
      c.setDoOutput(true);
      byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
      c.setFixedLengthStreamingMode(bytes.length);
      try (OutputStream os = c.getOutputStream()) {
        os.write(bytes);
      }
    }
    int status = c.getResponseCode();
    InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
    StringBuilder sb = new StringBuilder();
    if (in != null) {
      try (BufferedReader br = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
        String line;
        while ((line = br.readLine()) != null) sb.append(line);
      }
    }
    c.disconnect();
    return Result.of(status, sb.length() == 0 ? "{}" : sb.toString());
  }

  private static final class Result {
    final int status;
    final String body;

    private Result(int status, String body) {
      this.status = status;
      this.body = body;
    }

    static Result of(int status, String body) {
      return new Result(status, body);
    }
  }
}
