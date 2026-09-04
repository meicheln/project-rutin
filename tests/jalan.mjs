#!/usr/bin/env node
/**
 * Penjalan tes. Muat semua *.spec.mjs, jalanin berurutan, laporkan hasil.
 * Keluar dengan kode 1 kalau ada yang gagal — jadi bisa dipasang di CI.
 *
 *   node tests/jalan.mjs            semua spec
 *   node tests/jalan.mjs latihan    cuma spec yang namanya ngandung "latihan"
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buatPencatat, matikanServer } from './bantu.mjs';

const DIR = dirname(fileURLToPath(import.meta.url));
const saring = process.argv[2];

const berkas = readdirSync(DIR).filter(f => f.endsWith('.spec.mjs')).sort()
  .filter(f => !saring || f.includes(saring));

if (!berkas.length) { console.error('nggak ada spec yang cocok'); process.exit(1); }

const H = '─'.repeat(62);
console.log(`\nRutin — tes\n${H}`);

let totalLolos = 0, totalGagal = 0;
const gagalan = [];
const mulai = Date.now();

for (const f of berkas) {
  const mod = await import(pathToFileURL(join(DIR, f)).href);
  const t = buatPencatat(mod.nama || f);
  const t0 = Date.now();
  let ledak = null;
  try { await mod.jalan(t); }
  catch (e) { ledak = e; }

  const lolos = t.hasil.filter(h => h.lolos).length;
  const gagal = t.hasil.length - lolos;
  totalLolos += lolos; totalGagal += gagal;

  const tanda = (gagal || ledak) ? '✗' : '✓';
  console.log(`\n${tanda} ${mod.nama || f}  ${lolos}/${t.hasil.length}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  t.hasil.filter(h => !h.lolos).forEach(h => { console.log(`    ✗ ${h.pesan}`); gagalan.push(`${f}: ${h.pesan}`); });
  if (ledak) {
    totalGagal++;
    console.log(`    ✗ SPEC MELEDAK: ${ledak.message}`);
    gagalan.push(`${f}: meledak — ${ledak.message}`);
  }
}

await matikanServer();

console.log(`\n${H}`);
console.log(`  ${totalLolos} lolos · ${totalGagal} gagal · ${((Date.now() - mulai) / 1000).toFixed(1)}s`);
if (totalGagal) {
  console.log(`\n  Yang gagal:\n${gagalan.map(g => '   • ' + g).join('\n')}\n`);
  process.exit(1);
}
console.log('  semua lolos\n');
