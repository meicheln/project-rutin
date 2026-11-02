<script>
/* ---------- asisten lokal: model yang jalan di HP, tanpa server ----------

   Sengaja dipisah dari 31-asisten.js. Model yang muat di HP itu kecil, dan
   model kecil sering salah milih alat. Di aplikasi ini 21 dari 25 alat NULIS
   ke data penggunanya — jadi salah pilih bukan cuma bikin jawaban jelek,
   tapi catatannya kena, diam-diam, dan nggak ketahuan sampai berminggu.

   Makanya aturannya ditaruh di kode, bukan di instruksi sistem. Instruksi bisa
   dilanggar modelnya; daftar di bawah ini nggak bisa dilanggar siapa pun. */

const AL = {
  /* Alat yang boleh dipegang model lokal: cuma yang baca.
     Disaring dari AI_TOOLS pakai awalan nama, bukan diketik ulang satu-satu —
     biar alat baru yang ditambah nanti nggak diam-diam keikut ke sini. */
  alat(){ return AI_TOOLS.filter(t => /^baca_/.test(t.name)); },

  diblokir(){ return AI_TOOLS.filter(t => !/^baca_/.test(t.name)); },

  /* Lapis kedua. Kalaupun modelnya ngarang nama alat yang nulis, pelaksananya
     nolak di sini. Satu daftar bisa salah disusun; dua lapis yang berdiri
     sendiri nggak gampang salah barengan. */
  boleh(nama){ return this.alat().some(t => t.name === nama); },

  /* Apa HP ini sanggup. Ditanya ke perangkatnya langsung, bukan ditebak dari
     merek atau versi Android — dukungan WebGPU di WebView beda-beda per HP. */
  async periksa(){
    const ua = navigator.userAgent || '';
    const h = {
      wv: / wv\)/.test(ua),                                  // WebView nandain dirinya gitu
      chrome: (ua.match(/Chrome\/(\d+)/) || [, '?'])[1],
      ram: +navigator.deviceMemory || 0,                     // GB, dibuletin browser. 0 = nggak ngasih tau
      gpu: false, adapter: '', buf: 0, catatan: '',
    };
    if (!navigator.gpu){ h.catatan = 'navigator.gpu nggak ada sama sekali'; return h; }
    try{
      const ad = await navigator.gpu.requestAdapter();
      if (!ad){ h.catatan = 'WebGPU ada, tapi nggak dapet adapter'; return h; }
      h.gpu = true;
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
       <div class="sm" style="margin-top:4px">Model lokal cuma dikasih <b>${AL.alat().length} alat baca</b>.
         <b>${AL.diblokir().length} alat yang nulis</b> ke data lo diblokir di kode, bukan cuma dilarang di instruksi.</div>
       <div class="xs dim" style="margin-top:7px">Model sekecil ini gampang salah milih alat. Kalau dia salah dan alatnya nulis,
         catatan lo yang kena — dan nggak ketahuan sampai berminggu-minggu.</div>
     </div>
     <div class="card tight" id="alHasil" style="background:var(--surface-2);margin-top:10px">
       <div class="sm dim">Lagi meriksa HP ini…</div>
     </div>`,
    ()=>{}, null, 'Tutup');

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
         ${h.gpu ? `GPU: <b>${esc(h.adapter)}</b><br>Buffer maks: <b>${h.buf} MB</b><br>` : ''}
         RAM: <b>${h.ram ? h.ram + ' GB' : 'nggak dilaporin'}</b><br>
         Mesin: <b>Chrome ${esc(h.chrome)}${h.wv ? ' (WebView)' : ''}</b>
       </div>`;
  });
}

SHEETS.asistenLokal = sheetAsistenLokal;
</script>
