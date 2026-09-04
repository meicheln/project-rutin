#!/usr/bin/env node
/**
 * Server statis kecil buat nyoba hasil build di browser.
 * Sinkron Supabase dan penyimpanan browser butuh origin http, bukan file://,
 * jadi buat ngetes yang bener pakai ini, jangan klik dua kali file HTML-nya.
 *
 *   node tools/sajikan.mjs          port 8099
 *   node tools/sajikan.mjs 3000     port lain
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'dist', 'rutin.html');
const PORT = Number(process.argv[2]) || 8099;

if (!existsSync(FILE)) {
  console.error('dist/rutin.html belum ada. Jalanin `npm run build` dulu.');
  process.exit(1);
}

createServer((req, res) => {
  // selalu baca ulang dari disk biar cukup refresh browser habis build
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(readFileSync(FILE));
}).listen(PORT, () => {
  console.log(`\n  Rutin jalan di http://localhost:${PORT}`);
  console.log('  Buka di browser, atau di HP lewat IP komputer ini (harus satu wifi).');
  console.log('  Ctrl+C buat berhenti.\n');
});
