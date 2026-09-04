#!/usr/bin/env node
/**
 * Build Rutin — gabungin potongan src jadi satu file HTML.
 *
 * Kenapa digabung, bukan pakai bundler? Hasil akhirnya harus satu file yang
 * bisa dibuka langsung dari mana aja: dibundel ke dalam APK, ditaruh di
 * hosting statis, atau diklik dua kali dari folder. Nggak ada import, nggak
 * ada node_modules di sisi klien, nggak ada langkah transpile.
 *
 * Urutan file penting: nomor di depan nama file itu urutannya.
 *   00-01  kerangka HTML (head + body)
 *   10-12  inti: helper, state, penyimpanan, jembatan native, grafik
 *   20-22  layar
 *   30-31  form dan asisten
 *   40     gerbang awal + boot (harus terakhir, dia yang jalanin semuanya)
 *
 * Pemakaian:
 *   node build.mjs            bangun ke dist/rutin.html
 *   node build.mjs --check    bangun lalu cek sintaks tiap blok script
 *   node build.mjs --out X    tulis ke lokasi lain
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', join(ROOT, 'dist', 'rutin.html'));
const CHECK = argv.includes('--check');

const bagian = readdirSync(SRC).filter(f => /^\d\d-/.test(f)).sort();
if (!bagian.length) { console.error('src/ kosong'); process.exit(1); }

let html = '';
const laporan = [];
for (const f of bagian) {
  const isi = readFileSync(join(SRC, f), 'utf8');
  html += isi;
  laporan.push({ file: f, byte: isi.length, baris: isi.split('\n').length });
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);

// ---- pemeriksaan ----
const galat = [];

// 1. tiap blok <script> harus valid sintaksnya
const blok = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (CHECK) {
  blok.forEach((m, i) => {
    try { new Function(m[1]); }
    catch (e) { galat.push(`blok script #${i + 1}: ${e.message}`); }
  });
}

// 2. kerangka HTML harus utuh
for (const tag of ['<!DOCTYPE html>', '<html', '</html>', '<body>', '</body>']) {
  if (!html.includes(tag)) galat.push(`kerangka HTML kurang: ${tag}`);
}

// 3. id yang dipakai boot harus ada di markup
for (const id of ['app', 'gate', 'sheet', 'scrim', 'toast', 'ai', 'ses']) {
  if (!new RegExp(`id="${id}"`).test(html)) galat.push(`elemen #${id} nggak ketemu di markup`);
}

// 4. jangan ada penanda konflik merge yang kebawa
if (/^<{7} |^={7}$|^>{7} /m.test(html)) galat.push('ada penanda konflik merge di hasil build');

const kb = (html.length / 1024).toFixed(1);
console.log(`\nRutin — build\n${'─'.repeat(52)}`);
laporan.forEach(r => console.log(`  ${r.file.padEnd(30)} ${String(r.baris).padStart(5)} baris  ${(r.byte / 1024).toFixed(1).padStart(7)} KB`));
console.log(`${'─'.repeat(52)}`);
console.log(`  ${'TOTAL'.padEnd(30)} ${String(html.split('\n').length).padStart(5)} baris  ${kb.padStart(7)} KB`);
console.log(`  ${blok.length} blok script · ditulis ke ${OUT.replace(ROOT + '/', '')}`);

if (galat.length) {
  console.error(`\n  GAGAL:\n${galat.map(g => '   ✗ ' + g).join('\n')}\n`);
  process.exit(1);
}
console.log(CHECK ? '  ✓ semua pemeriksaan lolos\n' : '  (jalankan dengan --check buat verifikasi sintaks)\n');
