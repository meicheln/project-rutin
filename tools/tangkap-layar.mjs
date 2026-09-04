#!/usr/bin/env node
/**
 * Bikin tangkapan layar dan GIF buat README.
 *
 *   node tools/tangkap-layar.mjs
 *
 * Hasil ke docs/screenshots/. Datanya dari tools/seed-demo.js, bukan data asli.
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');
mkdirSync(OUT, { recursive: true });

const html = readFileSync(join(ROOT, 'dist', 'rutin.html'));
const server = createServer((_, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;

const exe = existsSync('/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
  ? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' : undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});

async function sesi(tema) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'id-ID',
  });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForTimeout(700);
  await page.click('#gLocal');
  await page.waitForTimeout(300);
  await page.addScriptTag({ content: readFileSync(join(ROOT, 'tools', 'seed-demo.js'), 'utf8') });
  await page.evaluate(() => window.__seedDemo());
  await page.evaluate(t => { S.settings.theme = t; applyTheme(); }, tema);
  await page.waitForTimeout(800);
  return { ctx, page };
}

const jepret = (page, nama) => page.screenshot({ path: join(OUT, nama) });
const nav = (page, v) => page.click(`nav .tab[data-go="${v}"]`);

for (const tema of ['dark', 'light']) {
  const { ctx, page } = await sesi(tema);
  const t = tema === 'dark' ? '' : '-light';

  await jepret(page, `01-beranda${t}.png`);

  await nav(page, 'day'); await page.waitForTimeout(700);
  await jepret(page, `02-harian${t}.png`);

  await nav(page, 'money'); await page.waitForTimeout(800);
  await jepret(page, `03-uang${t}.png`);

  await nav(page, 'prog'); await page.waitForTimeout(700);
  await jepret(page, `04-latihan${t}.png`);

  await page.click('[data-lihat="lowerA"]'); await page.waitForTimeout(800);
  await page.click('[data-excue="la_p1"]'); await page.waitForTimeout(500);
  await jepret(page, `05-sesi${t}.png`);
  await page.evaluate(() => tutupSesi()); await page.waitForTimeout(500);

  await page.click('#progSeg button[data-p="badan"]'); await page.waitForTimeout(800);
  await jepret(page, `06-badan${t}.png`);

  await nav(page, 'idea'); await page.waitForTimeout(700);
  await jepret(page, `07-ide${t}.png`);

  // asisten: pakai API tiruan biar tangkapan layarnya konsisten & nggak butuh kunci
  await page.evaluate(() => {
    let n = 0;
    window.aiReq = async (m, p) => {
      if (p.startsWith('/v1/models')) return { data: [{ id: 'claude-sonnet-4-5' }] };
      n++;
      if (n === 1) return { stop_reason: 'tool_use', content: [
        { type: 'text', text: 'Oke, gua catat dua-duanya.' },
        { type: 'tool_use', id: 'a', name: 'catat_transaksi',
          input: { tipe: 'keluar', jumlah: 25000, kategori: 'makan', catatan: 'Nasi goreng' } },
        { type: 'tool_use', id: 'b', name: 'centang_rutinitas', input: { nama: 'Olahraga' } }] };
      return { stop_reason: 'end_turn', content: [{ type: 'text',
        text: 'Sekalian: pengeluaran lo minggu ini 18% di bawah rata-rata bulan ini. Kategori makan yang paling turun.' }] };
    };
  });
  await page.click('#aiFab'); await page.waitForTimeout(500);
  await page.fill('#aiKey', 'sk-ant-demo-0123456789'); await page.click('#aiConnect');
  await page.waitForTimeout(700);
  await page.fill('#aiText', 'tadi jajan nasi goreng 25rb terus udah olahraga');
  await page.click('#aiSend'); await page.waitForTimeout(1600);
  await jepret(page, `08-asisten${t}.png`);

  await ctx.close();
  console.log(`  tema ${tema}: 8 tangkapan layar`);
}

// ---- rangkaian bingkai buat GIF: alur sesi latihan ----
{
  const { ctx, page } = await sesi('dark');
  const frames = join(OUT, 'frames');
  mkdirSync(frames, { recursive: true });
  let i = 0;
  const f = async (n = 1) => { for (let k = 0; k < n; k++)
    await page.screenshot({ path: join(frames, `f${String(i++).padStart(3, '0')}.png`) }); };

  await nav(page, 'prog'); await page.waitForTimeout(800); await f(3);
  await page.click('[data-mulai="lowerA"]').catch(() => page.click('[data-lihat="lowerA"]'));
  await page.waitForTimeout(900); await f(3);
  for (const id of ['la_w1', 'la_w2', 'la_w3']) {
    await page.click(`[data-exceklis="${id}"]`); await page.waitForTimeout(350); await f(2);
  }
  await page.click('[data-excue="la_p1"]'); await page.waitForTimeout(600); await f(3);
  await page.click('[data-ist="2,5 mnt"]'); await page.waitForTimeout(700); await f(2);
  await page.waitForTimeout(1000); await f(2);
  await page.click('#istLewati'); await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('sesLog').scrollTop = 1150);
  await page.waitForTimeout(500); await f(3);
  for (let k = 0; k < 3; k++) {
    await page.fill(`[data-setkg="la_m1"][data-i="${k}"]`, String(70 + k * 5));
    await page.fill(`[data-setrep="la_m1"][data-i="${k}"]`, '3');
    await page.waitForTimeout(300); await f(2);
  }
  await f(4);
  await ctx.close();
  console.log(`  ${i} bingkai buat GIF`);
}

await browser.close();
server.close();
console.log(`\n  selesai → docs/screenshots/\n`);
