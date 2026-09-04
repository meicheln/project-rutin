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
