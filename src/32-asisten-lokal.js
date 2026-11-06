<script>
/* ---------- asisten lokal: model yang jalan di HP, tanpa server ----------

   Kandangnya satu kalimat: MODELNYA NGGAK DIKASIH SATU PUN ALAT.

   Bukan dibatesin pakai daftar putih — emang nggak ada jalurnya. Dia cuma
   dikasih potret data sebagai teks, dan jawabannya dipakai sebagai teks.
   AI_RUN nggak pernah kesentuh dari berkas ini.

   Alasannya: 21 dari 25 alat asisten NULIS ke data penggunanya, dan model
   setengah miliar parameter sering salah milih alat. Salah pilih bukan cuma
   bikin jawaban jelek — catatannya kena, diam-diam, dan nggak ketahuan sampai
   berminggu-minggu. Daftar putih masih nyisain jalur; nggak ada alat sama
   sekali nggak nyisain apa-apa.

   Yang NULIS waktu offline tetap parseCepat(): pencocokan pola, bukan model,
   jadi dia nggak bisa ngarang — kalau polanya nggak cocok dia ngaku nggak
   ngerti. Jadi pembagiannya: nyatet pakai pola, nanya pakai model. */

/* Dua yang kepakai, bukan dua yang keren. Tiap kandidat diuji templat obrolannya
   dulu lewat tokenizer-nya doang (beberapa MB), sebelum ada yang ngunduh model
   ratusan MB. Qwen3-0.6B kelihatan paling masuk akal di atas kertas — generasi
   lebih baru, ukuran mirip — tapi dia naruh templatnya di chat_template.jinja
   terpisah dan transformers.js 4.3.1 nggak baca berkas itu, jadi dia error
   sebelum ngejawab apa pun. Llama 3.2 jalan tapi Indonesia nggak termasuk
   bahasa yang didukungnya.

   Qwen2.5-0.5B sempat jadi pilihan kedua, terus diuji beneran di GPU: 130 detik
   buat satu jawaban, dan jawabannya "2777777777..." sampai batas token. Dibuang,
   bukan disimpen sebagai pilihan — pilihan yang nggak kepake itu bukan
   keleluasaan, cuma jebakan buat yang nyoba. */
const AL_MODEL = { id:'onnx-community/gemma-3-1b-it-ONNX', nama:'Gemma 3 1B', mb:{ q4f16:728, q4:819 } };

