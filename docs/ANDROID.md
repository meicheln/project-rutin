# Build APK

## Syarat

- Node 20+
- JDK 17 atau 21
- Android SDK: `platform-tools`, `platforms;android-35`, `build-tools;35.0.0`
- Python + Pillow (buat ikon)

Kalau SDK belum ada:

```bash
mkdir -p /opt/android-sdk/cmdline-tools && cd /tmp
curl -sSL -o t.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q t.zip && mv cmdline-tools /opt/android-sdk/cmdline-tools/latest
export ANDROID_HOME=/opt/android-sdk
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

## Langkah

```bash
npm run build
npm run ikon                # ikon peluncur + notifikasi + splash
npm run android:siapkan     # sekali di awal
npm run android:build       # → dist/Rutin.apk
```

`siapkan` bikin proyek Capacitor di `../rutin-android`, bikin keystore, dan menyisipkan konfigurasi tanda tangan ke `build.gradle`.

## Keystore

`rutin-android/android/rutin-release.keystore` — password `rutin2026`, alias `rutin`.

**Simpan file ini.** APK yang ditandatangani keystore berbeda tidak bisa menimpa yang sudah terpasang; Android menolak, dan pengguna harus copot dulu (data lokal ikut hilang).

## Yang diubah dari template Capacitor

| Berkas | Perubahan | Kenapa |
|---|---|---|
| `AndroidManifest.xml` | tambah `SCHEDULE_EXACT_ALARM` | biar pengingat bisa tepat waktu; tanpa ini Android pakai alarm perkiraan |
| `values/styles.xml` | latar gelap, splash pakai `ic_launcher_foreground` | menghindari kedip putih waktu app dibuka |
| `values-v35/styles.xml` | `windowOptOutEdgeToEdgeEnforcement` | Android 15 memaksa edge-to-edge; WebView Capacitor tidak memetakan inset sistem ke `env()`, jadi opt-out lebih benar daripada tata letak yang ketutupan |
| `values/colors.xml` | warna aplikasi | |
| `app/build.gradle` | `signingConfigs.release` | |

Kalau `npx cap add android` dijalankan ulang, perubahan ini hilang dan harus dipasang lagi.

## Verifikasi hasil

```bash
BT=$ANDROID_HOME/build-tools/35.0.0
$BT/apksigner verify --print-certs dist/Rutin.apk
$BT/aapt2 dump badging dist/Rutin.apk | grep -E "^package|sdkVersion|uses-permission"
unzip -p dist/Rutin.apk assets/public/index.html | wc -c   # harus sama dengan dist/rutin.html
```

Yang benar: `com.blay.rutin`, minSdk 23, targetSdk 35, izin `INTERNET` + `POST_NOTIFICATIONS` + `SCHEDULE_EXACT_ALARM` + `RECEIVE_BOOT_COMPLETED` + `WAKE_LOCK`.
