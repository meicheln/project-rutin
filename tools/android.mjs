#!/usr/bin/env node
/**
 * Bungkus hasil build jadi APK Android pakai Capacitor.
 *
 *   node tools/android.mjs siapkan   sekali di awal: pasang Capacitor, bikin folder android/
 *   node tools/android.mjs build     salin web ke android, lalu build APK rilis
 *
 * Syarat: Node 20+, JDK 17/21, Android SDK (platform 35 + build-tools 35).
 * Detail lengkap ada di docs/ANDROID.md.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, '..', 'rutin-android');   // proyek Capacitor ditaruh di sebelah repo
const perintah = process.argv[2];

// Password keystore diambil dari lingkungan, bukan ditulis di kode.
// Repo ini publik; password penandatangan nggak boleh ada di dalamnya.
const KS_PASS = process.env.RUTIN_KEYSTORE_PASS;

const sh = (cmd, cwd) => {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd: cwd || APP, stdio: 'inherit' });
};

const PAKET = [
  '@capacitor/core@^7', '@capacitor/cli@^7', '@capacitor/android@^7',
  '@capacitor/local-notifications@^7', '@capacitor/status-bar@^7',
  '@capacitor/splash-screen@^7', '@capacitor/app@^7', '@capacitor/preferences@^7',
].join(' ');

function salinWeb() {
  const bundel = join(ROOT, 'dist', 'rutin.html');
  if (!existsSync(bundel)) { console.error('dist/rutin.html belum ada — jalanin `npm run build` dulu.'); process.exit(1); }
  mkdirSync(join(APP, 'www'), { recursive: true });
  copyFileSync(bundel, join(APP, 'www', 'index.html'));
  console.log('  web disalin ke www/index.html');
}

if (!KS_PASS && perintah) {
  console.error('Set RUTIN_KEYSTORE_PASS dulu:  export RUTIN_KEYSTORE_PASS="password-lo"');
  process.exit(1);
}

if (perintah === 'siapkan') {
  mkdirSync(APP, { recursive: true });
  if (!existsSync(join(APP, 'package.json'))) sh('npm init -y');
  sh(`npm install ${PAKET}`);
  copyFileSync(join(ROOT, 'android-config', 'capacitor.config.json'), join(APP, 'capacitor.config.json'));
  salinWeb();
  if (!existsSync(join(APP, 'android'))) sh('npx cap add android');

  // keystore: wajib sama tiap kali rilis, kalau beda Android nolak nge-update
  const ks = join(APP, 'android', 'rutin-release.keystore');
  if (!existsSync(ks)) {
    sh(`keytool -genkeypair -v -keystore rutin-release.keystore -alias rutin -keyalg RSA -keysize 2048 ` +
       `-validity 10950 -storepass "${KS_PASS}" -keypass "${KS_PASS}" ` +
       `-dname "CN=Rutin, OU=Personal, O=Rutin, L=Jakarta, S=DKI Jakarta, C=ID"`, join(APP, 'android'));
    console.log('\n  Keystore dibikin di rutin-android/android/rutin-release.keystore');
    console.log('  SIMPAN FILE INI. Tanpa dia, versi berikutnya nggak bisa nimpa yang udah terpasang.\n');
  }

  // sisipkan konfigurasi tanda tangan ke build.gradle
  const g = join(APP, 'android', 'app', 'build.gradle');
  let isi = readFileSync(g, 'utf8');
  if (!isi.includes('signingConfigs')) {
    isi = isi.replace(/    buildTypes \{\n        release \{/,
`    signingConfigs {
        release {
            storeFile file('../rutin-release.keystore')
            storePassword System.getenv("RUTIN_KEYSTORE_PASS")
            keyAlias 'rutin'
            keyPassword System.getenv("RUTIN_KEYSTORE_PASS")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release`);
    writeFileSync(g, isi);
    console.log('  konfigurasi tanda tangan dipasang di build.gradle');
  }

  writeFileSync(join(APP, 'android', 'local.properties'),
    `sdk.dir=${process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '/opt/android-sdk'}\n`);

  console.log('\n  Siap. Lanjut:');
  console.log('    python3 tools/buat-ikon.py    (bikin ikon & splash)');
  console.log('    node tools/android.mjs build\n');
}
else if (perintah === 'build') {
  if (!existsSync(APP)) { console.error('proyek android belum ada — jalanin `siapkan` dulu.'); process.exit(1); }
  salinWeb();
  sh('npx cap copy android');
  sh('./gradlew assembleRelease', join(APP, 'android'));
  const apk = join(APP, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  mkdirSync(join(ROOT, 'dist'), { recursive: true });
  copyFileSync(apk, join(ROOT, 'dist', 'Rutin.apk'));
  console.log('\n  APK jadi: dist/Rutin.apk\n');
}
else {
  console.log('pakai: node tools/android.mjs siapkan | build');
  process.exit(1);
}