const AL = {
  PUSTAKA: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1',

  pipe: null,
  muatan: null,                                    // janji yang lagi jalan, biar nggak dobel

  /* Ditanya ke GPU-nya, bukan ditebak. Tanpa shader-f16 bobot setengah-presisi
     nggak jalan, dan hasilnya bukan "agak pelan" tapi gagal muat — jadi turun
     ke q4 yang lebih gede tapi nggak butuh f16. */
  async dtype(){
    try{
      const ad = await navigator.gpu.requestAdapter();
      return ad && ad.features.has('shader-f16') ? 'q4f16' : 'q4';
    }catch(e){ return 'q4'; }
  },

  nyala(){ return LS.get('rutin.alNyala', 0) === 1; },
  matikan(){ LS.set('rutin.alNyala', 0); this.pipe = null; this.muatan = null; },

  /* Instruksinya pendek disengaja. Model sekecil ini perhatiannya cepat buyar;
     aturan panjang malah bikin dia ngarang. Potretnya ~1,5 KB, itu udah
     sebagian besar jatah konteksnya. */
  sys(){
    return 'Kamu asisten di aplikasi catatan harian "Rutin" punya penggunanya sendiri.\n'
      + 'Jawab singkat, bahasa Indonesia santai.\n'
      + 'Pakai HANYA angka yang ada di DATA di bawah. Kalau yang ditanya nggak ada di DATA, '
      + 'bilang "nggak kelihatan di datanya" — jangan ngarang angka.\n'
      + 'Kamu nggak bisa nyatet atau ngubah apa pun. Kalau dia minta dicatat, '
      + 'bilang tulis aja langsung kayak "2rb makan".\n\nDATA:\n' + aiSnapshot();
  },

  async muat(lapor){
    if (this.pipe) return this.pipe;
    if (this.muatan) return this.muatan;           // dipencet dua kali jangan ngunduh dua kali
    this.muatan = (async () => {
      const { pipeline } = await import(this.PUSTAKA);
      const pipe = await pipeline('text-generation', AL_MODEL.id, {
        device: 'webgpu', dtype: await this.dtype(),
        progress_callback: p => {
          if (!lapor) return;
          if (p.status === 'progress' && p.total) lapor(Math.round(p.loaded / p.total * 100), p.file || '');
          else if (p.status === 'ready') lapor(100, '');
        },
      });
      this.pipe = pipe; LS.set('rutin.alNyala', 1);
      return pipe;
    })();
    try{ return await this.muatan; }
    catch(e){ this.muatan = null; throw e; }       // gagal unduh jangan ngunci percobaan berikutnya
  },

  async tanya(teks){
    const pipe = await this.muat();
    /* do_sample mati: serakah, bukan ngacak. Model sekecil ini kalau dikasih
       suhu malah ngarang angka yang nggak ada di potretnya. */
    const out = await pipe(
      [{ role:'system', content:this.sys() }, { role:'user', content:teks }],
      { max_new_tokens: 220, do_sample: false });
    const g = out && out[0] && out[0].generated_text;
    const isi = Array.isArray(g) ? (g[g.length - 1] || {}).content : g;
    return String(isi || '').trim();
  },

  /* Prompt API bawaan Chrome (Gemini Nano). Kalau ini ada, dia ngalahin semua
     pilihan di atas: nol unduhan dari kita, modelnya punya sistem, dan jauh
     lebih pinter dari apa pun yang muat di 728 MB.
     Dokumen Google bilang Android belum didukung — tapi yang nentuin HP-nya,
     bukan dokumennya, dan dokumen yang sama udah salah soal WebGPU di WebView. */
  async bawaan(){
    const LM = self.LanguageModel || (self.ai && self.ai.languageModel);
    if (!LM || !LM.availability) return 'nggak ada';
    try{ return String(await LM.availability() || 'nggak jelas'); }
    catch(e){ return 'gagal: ' + (e.message || e); }
  },

  /* Apa HP ini sanggup. Ditanya ke perangkatnya langsung, bukan ditebak dari
     merek atau versi Android — dukungan WebGPU di WebView beda-beda per HP. */
  async periksa(){
    const ua = navigator.userAgent || '';
    const h = {
      wv: / wv\)/.test(ua),                                  // WebView nandain dirinya gitu
      chrome: (ua.match(/Chrome\/(\d+)/) || [, '?'])[1],
      ram: +navigator.deviceMemory || 0,                     // GB, dibuletin browser. 0 = nggak ngasih tau
      gpu: false, adapter: '', buf: 0, f16: false, catatan: '',
    };
    if (!navigator.gpu){ h.catatan = 'navigator.gpu nggak ada sama sekali'; return h; }
    try{
      const ad = await navigator.gpu.requestAdapter();
      if (!ad){ h.catatan = 'WebGPU ada, tapi nggak dapet adapter'; return h; }
      h.gpu = true;
      h.f16 = ad.features.has('shader-f16');       // nentuin bobotnya kepake yang mana
      const inf = ad.info || (ad.requestAdapterInfo ? await ad.requestAdapterInfo() : null);
      h.adapter = inf ? [inf.vendor, inf.architecture || inf.device].filter(Boolean).join(' ') : 'nggak disebut';
      h.buf = Math.round((ad.limits && ad.limits.maxBufferSize || 0) / 1048576);
    }catch(e){ h.catatan = 'requestAdapter gagal: ' + e.message; }
    return h;
  },

  /* Vonisnya dipisah dari pemeriksaannya biar bisa diuji tanpa WebGPU beneran. */
  vonis(h){
    if (!h.gpu) return ['nggak', h.catatan || 'WebGPU nggak jalan di sini'];
    if (h.buf && h.buf < 1024) return ['sempit', `Buffer paling gede cuma ${h.buf} MB. Model paling kecil pun butuh lebih.`];
    if (h.ram && h.ram < 4) return ['sempit', `RAM kebaca ${h.ram} GB. Pas jalan, model paling kecil makan sekitar 2 GB.`];
    return ['bisa', 'WebGPU jalan. Model lokal bisa dipasang tanpa plugin Android asli.'];
  },
};

