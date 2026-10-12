<script>
/* ============================================================
   RUTIN — target

   Target nggak nyimpen progres. Angkanya SELALU dihitung ulang dari data yang
   udah ada: transaksi, sesi latihan, timbangan. Jadi nggak ada yang perlu
   diisi dua kali, dan nggak ada angka yang bisa basi.

   Ini sengaja bukan modul ketujuh. Dia nempel ke dua modul yang hidup (uang
   dan latihan) dan ngasih mereka arah — bukan nambah layar baru yang harus
   diisi tiap hari.
   ============================================================ */

const T_JENIS = {
  beban:  { n:'Beban angkat',   ic:'🏋️', sat:'kg',   sub:'perkiraan 1RM satu gerakan' },
  nabung: { n:'Nabung',         ic:'🏦', sat:'rp',   sub:'masuk dikurangi keluar sejak tanggal mulai' },
  batas:  { n:'Batas belanja',  ic:'🧾', sat:'rp',   sub:'jangan lewat sekian per bulan' },
  rutin:  { n:'Sesi per minggu',ic:'📅', sat:'sesi', sub:'sesi latihan yang kelar minggu ini' },
  berat:  { n:'Berat badan',    ic:'⚖️', sat:'kg',   sub:'timbangan terakhir' },
};

/* Tiap jenis balikin { kini, awal, info }. kini=null artinya datanya belum ada —
   itu bukan nol, dan nggak boleh digambar sebagai 0%. */
const T_HITUNG = {
  beban(g){
    const semua = progresiGerakan(g.ex || '');
    const sejak = semua.filter(x => x.d >= (g.mulai || ''));
    const t = sejak.length ? sejak : semua;
    if (!t.length) return { kini:null, awal:null, info:'belum ada set kecatat' };
    const akhir = t.at(-1);
    return { kini:akhir.e, awal:t[0].e, info:`terakhir ${akhir.kg}kg × ${akhir.rep} (${tgl(akhir.d)})` };
  },
  nabung(g){
    const tx = S.txns.filter(x => x.d >= (g.mulai || ''));
    if (!tx.length) return { kini:null, awal:0, info:'belum ada transaksi sejak tanggal mulai' };
    return { kini: inSum(tx) - outSum(tx), awal:0, info:`${tx.length} transaksi sejak ${tgl(g.mulai)}` };
  },
  batas(g){
    const tx = txOfMonth(today().slice(0,7)).filter(x => x.type === 'out' && (!g.cat || x.cat === g.cat));
    return { kini: outSum(tx), awal:0,
             info: (g.cat ? catOf(g.cat).n : 'semua pengeluaran') + ' bulan ini' };
  },
  rutin(){
    return { kini: sesiKelarMinggu(), awal:0, info:'minggu ini, dari sesi yang kecatat' };
  },
  berat(g){
    const semua = [...(S.badan.berat || [])].sort((a,b) => a.d < b.d ? -1 : 1);
    const sejak = semua.filter(x => x.d >= (g.mulai || ''));
    const t = sejak.length ? sejak : semua;
    if (!t.length) return { kini:null, awal:null, info:'belum pernah nimbang' };
    return { kini:t.at(-1).kg, awal:t[0].kg, info:'timbangan ' + tgl(t.at(-1).d) };
  },
};

function majuTarget(g){
  const J = T_JENIS[g.jenis];
  if (!J) return null;
  const h = T_HITUNG[g.jenis](g);
  const target = +g.nilai || 0;
  const r = { J, target, kini:h.kini, awal:h.awal, info:h.info, persen:0, status:'kosong' };
  if (h.kini === null) return r;

  if (g.jenis === 'batas'){
    // dibalik: makin kecil makin bagus, dan 100% artinya kuota HABIS, bukan menang
    r.persen = target ? h.kini / target : 0;
    r.status = h.kini > target ? 'lewat' : 'jalan';
  } else {
    /* Diukur dari titik awal, bukan dari nol. "70 kg menuju target 80" itu BUKAN
       87% — kalau mulainya dari 60, yang udah dilewatin separuh jalan. Ngukur
       dari nol bikin tiap target kelihatan hampir kelar sejak hari pertama. */
    const jarak = target - h.awal;
    /* Arah itu sifat JENISNYA, bukan ditebak dari datanya. Beban, nabung, dan
       jumlah sesi cuma masuk akal naik — kalau titik awalnya udah di atas
       target, artinya udah kena, bukan "berarti targetnya turun". Cuma berat
       badan yang dua arah, karena cutting dan bulking dua-duanya sah. */
    const kena = g.jenis === 'berat'
      ? (jarak >= 0 ? h.kini >= target : h.kini <= target)
      : h.kini >= target;
    r.status = kena ? 'kena' : 'jalan';
    r.persen = kena ? 1 : (jarak ? (h.kini - h.awal) / jarak : 0);
  }
  // ceilingnya dibiarin kelewat 100% biar "lewat batas 50%" kebaca apa adanya;
  // yang dipotong cuma lebar bilah di blokTarget
  r.persen = Math.max(r.persen, 0);
  if (g.tenggat && r.status === 'jalan' && g.tenggat < today()) r.status = 'telat';
  return r;
}

