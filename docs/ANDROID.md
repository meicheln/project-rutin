# Building the APK

## Requirements

- Node 20+
- JDK 17 or 21
- Android SDK: `platform-tools`, `platforms;android-35`, `build-tools;35.0.0`
- Python with Pillow (for icons)

If the SDK isn't installed:

```bash
mkdir -p /opt/android-sdk/cmdline-tools && cd /tmp
curl -sSL -o t.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q t.zip && mv cmdline-tools /opt/android-sdk/cmdline-tools/latest
export ANDROID_HOME=/opt/android-sdk
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

## Steps

```bash
npm run build
npm run ikon                        # launcher, notification icons, splash
export RUTIN_KEYSTORE_PASS="your-password"
npm run android:siapkan             # once
npm run android:build               # → dist/Rutin.apk
```

`siapkan` creates a Capacitor project in `../rutin-android`, generates a keystore, and patches the signing config into `build.gradle`.

## The keystore

Created at `rutin-android/android/rutin-release.keystore`, alias `rutin`, password from `RUTIN_KEYSTORE_PASS`.

**Keep this file, and keep it out of version control.** An APK signed with a different keystore cannot replace an installed one — Android refuses, and the user has to uninstall first, losing local data. `.gitignore` excludes `*.keystore` and `dist/`.

The password is read from the environment and never written into the repository.

## Changes made to the Capacitor template

| File | Change | Why |
|---|---|---|
| `AndroidManifest.xml` | add `SCHEDULE_EXACT_ALARM` | lets reminders fire on time; without it Android uses inexact alarms |
| `values/styles.xml` | dark background, splash using `ic_launcher_foreground` | avoids a white flash on launch |
| `values-v35/styles.xml` | `windowOptOutEdgeToEdgeEnforcement` | Android 15 forces edge-to-edge; the Capacitor WebView doesn't map system insets to `env()`, so opting out is more correct than a layout hidden behind system bars |
| `values/colors.xml` | app colors | |
| `app/build.gradle` | `signingConfigs.release` reading the password from the environment | |

Re-running `npx cap add android` wipes these; they have to be reapplied.

## Verifying the output

```bash
BT=$ANDROID_HOME/build-tools/35.0.0
$BT/apksigner verify --print-certs dist/Rutin.apk
$BT/aapt2 dump badging dist/Rutin.apk | grep -E "^package|sdkVersion|uses-permission"
unzip -p dist/Rutin.apk assets/public/index.html | wc -c   # should match dist/rutin.html
```

Expected: `com.blay.rutin`, minSdk 23, targetSdk 35, permissions `INTERNET`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`.

---

## Building on GitHub Actions (no local toolchain)

`.github/workflows/apk.yml` builds and signs the APK on GitHub's runners, so nothing has to be
installed locally. It runs on every push to `main`/`master`, on `v*` tags, and on demand from the
Actions tab. The APK lands as a build artifact; a tagged run also attaches it to a GitHub release.

### Two secrets, once

Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Value |
|---|---|
| `RUTIN_KEYSTORE_B64` | `dist/rutin-release.keystore`, base64-encoded |
| `RUTIN_KEYSTORE_PASS` | that keystore's password |

Get the base64 onto the clipboard without it ever appearing on screen:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("dist\rutin-release.keystore")) | Set-Clipboard
```

```bash
base64 -w0 dist/rutin-release.keystore | pbcopy    # macOS
base64 -w0 dist/rutin-release.keystore | xclip -selection clipboard   # Linux
```

The keystore itself stays out of the repo — `.gitignore` excludes `dist/` and `*.keystore`.

### Why the workflow refuses to run without them

`tools/android.mjs siapkan` generates a fresh keystore when it finds none. In CI that would happen
on every run, and **an APK signed by a different key cannot replace an installed one** — Android
rejects the update, and the only way forward is uninstalling, which wipes local data.

So the workflow does three things about it: it fails early with a named-secret error if either is
missing, it overwrites the generated keystore with the real one before anything is signed, and it
verifies the finished APK's certificate says `CN=Rutin` before publishing it. A wrong signature
fails the build rather than reaching a phone.

### If the keystore password is lost

There is no recovery, but there is a clean path, and neither step needs Java installed:

```bash
python3 tools/cek-keystore.py     # try a password against the existing keystore
python3 tools/bikin-keystore.py   # make a new one (PKCS12, alias rutin, CN=Rutin, 30 years)
```

Both prompt for the password rather than taking it as an argument, so it never lands in shell
history. `bikin-keystore.py` reads its own output back before finishing, so it cannot leave a
corrupt file behind, and it produces the same format and subject as the `keytool` command it
replaces — no change needed in `build.gradle` or the workflow's certificate check.

A new keystore means the next APK cannot replace the installed one. Migrate before installing it:

1. In the current app: gear, then Cadangan, then export the JSON backup and keep the file
2. Uninstall the old app
3. Install the new APK
4. Restore the backup

With cloud sync on, the data is in Supabase too, so signing in again also brings it back. This is a
one-time cost: once the new keystore is in GitHub secrets, every later build matches it.

### Node 24

CI pins Node 24, and `package.json` requires it. `tests/07-gemini.spec.mjs` imports
`supabase/functions/asisten/gemini.ts` directly — the Edge Function's translation layer is tested as
the real file, with no build step and no duplicated copy. Node strips the types on import, which
needs 24 (or 22.18+). On Node 20 the suite dies with `ERR_UNKNOWN_FILE_EXTENSION` after six specs
have already passed, which reads as a test failure and isn't one.

### Icons

`tools/buat-ikon.py` takes the res directory as its first argument and fetches Plus Jakarta Sans,
falling back to a system font if there's no network. It used to have the paths of the machine where
the first APK was built hardcoded, which made it unusable anywhere else.
