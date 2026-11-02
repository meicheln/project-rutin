/* Cek tiap model di AL_MODEL beneran kepakai, SEBELUM ada yang ngunduh ratusan MB.
 *
 * Alasannya nyata: Qwen3-0.6B kelihatan kandidat terbaik di atas kertas — generasi
 * lebih baru, ukuran mirip — tapi dia naruh templat obrolannya di berkas terpisah
 * (chat_template.jinja) dan transformers.js 4.3.1 cuma baca yang di dalam
 * tokenizer_config.json. Jadi dia error pas ditanya, sesudah 618 MB keunduh.
 *
 * Yang dicek cuma dua hal, dan dua-duanya murah (beberapa KB per model):
 *   1. templat obrolannya ada di tokenizer_config.json
 *   2. berkas bobot buat tiap dtype yang kita sebut emang ada, dan ukurannya cocok
 *
 * Nggak ikut `npm test` karena butuh internet — tes lainnya sengaja jalan offline.
 * Jalanin manual tiap nambah atau ngeganti model:  node tools/cek-model-lokal.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src', '32-asisten-lokal.js'), 'utf8');

const blok = src.match(/const AL_MODEL = \{[\s\S]*?\n\};/);
if (!blok) { console.error('AL_MODEL nggak ketemu di src/32-asisten-lokal.js'); process.exit(1); }
const MODEL = new Function(blok[0] + '\nreturn AL_MODEL;')();

const mb = b => (b / 1048576).toFixed(0);
let galat = 0;

for (const [kunci, m] of Object.entries(MODEL)) {
  console.log(`\n${kunci} — ${m.nama}\n  ${m.id}`);
  try {
    const tc = await fetch(`https://huggingface.co/${m.id}/raw/main/tokenizer_config.json`).then(r => r.json());
    if (typeof tc.chat_template === 'string' && tc.chat_template.length) {
      console.log('  ✓ templat obrolan ada di tokenizer_config.json');
    } else {
      console.log('  ✗ NGGAK ADA templat obrolan di tokenizer_config.json —'
        + ' transformers.js bakal nolak pas ditanya, sesudah modelnya keunduh');
      galat++;
    }

    const info = await fetch(`https://huggingface.co/api/models/${m.id}?blobs=true`).then(r => r.json());
    const berkas = info.siblings || [];
    for (const [dtype, diharap] of Object.entries(m.mb)) {
      // bobot gede dipecah: model_X.onnx nyaris kosong, isinya di model_X.onnx_data
      const cocok = berkas.filter(f => new RegExp(`onnx/model_${dtype}\\.onnx(_data)?$`).test(f.rfilename));
      const total = cocok.reduce((t, f) => t + (f.size || 0), 0);
      if (!cocok.length) { console.log(`  ✗ ${dtype}: berkasnya nggak ada`); galat++; continue; }
      const selisih = Math.abs(mb(total) - diharap);
      const tanda = selisih > 25 ? '✗' : '✓';
      if (selisih > 25) galat++;
      console.log(`  ${tanda} ${dtype}: ${mb(total)} MB (ditulis ${diharap} MB)`);
    }
  } catch (e) {
    console.log('  ? nggak bisa diperiksa: ' + e.message + ' (internet mati?)');
  }
}

console.log(galat ? `\n${galat} masalah — jangan dirilis dulu` : '\nSemua model kepakai');
process.exit(galat ? 1 : 0);