function sheetAsistenLokal(){
  const warna = { bisa:'--c-ok', sempit:'--c-warn', nggak:'--c-bad' };
  form('Asisten lokal', 'Model yang jalan di HP ini, tanpa server',
    `<div class="card tight" style="background:var(--surface-2)">
       <div class="lbl">Kandang keamanannya</div>
       <div class="sm" style="margin-top:4px">Modelnya <b>nggak dikasih satu pun alat</b>.
         Dia cuma dikasih potret data buat dibaca — nggak ada jalur buat nulis, bukan cuma dilarang.</div>
       <div class="xs dim" style="margin-top:7px">Yang nyatet tetap pencocokan pola
         (<b>"2rb makan"</b>, <b>"berat 67,5"</b>) — bukan model, jadi nggak bisa ngarang.
         Model cuma buat nanya.</div>
     </div>
     <div class="card tight" id="alHasil" style="background:var(--surface-2);margin-top:10px">
       <div class="sm dim">Lagi meriksa HP ini…</div>
     </div>
     <div class="note" id="alBawaan" style="margin-top:9px"></div>
     <div id="alPasang" style="margin-top:10px"></div>`,
    ()=>{}, null, 'Tutup');

  AL.bawaan().then(b => {
    const el = $('#alBawaan'); if (!el) return;
    const ada = !/^nggak ada/.test(b);
    el.innerHTML = `<div class="xs dim">Gemini Nano bawaan Chrome: <b>${esc(b)}</b>${
      ada ? ' — kasih tau gua, ini ngalahin semua pilihan di bawah'
          : ' (Google bilang Android emang belum kebagian)'}</div>`;
  });

  AL.periksa().then(h => {
    const [v, alasan] = AL.vonis(h);
    const el = $('#alHasil'); if (!el) return;
    el.innerHTML =
      `<div class="row"><span class="dot" style="background:var(${warna[v]})"></span>
         <div class="grow sm" style="font-weight:650">${v === 'bisa' ? 'HP ini sanggup' : v === 'sempit' ? 'Sanggup, tapi mepet' : 'HP ini belum sanggup'}</div></div>
       <div class="xs dim" style="margin-top:6px">${esc(alasan)}</div>
       <div class="hr" style="margin:11px 0"></div>
       <div class="xs dim tnum" style="line-height:1.7">
         WebGPU: <b>${h.gpu ? 'ada' : 'nggak ada'}</b><br>
         ${h.gpu ? `GPU: <b>${esc(h.adapter)}</b><br>Buffer maks: <b>${h.buf} MB</b><br>
         Bobot setengah-presisi: <b>${h.f16 ? 'didukung' : 'nggak — pakai bobot yang lebih gede'}</b><br>` : ''}
         RAM: <b>${h.ram ? h.ram + ' GB' : 'nggak dilaporin'}</b><br>
         Mesin: <b>Chrome ${esc(h.chrome)}${h.wv ? ' (WebView)' : ''}</b>
       </div>`;
    if (v !== 'nggak') alPasang(h.f16 ? 'q4f16' : 'q4');
  });
}

/* Tombol unduh + kemajuannya. Dipisah dari lembar utama biar bisa digambar
   ulang sendiri tanpa ngulang pemeriksaan WebGPU-nya. */
function alPasang(dtype){
  const el = $('#alPasang'); if (!el) return;
  const m = AL_MODEL, mb = m.mb[dtype] || m.mb.q4f16;
  if (AL.nyala()){
    el.innerHTML = `<div class="card tight" style="background:var(--surface-2)">
      <div class="row"><span class="dot" style="background:var(--c-ok)"></span>
        <div class="grow sm" style="font-weight:650">${esc(m.nama)} kepasang</div>
        <button class="chip" id="alOff">Matikan</button></div>
      <div class="xs dim" style="margin-top:7px">Kalau kotak asisten nggak ngerti kalimatnya sebagai catatan,
        pertanyaannya dilempar ke model ini. Jawabannya ditandain <b>lokal</b>.</div></div>`;
    $('#alOff').onclick = ()=>{ AL.matikan(); alPasang(dtype); toast('Model lokal dimatikan'); };
    return;
  }
  el.innerHTML =
    `<button class="btn block" id="alUnduh">Unduh ${esc(m.nama)} (${mb} MB)</button>
     <div class="note" style="margin-top:9px">Sekali unduh, habis itu kesimpen dan jalan tanpa internet.
       Pakai wifi — ini gede.</div>
     <div class="note" style="margin-top:9px;color:var(--c-warn)">Diukur beneran di GPU:
       muat sekitar 5 menit, tiap jawaban 6–12 detik. Dari 5 pertanyaan di data asli,
       <b>3 bener dan 1 angkanya dikarang</b> — pertanyaan uang, berat, runtutan dan sejenisnya
       udah dijawab kode (selalu tepat), jadi model ini cuma kebagian sisanya.
       Anggap jawabannya tebakan, bukan laporan.</div>
     <div class="note" id="alProg" style="margin-top:9px;display:none"></div>`;

  $('#alUnduh').onclick = async ()=>{
    const b = $('#alUnduh'), pr = $('#alProg');
    b.disabled = true; b.textContent = 'Nyiapin…';
    pr.style.display = '';
    try{
      await AL.muat((persen, berkas) => {
        pr.textContent = `${persen}% — ${berkas || 'nyiapin'}`;
        b.textContent = 'Lagi ngunduh…';
      });
      toast('Model lokal siap'); alPasang(dtype);
    }catch(e){
      pr.innerHTML = `<span style="color:var(--c-bad)">Gagal: ${esc(e.message || String(e))}</span>`;
      b.disabled = false; b.textContent = `Coba lagi (${mb} MB)`;
    }
  };
}

SHEETS.asistenLokal = sheetAsistenLokal;
</script>