/* Di jalur atau ketinggalan — dibandingin sama porsi WAKTU yang udah kepakai.
   Buat batas belanja, jendelanya bulan berjalan, bukan tenggat.
   shortcut: lurus doang, laju rata-rata. Cukup buat jawab "ketinggalan nggak";
   kalau nanti mau ramalan tanggal, ganti pakai laju 4 minggu terakhir. */
function lajuTarget(g, r){
  if (r.kini === null || r.status === 'kena') return null;
  let porsi;
  if (g.jenis === 'batas'){
    const n = new Date(), hariBulan = new Date(n.getFullYear(), n.getMonth()+1, 0).getDate();
    porsi = n.getDate() / hariBulan;
  } else {
    if (!g.tenggat || !g.mulai || g.tenggat <= g.mulai) return null;
    const total = daysBetween(g.mulai, g.tenggat), jalan = daysBetween(g.mulai, today());
    if (jalan <= 0) return null;
    porsi = clamp(jalan / total, 0, 1);
  }
  // selisih 8% dibiarin: biar nggak ngomel di hari kedua
  return { porsi, ketinggalan: r.persen < porsi - .08,
           sisaHari: g.tenggat ? daysBetween(today(), g.tenggat) : null };
}

const nilaiTarget = (jenis, v) => {
  if (v === null || v === undefined) return '–';
  const sat = T_JENIS[jenis] ? T_JENIS[jenis].sat : '';
  if (sat === 'rp')   return rpShort(v);
  if (sat === 'kg')   return (Math.round(v*10)/10).toString().replace('.',',') + ' kg';
  return Math.round(v) + ' sesi';
};

/* Gerakan yang masuk akal buat target beban: cuma yang bebannya dicatat
   (log:true), pakai gerakan yang BENERAN dipakai sekarang biar pilihan
   penggantinya ikut. Plus apa pun yang udah ada di riwayat. */
function pilihanTargetBeban(){
  const out = [], liat = new Set();
  for (const slotId in SLOT){
    const g = gerakan(slotId);
    if (!g || !g.log || liat.has(g.id)) continue;
    liat.add(g.id); out.push({ id:g.id, n:g.n });
  }
  LT().sesi.forEach(s => Object.keys(s.set || {}).forEach(k => {
    if (liat.has(k)) return;
    const n = SLOT[k] ? SLOT[k].ex.n
            : (Object.values(typeof ALT !== 'undefined' ? ALT : {}).flat().find(x => x.id === k) || {}).n;
    if (!n) return;
    liat.add(k); out.push({ id:k, n });
  }));
  return out.sort((a,b) => a.n < b.n ? -1 : 1);
}

const targetAktif = () => (S.target || []).filter(g => !g.beres);

function blokTarget(){
  const list = targetAktif();
  const kepala = `<div class="sect"><h2>Target</h2><button class="link" data-sheet="target">+ Tambah</button></div>`;
  if (!list.length) return kepala + `<div class="card"><div class="empty"><b>Belum ada target</b>Catatan lo udah jalan, tapi belum ada arahnya. Pasang satu target — angkanya dihitung sendiri dari data yang udah ada, nggak perlu diisi ulang.
    <div style="margin-top:14px"><button class="btn sm" data-sheet="target">Pasang target</button></div></div></div>`;

  return kepala + `<div class="card">${list.map(g => {
    const r = majuTarget(g); if (!r) return '';
    const l = lajuTarget(g, r);
    const warna = r.status === 'kena'  ? '--c-ok'
                : r.status === 'lewat' ? '--c-bad'
                : r.status === 'telat' ? '--c-bad'
                : l && l.ketinggalan   ? '--c-warn' : '--inv';
    const ket = r.kini === null  ? r.info
              : r.status==='kena'  ? 'Kena. ' + r.info
              : r.status==='lewat' ? 'Lewat ' + nilaiTarget(g.jenis, r.kini - r.target) + ' dari batas'
              : r.status==='telat' ? 'Tenggat ' + tgl(g.tenggat) + ' udah lewat'
              : l && l.ketinggalan ? `Ketinggalan — waktu udah kepakai ${Math.round(l.porsi*100)}%`
              : l && l.sisaHari !== null ? `Di jalur · sisa ${l.sisaHari} hari`
              : r.info;
    return `<button class="item press" data-target="${g.id}" style="width:100%;text-align:left;background:none;align-items:flex-start">
      <span class="grow">
        <span class="row between" style="margin-bottom:5px;gap:10px">
          <span class="t grow">${r.J.ic} ${esc(g.judul || r.J.n)}</span>
          <span class="xs tnum" style="font-weight:750;flex:none;white-space:nowrap;color:var(${warna})">${
            r.kini===null ? '–' : nilaiTarget(g.jenis, r.kini)}<span class="dim" style="font-weight:600"> / ${nilaiTarget(g.jenis, r.target)}</span></span>
        </span>
        <span class="bar" style="display:block"><i style="width:${(clamp(r.persen,0,1)*100).toFixed(0)}%;background:${cssv(warna)}"></i></span>
        <span class="s" style="margin-top:5px;display:block">${esc(ket)}</span>
      </span>
    </button>`;
  }).join('')}
  <div class="xs dim" style="margin:9px 2px 0">Progres diukur dari titik awal lo, bukan dari nol — jadi 70 kg menuju 80 kg itu separuh jalan kalau mulainya 60, bukan 87%.</div>
  </div>`;
}
</script>
