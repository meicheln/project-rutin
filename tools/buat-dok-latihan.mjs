#!/usr/bin/env node
/**
 * Bikin docs/TRAINING-PROGRAM.md dari PROGRAM & JADWAL_BAKU di dalam kode.
 *
 * Kenapa digenerate, bukan ditulis tangan? Karena yang ditulis tangan udah
 * kebukti basi: dokumennya ngaku digenerate padahal generatornya nggak pernah
 * ada, jadi pas programnya ganti ke bodybuilding, 574 baris itu nyeritain
 * program yang aplikasinya sendiri udah nggak jalanin.
 *
 * Caranya: baca dist/rutin.html yang udah dibangun, ambil blok PROGRAM dan
 * JADWAL_BAKU, lalu jalanin di sandbox vm. Nggak ada parsing manual, nggak ada
 * duplikasi daftar gerakan.
 *
 *   node tools/buat-dok-latihan.mjs          tulis ke docs/TRAINING-PROGRAM.md
 *   node tools/buat-dok-latihan.mjs --cek    gagal kalau dokumennya udah basi
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUNDLE = join(ROOT, 'dist', 'rutin.html');
const OUT = join(ROOT, 'docs', 'TRAINING-PROGRAM.md');
const CEK = process.argv.includes('--cek');

if (!existsSync(BUNDLE)) {
  console.error('dist/rutin.html belum ada — jalanin `npm run build` dulu');
  process.exit(1);
}
const html = readFileSync(BUNDLE, 'utf8');

/** Ambil satu deklarasi `const <nama> = ...;` sampai kurung tutupnya seimbang. */
function ambil(nama) {
  const awal = html.indexOf(`const ${nama} = `);
  if (awal < 0) throw new Error(`${nama} nggak ketemu di bundel`);
  let i = html.indexOf('{', awal), dalam = 0, dalamStr = null;
  for (let j = i; j < html.length; j++) {
    const c = html[j], sblm = html[j - 1];
    if (dalamStr) { if (c === dalamStr && sblm !== '\\') dalamStr = null; continue; }
    if (c === "'" || c === '"') { dalamStr = c; continue; }
    if (c === '{') dalam++;
    else if (c === '}' && --dalam === 0) return html.slice(i, j + 1);
  }
  throw new Error(`kurung ${nama} nggak nutup`);
}

const { PROGRAM, JADWAL } = runInNewContext(
  `({ PROGRAM: ${ambil('PROGRAM')}, JADWAL: ${ambil('JADWAL_BAKU')} })`, {});

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const URUT = [1, 2, 3, 4, 5, 6, 0];
const kontakSesi = sid => (PROGRAM[sid]?.blok || [])
  .reduce((t, b) => t + b.ex.reduce((u, e) => u + (+e.kontak || 0), 0), 0);

/** Set kerja per kelompok otot per minggu — rem utama program bodybuilding. */
const otot = {};
for (const w of URUT)
  for (const sid of JADWAL[w] || [])
    for (const b of PROGRAM[sid].blok)
      for (const e of b.ex)
        if (e.otot) for (const k of [].concat(e.otot)) otot[k] = (otot[k] || 0) + (+e.set || 0);

let menitTotal = 0, kontakTotal = 0;
const baris = URUT.map(w => {
  const list = JADWAL[w] || [];
  if (!list.length) return `| **${HARI[w]}** | Libur total | — | — |`;
  const menit = list.reduce((t, s) => t + PROGRAM[s].menit, 0);
  const kontak = list.reduce((t, s) => t + kontakSesi(s), 0);
  menitTotal += menit; kontakTotal += kontak;
  return `| **${HARI[w]}** | ${list.map(s => PROGRAM[s].n).join('<br>')} | ${menit} mnt | ${kontak || '—'} |`;
});

const terjadwal = new Set(URUT.flatMap(w => JADWAL[w] || []));
const simpanan = Object.keys(PROGRAM).filter(s => !terjadwal.has(s));

