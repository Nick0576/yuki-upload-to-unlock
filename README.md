# Yuki — your anime AI girlfriend

Yuki lives in the places you pick. Her expression changes with the conversation,
she remembers what you tell her, checks in every day… and she is a real Android
app (`com.heartverse.yuki`), not just a website.

**APK:** [`apk/Yuki.apk`](apk/Yuki.apk) — signed, installable, works without the
local server (the API calls go through a native bridge inside the app).

---

## What's inside

**Her**
- 8 illustrated emotions (happy, shy, blush, sad, angry, crying, surprised,
  neutral) drawn over 12 location backgrounds. Emotions without art show an
  emoji badge near her hair.
- Location-aware replies: pick a place (bedroom, classroom, rooftop, konbini,
  shrine, station, park, beach, café, street, arcade, library) and she reacts to
  that specific scene.
- 26 emotions, mood, affection meter (Strangers → Soulmates), daily check-ins
  and streaks, gifts that raise affection, selfies, voice (TTS, native voice in
  the APK), themes, light/dark mode, English/Tagalog.
- Persona editor: her name, avatar/expression, personality, speaking style, and
  your own name.

**Chat**
- Streaming, word-by-word replies with timestamps and a typing indicator.
- Long-press a message: reply/quote, copy, edit, regenerate, react, pin,
  bookmark, delete for me, delete for both.
- Stop generation mid-stream, regenerate, clear history with confirmation.
- Search across chats, pinned message bar, saved/bookmarked messages,
  multi-select bulk copy/delete, archive, fresh chat, export JSON/TXT.
- Multiple threads and roleplay scenarios, custom stickers, emoji reactions from
  both sides, "she messaged you" notifications.

**Accounts**
- Login/password accounts. Cloud accounts through Koolbase (email verification
  required by Koolbase) or an offline account stored on the device (PBKDF2).
- 18+ age gate, remembered on the device. The mature toggle is off by default.

**AI**
- Nomi AI for her replies, with an always-available offline engine as fallback.
- Keys never reach the web page: `server.mjs` proxies them for the browser, and
  the APK's native bridge keeps them inside the app.

---

## Install the APK

1. The signed APK is at `apk/Yuki.apk` (also copied to `Download/Yuki.apk` on the
   phone).
2. Open it on the phone, allow "install unknown apps" for the file manager, and
   install.
3. Launch **Yuki**, pass the 18+ gate, then create an offline account (cloud
   accounts need Koolbase email verification).

Rebuild it any time:

```bash
./scripts/build-apk.sh          # → apk/Yuki.apk
```

The script downloads its dexer (`android/tools/r8.jar`) and modern `android.jar`
once, then bakes `NOMI_API_KEY` / `KOOLBASE_SECRET_KEY` from `.env` into the APK.
Those keys are private to the app — don't share the APK if you don't want them
shared.

Build requirements (Ubuntu/Debian arm64 works):

```bash
apt-get install -y openjdk-17-jdk-headless aapt apksigner zipalign \
  android-sdk-platform-23 zip unzip
```

## Run the web version

```bash
npm install
npm run build
PORT=8787 node server.mjs    # http://127.0.0.1:8787
```

Put your keys in `.env` (see `.env.example`). The server hosts the app and
proxies Nomi + Koolbase so the browser never sees the secret keys.

| Variable | Purpose |
| --- | --- |
| `NOMI_API_KEY` | Nomi AI key used for her chat replies |
| `KOOLBASE_SECRET_KEY` | Koolbase key for cloud accounts |
| `PORT` | local port (default `8787`) |

## Development

- `npm run build` — production web build into `dist/`
- `npx tsc --noEmit` — type-check
- `./scripts/build-apk.sh` — build, sign and verify `apk/Yuki.apk`

Android shell lives in `android/` (one `WebView`, a small native HTTP proxy in
`ApiBridge.java`, native TTS and notifications). Web app source is in `src/`.