const md = [];
md.push('# Training Program');
md.push('');
md.push('> **Jangan diedit tangan.** Berkas ini digenerate dari `PROGRAM` dan');
md.push('> `JADWAL_BAKU` di dalam kode oleh `tools/buat-dok-latihan.mjs`, jadi dia');
md.push('> nggak bisa beda dari yang aplikasinya beneran tampilin. Nama gerakan pakai');
md.push('> istilah baku bahasa Inggris; petunjuk tekniknya bahasa Indonesia karena itu');
md.push('> teks yang dibaca penggunanya.');
md.push('');
md.push(`Fokus sekarang: **bodybuilding**. ${terjadwal.size} sesi terjadwal, ${7 - URUT.filter(w => (JADWAL[w] || []).length).length} hari libur.`);
md.push('');
md.push('**Rem yang dipegang:** 10–20 set kerja per kelompok otot per minggu · rentang rep 6–15 · sisain 1–2 rep di tangki, jangan tiap set sampai gagal angkat · sesi gym maksimal 90 menit.');
md.push('');
md.push('---');
md.push('');
md.push('## Jadwal mingguan');
md.push('');
md.push('| Hari | Sesi | Durasi | Kontak lompatan |');
md.push('|---|---|---|---|');
md.push(...baris);
md.push(`| | **Total** | **${(menitTotal / 60).toFixed(1).replace('.', ',')} jam** | **${kontakTotal || '—'}** |`);
md.push('');
md.push('## Set kerja per kelompok otot');
md.push('');
md.push('Dihitung dari sesi yang terjadwal, kalau semua gerakannya dikerjain.');
md.push('');
md.push('| Otot | Set / minggu | |');
md.push('|---|---|---|');
for (const [k, v] of Object.entries(otot).sort((a, b) => b[1] - a[1]))
  md.push(`| ${k} | ${v} | ${v > 20 ? 'di atas sasaran' : v >= 10 ? 'pas' : 'di bawah sasaran'} |`);
md.push('');

if (simpanan.length) {
  md.push('## Sesi yang disimpan tapi nggak dijadwalin');
  md.push('');
  md.push('Masih ada di aplikasi dan bisa dipasang lagi lewat **Atur jadwal**.');
  md.push('');
  for (const s of simpanan) md.push(`- **${PROGRAM[s].n}** — ${PROGRAM[s].jenis}, ${PROGRAM[s].menit} menit`);
  md.push('');
}
md.push('---');
md.push('');

for (const sid of Object.keys(PROGRAM)) {
  const p = PROGRAM[sid];
  md.push(`## ${p.n}${terjadwal.has(sid) ? '' : ' *(nggak dijadwalin)*'}`);
  md.push('');
  md.push(`${p.jenis === 'gym' ? 'Gym' : 'Basket'} · ${p.menit} menit`);
  md.push('');
  md.push(`> ${p.fokus}`);
  md.push('');
  for (const b of p.blok) {
    md.push(`### ${b.n} — ${b.m} menit`);
    md.push('');
    if (b.catatan) { md.push(`*${b.catatan}*`); md.push(''); }
    for (const e of b.ex) {
      const angka = [e.set > 1 ? `${e.set} × ${e.rep}` : e.rep, e.int, e.ist && e.ist !== '—' ? `istirahat ${e.ist}` : null]
        .filter(Boolean).join(' · ');
      md.push(`**${e.n}** — ${angka}${e.otot ? ` *(${[].concat(e.otot).join(', ')})*` : ''}`);
      md.push('');
      if (e.cue) { md.push(e.cue); md.push(''); }
    }
  }
  md.push('---');
  md.push('');
}

const isi = md.join('\n').replace(/\n{3,}/g, '\n\n');

if (CEK) {
  const lama = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (lama.trim() !== isi.trim()) {
    console.error('docs/TRAINING-PROGRAM.md udah basi — jalanin `node tools/buat-dok-latihan.mjs`');
    process.exit(1);
  }
  console.log('docs/TRAINING-PROGRAM.md masih sesuai kode');
} else {
  writeFileSync(OUT, isi);
  console.log(`docs/TRAINING-PROGRAM.md ditulis — ${isi.split('\n').length} baris, ${Object.keys(PROGRAM).length} sesi`);
}
