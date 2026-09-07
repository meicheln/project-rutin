<script>
/* ============================================================
   RUTIN — asisten Claude di dalam aplikasi
   ============================================================ */

const AI = {
  cfg: LS.get('rutin.ai', { key:'', model:'' }),
  raw: [],                       // riwayat mentah buat API
  busy: false,
  mundur: false,                 // Edge Function belum siap — cuma buat sesi ini, bukan disimpan
  save(){ LS.set('rutin.ai', this.cfg); },
  /* lewat server kalau udah masuk Supabase dan pengguna nggak sengaja milih kunci lokal */
  lewatServer(){ return !!(Cloud.ready && !this.mundur && !this.cfg.paksaLokal); },
  siap(){ return !!this.cfg.model && (this.cfg.key || this.lewatServer()); }
};

/* ---------- transport ----------
   Dua jalur, urutannya sengaja:
     1. lewat Edge Function kalau udah masuk Supabase — kuncinya nggak pernah nyentuh HP
     2. kunci lokal, buat yang belum nyambung cloud atau belum sempat deploy fungsinya
   Jalur 2 nyimpen kunci apa adanya di localStorage (LIMITATIONS §5), makanya
   jalur 1 selalu dicoba duluan dan jadi pilihan yang dipajang di pengaturan. */
async function kirimHttp(url, method, headers, body){
  const http = Native.on ? Native.p('CapacitorHttp') : null;
  if (http){
    const r = await http.request({ url, method, headers, data: body, connectTimeout:30000, readTimeout:120000 });
    const d = typeof r.data === 'string' ? JSON.parse(r.data || '{}') : r.data;
    if (r.status >= 400){
      const e = new Error((d && d.error && d.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e;
    }
    return d;
  }
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(()=>({}));
  if (!r.ok){
    const e = new Error((d.error && d.error.message) || ('HTTP ' + r.status)); e.status = r.status; throw e;
  }
  return d;
}

/* jalur 1: aplikasi cuma bawa token sesinya sendiri, kuncinya ada di server */
async function aiReqServer(method, path, body){
  const sb = await Cloud.client();
  if (!sb) throw new Error('Supabase belum diatur.');
  const { data } = await sb.auth.getSession();
  const tok = data && data.session && data.session.access_token;
  if (!tok) throw new Error('Sesi Supabase nggak ada. Masuk dulu.');
  return kirimHttp(
    Cloud.cfg.url.replace(/\/+$/, '') + '/functions/v1/asisten',
    'POST',
    { Authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
    { path, method, body }
  );
}

/* jalur 2: langsung ke Anthropic pakai kunci yang disimpan di HP */
function aiReqLangsung(method, path, body){
  if (!AI.cfg.key) throw new Error('Kunci API belum diisi.');
  return kirimHttp('https://api.anthropic.com' + path, method, {
    'x-api-key': AI.cfg.key,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
    'anthropic-dangerous-direct-browser-access': 'true'
  }, body);
}

async function aiReq(method, path, body){
  if (AI.lewatServer()){
    try{ return await aiReqServer(method, path, body); }
    catch(e){
      // 501 = kunci belum dipasang di server, 404 = fungsinya belum di-deploy.
      // Mundur ke kunci lokal cuma buat sesi ini — begitu di-deploy, langsung kepakai lagi.
      const belumSiap = (e.status === 501 || e.status === 404 || !e.status);
      if (!belumSiap || !AI.cfg.key) throw e;
      AI.mundur = true;
      console.warn('Edge Function belum siap, mundur ke kunci lokal:', e.message);
    }
  }
  return aiReqLangsung(method, path, body);
}

/* ---------- alat yang bisa dipakai asisten ---------- */
const KAT_OUT = CAT_OUT.map(c=>c.id), KAT_IN = CAT_IN.map(c=>c.id), KAT_ACT = ACTS.map(a=>a.id);

const AI_TOOLS = [
  { name:'catat_transaksi', description:'Catat uang masuk atau keluar.',
    input_schema:{ type:'object', properties:{
      tipe:{type:'string', enum:['masuk','keluar']},
      jumlah:{type:'number', description:'Rupiah, angka polos tanpa titik. "25rb" = 25000, "1,5jt" = 1500000.'},
      kategori:{type:'string', description:'Kalau keluar: '+KAT_OUT.join(', ')+'. Kalau masuk: '+KAT_IN.join(', ')},
      catatan:{type:'string'}, tanggal:{type:'string', description:'YYYY-MM-DD. Kosong = hari ini.'}
    }, required:['tipe','jumlah','kategori'] } },

  { name:'tambah_tugas', description:'Tambah tugas pekerjaan atau kuliah.',
    input_schema:{ type:'object', properties:{
      judul:{type:'string'}, proyek:{type:'string'},
      prioritas:{type:'string', enum:['tinggi','sedang','rendah']},
      tenggat:{type:'string', description:'YYYY-MM-DD'}, perkiraan_jam:{type:'number'}
    }, required:['judul'] } },

  { name:'selesaikan_tugas', description:'Tandai tugas yang sudah kelar. Cocokkan dari judulnya.',
    input_schema:{ type:'object', properties:{ judul:{type:'string'} }, required:['judul'] } },

  { name:'catat_jam_kerja', description:'Catat berapa jam kerja hari itu.',
    input_schema:{ type:'object', properties:{
      jam:{type:'number'}, proyek:{type:'string'}, catatan:{type:'string'}, tanggal:{type:'string'}
    }, required:['jam'] } },

  { name:'simpan_ide', description:'Simpan ide konten baru.',
    input_schema:{ type:'object', properties:{
      judul:{type:'string'}, platform:{type:'string'},
      status:{type:'string', enum:['ide','konsep','produksi','edit','tayang']},
      hook:{type:'string', description:'Kalimat pembuka yang nampol'},
      konsep:{type:'string', description:'Alur, referensi, catatan produksi'},
      tag:{type:'string', description:'Pisah koma'}, target_tayang:{type:'string'}
    }, required:['judul'] } },

  { name:'catat_blok_waktu', description:'Catat kegiatan di rentang jam tertentu ke linimasa harian.',
    input_schema:{ type:'object', properties:{
      mulai:{type:'string', description:'HH:MM'}, selesai:{type:'string', description:'HH:MM'},
      kategori:{type:'string', enum:KAT_ACT}, detail:{type:'string'}, tanggal:{type:'string'}
    }, required:['mulai','selesai','kategori'] } },

  { name:'centang_rutinitas', description:'Centang satu rutinitas harian sebagai selesai. Cocokkan dari namanya.',
    input_schema:{ type:'object', properties:{ nama:{type:'string'}, tanggal:{type:'string'} }, required:['nama'] } },

  { name:'atur_jam_tidur', description:'Set jam bangun dan/atau jam mulai tidur di hari tertentu.',
    input_schema:{ type:'object', properties:{
      bangun:{type:'string', description:'HH:MM'}, tidur:{type:'string', description:'HH:MM'}, tanggal:{type:'string'}
    } } },

  { name:'catat_berat', description:'Catat berat badan.',
    input_schema:{ type:'object', properties:{ kg:{type:'number'}, tanggal:{type:'string'} }, required:['kg'] } },

  { name:'catat_latihan', description:'Catat sesi olahraga.',
    input_schema:{ type:'object', properties:{
      jenis:{type:'string'}, menit:{type:'number'}, catatan:{type:'string'}, tanggal:{type:'string'}
    }, required:['jenis','menit'] } },

  { name:'catat_asupan', description:'Catat kalori dan/atau gelas air hari ini.',
    input_schema:{ type:'object', properties:{
      kalori:{type:'number'}, gelas_air:{type:'number'}, tambah_gelas:{type:'number', description:'Nambah gelas, bukan menimpa'}, tanggal:{type:'string'}
    } } },

  { name:'ubah_bab_skripsi', description:'Ubah progres, status, atau tenggat satu bab skripsi.',
    input_schema:{ type:'object', properties:{
      bab:{type:'string', description:'Nama atau nomor bab, misal "3" atau "BAB III"'},
      progres:{type:'number', description:'0-100'},
      status:{type:'string', enum:['belum','nulis','revisi','acc']}, tenggat:{type:'string'}
    }, required:['bab'] } },

  { name:'catat_bimbingan', description:'Simpan catatan hasil bimbingan sama dosen.',
    input_schema:{ type:'object', properties:{
      catatan:{type:'string'}, aksi:{type:'string', description:'Yang harus dikerjain'}, tanggal:{type:'string'}
    }, required:['catatan'] } },

  { name:'tambah_rutinitas', description:'Tambah item baru ke checklist rutinitas harian.',
    input_schema:{ type:'object', properties:{
      nama:{type:'string'}, kelompok:{type:'string', enum:['pagi','badan','fokus','malam']}
    }, required:['nama'] } },

  { name:'atur_target', description:'Ubah pengaturan target di aplikasi.',
    input_schema:{ type:'object', properties:{
      budget_bulanan:{type:'number'}, target_air:{type:'number'}, target_kalori:{type:'number'},
      target_berat:{type:'number'}, target_jam_kerja:{type:'number'}, target_jam_tidur:{type:'number'},
      target_skripsi_menit:{type:'number'}
    } } },

  { name:'baca_latihan', description:'Baca program latihan gym & basket: jadwal mingguan, isi tiap sesi, riwayat sesi terakhir beserta catatan kekurangannya, beban yang tercatat, volume angkat, dan jumlah kontak lompatan minggu ini.',
    input_schema:{ type:'object', properties:{
      sesi:{type:'string', description:'Isi id sesi kalau mau detail gerakan satu sesi: lowerA, lowerB, push, pull, upper, basketA, basketB, basketC. Kosongkan buat ringkasan semuanya.'},
      riwayat:{type:'number', description:'Berapa sesi terakhir yang mau dibaca. Bawaannya 6.'}
    } } },

  { name:'catat_sesi_latihan', description:'Tandai satu sesi latihan sudah dikerjakan, sekalian simpan catatan kekurangannya.',
    input_schema:{ type:'object', properties:{
      sesi:{type:'string', description:'id sesi: lowerA, lowerB, push, pull, upper, basketA, basketB, basketC'},
      tanggal:{type:'string'}, catatan:{type:'string', description:'Apa yang kurang atau kerasa hari itu'},
      rasa:{type:'number', description:'1 berat banget, 2 berat, 3 pas, 4 enteng, 5 kurang nampol'}
    }, required:['sesi'] } },

  { name:'ubah_jadwal_latihan', description:'Ganti sesi latihan di satu hari dalam seminggu.',
    input_schema:{ type:'object', properties:{
      hari:{type:'string', enum:['minggu','senin','selasa','rabu','kamis','jumat','sabtu']},
      sesi:{type:'array', items:{type:'string'}, description:'Daftar id sesi buat hari itu. Array kosong = hari libur.'}
    }, required:['hari','sesi'] } },

  { name:'tambah_agenda', description:'Tambah rencana ke agenda. Ini rencana ke depan, beda sama catat_blok_waktu yang nyatet apa yang udah kejadian.',
    input_schema:{ type:'object', properties:{
      judul:{type:'string'}, mulai:{type:'string', description:'HH:MM'}, selesai:{type:'string', description:'HH:MM'},
      kategori:{type:'string', enum:KAT_ACT},
      ulang:{type:'string', enum:['sekali','harian','mingguan'], description:'Bawaannya sekali.'},
      hari:{type:'array', items:{type:'number'}, description:'0=Minggu sampai 6=Sabtu. Cuma dipakai kalau ulang=mingguan.'},
      tanggal:{type:'string', description:'YYYY-MM-DD, cuma buat ulang=sekali. Kosong = hari ini.'},
      ingat:{type:'number', description:'Berapa menit sebelum mulai mau diingetin notifikasi. 0 atau kosong = nggak usah.'}
    }, required:['judul','mulai','selesai','kategori'] } },

  { name:'baca_agenda', description:'Baca agenda satu hari sekaligus perbandingan rencana vs waktu yang beneran kecatat.',
    input_schema:{ type:'object', properties:{ tanggal:{type:'string', description:'YYYY-MM-DD. Kosong = hari ini.'} } } },

  { name:'geser_agenda', description:'Geser jam atau hapus satu agenda. Cocokkan dari judulnya.',
    input_schema:{ type:'object', properties:{
      judul:{type:'string'}, mulai:{type:'string', description:'HH:MM'}, selesai:{type:'string', description:'HH:MM'},
      hapus:{type:'boolean'}
    }, required:['judul'] } },

  { name:'baca_data', description:'Baca data detail dari aplikasi buat menjawab pertanyaan atau bikin analisis.',
    input_schema:{ type:'object', properties:{
      bagian:{type:'string', enum:['uang','harian','skripsi','kerja','badan','ide','semua']},
      dari:{type:'string', description:'YYYY-MM-DD'}, sampai:{type:'string', description:'YYYY-MM-DD'}
    }, required:['bagian'] } },
];

/* ---------- pelaksana ---------- */
const tgOr = t => (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) ? t : today();
function cocok(list, q, key){
  if (!q) return null;
  const n = q.toLowerCase().trim();
  return list.find(x => String(x[key]).toLowerCase() === n)
      || list.find(x => String(x[key]).toLowerCase().includes(n))
      || list.find(x => n.includes(String(x[key]).toLowerCase()))
      || null;
}

const AI_RUN = {
  catat_transaksi(a){
    const type = a.tipe === 'masuk' ? 'in' : 'out';
    const pool = type === 'in' ? KAT_IN : KAT_OUT;
    const cat = pool.includes(a.kategori) ? a.kategori : (type==='in'?'lainin':'lainout');
    const o = { id:uid(), d:tgOr(a.tanggal), type, amt:Math.round(a.jumlah), cat, note:(a.catatan||'').trim() };
    S.txns.push(o);
    return `Tercatat ${type==='in'?'pemasukan':'pengeluaran'} ${rp(o.amt)} kategori ${catOf(cat).n} tanggal ${o.d}.`;
  },
  tambah_tugas(a){
    const o = { id:uid(), t:a.judul.trim(), proj:(a.proyek||'').trim(), prio:a.prioritas||'sedang',
                due:a.tenggat||'', est:a.perkiraan_jam||0, done:false, doneAt:'' };
    S.tasks.push(o);
    return `Tugas "${o.t}" ditambah${o.due?', tenggat '+o.due:''}, prioritas ${o.prio}.`;
  },
  selesaikan_tugas(a){
    const t = cocok(S.tasks.filter(x=>!x.done), a.judul, 't');
    if (!t) return `Nggak nemu tugas terbuka yang cocok sama "${a.judul}".`;
    t.done = true; t.doneAt = today();
    return `Tugas "${t.t}" ditandai kelar.`;
  },
  catat_jam_kerja(a){
    S.workLogs.push({ id:uid(), d:tgOr(a.tanggal), jam:+a.jam, proj:(a.proyek||'').trim(), note:(a.catatan||'').trim() });
    return `${a.jam} jam kerja dicatat di ${tgOr(a.tanggal)}.`;
  },
  simpan_ide(a){
    const o = { id:uid(), judul:a.judul.trim(), st:a.status||'ide', platform:a.platform||'', hook:(a.hook||'').trim(),
                isi:(a.konsep||'').trim(), tag:(a.tag||'').trim(), dl:a.target_tayang||'', created:today() };
    S.ide.unshift(o);
    return `Ide "${o.judul}" disimpan dengan status ${IDE_ST[o.st].n}.`;
  },
  catat_blok_waktu(a){
    const d = tgOr(a.tanggal), dd = day(d);
    const c = KAT_ACT.includes(a.kategori) ? a.kategori : 'lainact';
    dd.blocks.push({ id:uid(), s:a.mulai, e:a.selesai, c, t:(a.detail||'').trim() });
    let s = tmin(a.mulai), e = tmin(a.selesai); if (e<=s) e+=1440;
    return `Blok ${a.mulai}–${a.selesai} (${hm(e-s)}) kategori ${actOf(c).n} masuk ke linimasa ${d}.`;
  },
  centang_rutinitas(a){
    const r = cocok(S.routines, a.nama, 'n');
    if (!r) return `Nggak nemu rutinitas "${a.nama}". Yang ada: ${S.routines.map(x=>x.n).join(', ')}.`;
    const d = tgOr(a.tanggal), dd = day(d); dd.rt = dd.rt || {}; dd.rt[r.id] = true;
    return `"${r.n}" dicentang buat ${d}. Total ${routineDone(d)}/${S.routines.length} hari itu.`;
  },
  atur_jam_tidur(a){
    const d = tgOr(a.tanggal), dd = day(d);
    if (a.bangun) dd.bangun = a.bangun;
    if (a.tidur)  dd.tidur  = a.tidur;
    const sm = sleepMin(d);
    return `Tersimpan${a.bangun?', bangun '+a.bangun:''}${a.tidur?', tidur '+a.tidur:''} di ${d}.${sm?' Lama tidur '+hm(sm)+'.':''}`;
  },
  catat_berat(a){
    const d = tgOr(a.tanggal), i = S.badan.berat.findIndex(x=>x.d===d);
    if (i>=0) S.badan.berat[i].kg = +a.kg; else S.badan.berat.push({ d, kg:+a.kg });
    return `Berat ${a.kg} kg dicatat di ${d}.`;
  },
  catat_latihan(a){
    S.badan.latihan.push({ id:uid(), d:tgOr(a.tanggal), jenis:a.jenis.trim(), menit:+a.menit, note:(a.catatan||'').trim() });
    return `Latihan "${a.jenis}" ${a.menit} menit dicatat.`;
  },
  catat_asupan(a){
    const d = tgOr(a.tanggal), cur = intake(d);
    const next = { ...cur };
    if (a.kalori != null) next.kcal = +a.kalori;
    if (a.gelas_air != null) next.air = +a.gelas_air;
    if (a.tambah_gelas) next.air = (next.air||0) + +a.tambah_gelas;
    S.badan.asupan[d] = next;
    return `Asupan ${d}: ${next.kcal||0} kkal, ${next.air||0} gelas air.`;
  },
  ubah_bab_skripsi(a){
    const romawi = {1:'I',2:'II',3:'III',4:'IV',5:'V',6:'VI'};
    let b = cocok(S.skripsi.bab, a.bab, 'n');
    if (!b && /^\d+$/.test(String(a.bab).trim())) b = cocok(S.skripsi.bab, 'BAB '+romawi[+a.bab], 'n');
    if (!b) return `Nggak nemu bab "${a.bab}". Yang ada: ${S.skripsi.bab.map(x=>x.n).join(' | ')}.`;
    if (a.progres != null) b.p = clamp(Math.round(a.progres), 0, 100);
    if (a.status) b.st = a.status;
    if (a.tenggat) b.dl = a.tenggat;
    if (b.st === 'acc') b.p = 100;
    return `${b.n} sekarang ${b.p}%, status ${BAB_ST[b.st].n}${b.dl?', tenggat '+b.dl:''}. Total skripsi ${Math.round(babPct()*100)}%.`;
  },
  catat_bimbingan(a){
    S.skripsi.bimbingan.push({ id:uid(), d:tgOr(a.tanggal), catatan:a.catatan.trim(), aksi:(a.aksi||'').trim(), selesai:false });
    return `Catatan bimbingan ${tgOr(a.tanggal)} tersimpan.`;
  },
  tambah_agenda(a){
    const u = ['sekali','harian','mingguan'].includes(a.ulang) ? a.ulang : 'sekali';
    const hari = (a.hari||[]).map(Number).filter(n=>n>=0 && n<=6);
    if (u === 'mingguan' && !hari.length) return 'Buat agenda mingguan, sebutin harinya (0=Minggu sampai 6=Sabtu).';
    const o = { id:uid(), judul:a.judul.trim(), kat: KAT_ACT.includes(a.kategori)?a.kategori:'lainact',
                mulai:a.mulai, selesai:a.selesai, ulang:u, hari: u==='mingguan'?hari:[],
                tgl: u==='sekali'?tgOr(a.tanggal):'', ingat: Math.max(0, Math.round(+a.ingat||0)),
                sumber:'manual', oleh:null };
    S.agenda.push(o);
    try{ Notif.apply(); }catch(e){}
    const kapan = u==='harian' ? 'tiap hari' : u==='mingguan' ? 'tiap '+hari.map(w=>HARI[w]).join(', ') : o.tgl;
    return `Agenda "${o.judul}" ${o.mulai}–${o.selesai} (${actOf(o.kat).n}) ditaruh ${kapan}${o.ingat?', diingetin '+o.ingat+' menit sebelumnya':''}.`;
  },
  baca_agenda(a){
    const d = tgOr(a.tanggal);
    return JSON.stringify({
      tanggal: d,
      agenda: agendaHari(d).map(x => ({ judul:x.judul, kategori:actOf(x.kat).n,
        jam: x.mulai ? x.mulai+'–'+x.selesai : null, menit:menitAgenda(x), sumber:x.sumber||'manual' })),
      rencana_vs_kejadian: rencanaVsAktual(d).map(r =>
        ({ kegiatan:actOf(r.kat).n, rencana_menit:r.plan, kecatat_menit:r.real })),
      catatan: 'kecatat_menit datang dari blok waktu di linimasa. 0 berarti belum dicatat, belum tentu belum dikerjain.'
    });
  },
  geser_agenda(a){
    const x = cocok(S.agenda, a.judul, 'judul');
    if (!x) return S.agenda.length
      ? `Nggak nemu agenda "${a.judul}". Yang ada: ${S.agenda.map(v=>v.judul).join(', ')}.`
      : 'Belum ada agenda sama sekali.';
    if (a.hapus){ S.agenda = S.agenda.filter(v=>v.id!==x.id); try{ Notif.apply(); }catch(e){}
      return `Agenda "${x.judul}" dihapus.`; }
    if (a.mulai) x.mulai = a.mulai;
    if (a.selesai) x.selesai = a.selesai;
    try{ Notif.apply(); }catch(e){}
    return `Agenda "${x.judul}" sekarang ${x.mulai}–${x.selesai}.`;
  },
  tambah_rutinitas(a){
    S.routines.push({ id:uid(), n:a.nama.trim(), tag:a.kelompok||'pagi' });
    return `Rutinitas "${a.nama}" ditambah ke kelompok ${a.kelompok||'pagi'}. Sekarang ada ${S.routines.length} item.`;
  },
  atur_target(a){
    const m = { budget_bulanan:'budget', target_air:'targetAir', target_kalori:'targetKalori',
                target_berat:'beratTarget', target_jam_kerja:'jamKerjaTarget', target_jam_tidur:'targetTidur',
                target_skripsi_menit:'targetSkripsiMenit' };
    const ubah = [];
    for (const k in m) if (a[k] != null){ S.settings[m[k]] = +a[k]; ubah.push(`${k.replace(/_/g,' ')} = ${a[k]}`); }
    return ubah.length ? 'Diubah: ' + ubah.join(', ') + '.' : 'Nggak ada yang diubah.';
  },
  baca_latihan(a){
    const L = LT();
    const hariNama = ['minggu','senin','selasa','rabu','kamis','jumat','sabtu'];
    if (a.sesi && PROGRAM[a.sesi]){
      const p = PROGRAM[a.sesi];
      return JSON.stringify({ sesi:p.n, jenis:p.jenis, menit:p.menit, fokus:p.fokus,
        blok:p.blok.map(b=>({ nama:b.n, menit:b.m, catatan:b.catatan,
          gerakan:b.ex.map(e=>({ id:e.id, nama:e.n, set:e.set, rep:e.rep, istirahat:e.ist,
            intensitas:e.int, kontak_lompatan:e.kontak, catat_beban:!!e.log, petunjuk:e.cue })) })) });
    }
    const n = a.riwayat || 6;
    const riwayat = [...L.sesi].filter(s=>sesiKelar(s)>0).sort((x,y)=>x.d<y.d?1:-1).slice(0,n).map(s=>{
      const p = PROGRAM[s.sid];
      const beban = {};
      for (const ex in (s.set||{})){
        const arr = (s.set[ex]||[]).filter(v=>v && (v.kg||v.rep));
        if (arr.length){
          const nm = (p ? p.blok.flatMap(b=>b.ex).find(e=>e.id===ex) : null);
          beban[nm ? nm.n : ex] = arr.map(v=>`${v.kg||'-'}kg × ${v.rep||'-'}`).join(', ');
        }
      }
      return { tanggal:s.d, sesi:p?p.n:s.sid, persen_selesai:Math.round(sesiKelar(s)*100),
        rasa:['','berat banget','berat','pas','enteng','kurang nampol'][s.rasa||0] || null,
        catatan_kekurangan:s.kurang || null, beban_tercatat:Object.keys(beban).length?beban:null };
    });
    return JSON.stringify({
      jadwal_mingguan: Object.fromEntries(Object.entries(L.jadwal).map(([w,v])=>
        [hariNama[w], v.map(sid=>PROGRAM[sid]?PROGRAM[sid].n:sid)])),
      daftar_sesi: Object.entries(PROGRAM).map(([k,p])=>`${k}: ${p.n} (${p.menit} mnt, ${p.jenis})`),
      minggu_ini: { volume_angkat_kg: Math.round(volumeMinggu()),
        kontak_lompatan: Math.round(kontakMinggu()), batas_kontak: KONTAK_CAP },
      aturan: 'Hari lower sengaja dipisah dari basket. Batas kontak lompatan 200 per minggu buat level lanjut. Sesi gym maksimal 90 menit, basket maksimal 120 menit.',
      riwayat
    });
  },
  catat_sesi_latihan(a){
    if (!PROGRAM[a.sesi]) return `Sesi "${a.sesi}" nggak ada. Pilihannya: ${Object.keys(PROGRAM).join(', ')}.`;
    const d = tgOr(a.tanggal), s = bukaLog(d, a.sesi), p = PROGRAM[a.sesi];
    p.blok.forEach(b=>b.ex.forEach(e=>{ s.ceklis = s.ceklis||{}; s.ceklis[e.id] = true; }));
    if (a.catatan) s.kurang = a.catatan;
    if (a.rasa) s.rasa = clamp(Math.round(a.rasa),1,5);
    if (!s.dicatat){
      s.dicatat = true;
      S.badan.latihan.push({ id:uid(), d, jenis:p.n.split(' — ')[0], menit:p.menit, note:(a.catatan||'').slice(0,80) });
    }
    return `Sesi ${p.n} tanggal ${d} ditandai selesai${a.catatan?', catatan tersimpan':''}. Kontak lompatan minggu ini jadi ${Math.round(kontakMinggu())}/${KONTAK_CAP}.`;
  },
  ubah_jadwal_latihan(a){
    const hariNama = ['minggu','senin','selasa','rabu','kamis','jumat','sabtu'];
    const w = hariNama.indexOf(a.hari);
    if (w < 0) return 'Nama harinya nggak dikenal.';
    const valid = (a.sesi||[]).filter(x=>PROGRAM[x]);
    const L = LT(); L.jadwal[w] = valid;
    try{ Notif.apply(); }catch(e){}
    return `${HARI[w]} sekarang: ${valid.length ? valid.map(x=>PROGRAM[x].n.split(' — ')[0]).join(' + ') : 'libur'}.`;
  },
  baca_data(a){
    const dari = a.dari || addDays(today(), -30), sampai = a.sampai || today();
    const out = {};
    const b = a.bagian;
    if (b==='uang' || b==='semua'){
      const tx = S.txns.filter(t=>t.d>=dari && t.d<=sampai);
      const per = {}; tx.filter(t=>t.type==='out').forEach(t=>{ per[catOf(t.cat).n] = (per[catOf(t.cat).n]||0)+t.amt; });
      out.uang = { periode:[dari,sampai], masuk:inSum(tx), keluar:outSum(tx), selisih:inSum(tx)-outSum(tx),
        budget_bulanan:S.settings.budget, per_kategori:per, jumlah_transaksi:tx.length,
        transaksi_terbesar: tx.filter(t=>t.type==='out').sort((x,y)=>y.amt-x.amt).slice(0,8).map(t=>({d:t.d,jumlah:t.amt,kategori:catOf(t.cat).n,catatan:t.note})) };
    }
    if (b==='harian' || b==='semua'){
      const hari = Object.keys(S.days).filter(d=>d>=dari&&d<=sampai).sort();
      out.harian = { runtutan:streak(), rutinitas:S.routines.map(r=>({nama:r.n, kelompok:r.tag, runtutan:streakOf(r.id)})),
        hari: hari.slice(-21).map(d=>({ tanggal:d, rutinitas_persen:Math.round(routinePct(d)*100), bangun:dayRO(d).bangun,
          tidur:dayRO(d).tidur, lama_tidur_menit:sleepMin(d), mood:dayRO(d).mood, energi:dayRO(d).energi,
          catatan:dayRO(d).catatan||undefined,
          blok:(dayRO(d).blocks||[]).map(x=>`${x.s}-${x.e} ${actOf(x.c).n}${x.t?': '+x.t:''}`) })) };
    }
    if (b==='skripsi' || b==='semua'){
      // judul & nama dosen nggak dikirim. Judul nggak bikin saran jadi lebih bagus,
      // dan nama dosen itu data orang lain yang nggak pernah ikut setuju.
      out.skripsi = { target_sidang:S.skripsi.deadline,
        persen_total:Math.round(babPct()*100),
        bab:S.skripsi.bab.map(x=>({nama:x.n, persen:x.p, status:BAB_ST[x.st].n, tenggat:x.dl})),
        bimbingan:S.skripsi.bimbingan.map(x=>({tanggal:x.d, catatan:x.catatan, aksi:x.aksi})) };
    }
    if (b==='kerja' || b==='semua'){
      out.kerja = { tugas:S.tasks.map(t=>({judul:t.t, proyek:t.proj, prioritas:t.prio, tenggat:t.due, selesai:t.done})),
        jam_7_hari:jamMinggu(),
        log:S.workLogs.filter(w=>w.d>=dari&&w.d<=sampai).map(w=>({tanggal:w.d, jam:w.jam, proyek:w.proj, catatan:w.note})) };
    }
    if (b==='badan' || b==='semua'){
      out.badan = { berat:S.badan.berat.filter(x=>x.d>=dari&&x.d<=sampai),
        target_berat:S.settings.beratTarget,
        latihan:S.badan.latihan.filter(x=>x.d>=dari&&x.d<=sampai).map(l=>({tanggal:l.d, jenis:l.jenis, menit:l.menit})),
        asupan:Object.entries(S.badan.asupan).filter(([d])=>d>=dari&&d<=sampai).map(([d,v])=>({tanggal:d, ...v})) };
    }
    if (b==='ide' || b==='semua'){
      out.ide = S.ide.map(i=>({judul:i.judul, status:IDE_ST[i.st].n, platform:i.platform, hook:i.hook,
        konsep:i.isi, tag:i.tag, target_tayang:i.dl}));
    }
    return JSON.stringify(out);
  }
};

/* ---------- ringkasan buat system prompt ---------- */
function aiSnapshot(){
  const d = today(), m = d.slice(0,7), tx = txOfMonth(m);
  return JSON.stringify({
    hari_ini: d, nama_hari: HARI[fromD(d).getDay()],
    // nama sengaja nggak dikirim: nol gunanya buat analisis, dan beranda udah nyapa sendiri
    rutinitas_hari_ini: `${routineDone(d)}/${S.routines.length}`,
    daftar_rutinitas: S.routines.map(r=>r.n),
    runtutan_hari: streak(),
    uang_bulan_ini: { masuk:inSum(tx), keluar:outSum(tx), budget:S.settings.budget },
    skripsi: { persen:Math.round(babPct()*100), target_sidang:S.skripsi.deadline || null,
               bab:S.skripsi.bab.map(b=>`${b.n} ${b.p}% (${BAB_ST[b.st].n})`) },
    tugas_terbuka: S.tasks.filter(t=>!t.done).map(t=>`${t.t}${t.due?' — '+t.due:''}`),
    berat_terakhir: lastWeight() ? lastWeight().kg : null,
    ide_aktif: S.ide.filter(i=>i.st!=='tayang').length,
    latihan_hari_ini: sesiHari(d).map(sid => PROGRAM[sid] ? PROGRAM[sid].n : sid),
    agenda_hari_ini: agendaHari(d).map(a => `${a.mulai?a.mulai+'–'+a.selesai:'tanpa jam'} ${a.judul}`),
    kontak_lompatan_minggu_ini: Math.round(kontakMinggu()) + '/' + KONTAK_CAP,
    kategori_pengeluaran: KAT_OUT, kategori_pemasukan: KAT_IN, kategori_kegiatan: KAT_ACT
  });
}

const AI_SYS = () => `Kamu asisten di dalam aplikasi "Rutin" — aplikasi pelacak harian milik penggunanya sendiri.
Kamu bisa membaca dan mengubah isi aplikasi lewat alat yang tersedia.

Bahasa: Indonesia santai, kayak temen yang ngebantu. Singkat dan langsung. Jangan kaku, jangan bertele-tele.

Aturan:
- Kalau pengguna nyeritain sesuatu yang bisa dicatat, langsung catat pakai alat — jangan cuma nanya balik. Contoh: "tadi jajan 25rb" langsung catat pengeluaran makan 25000.
- Boleh panggil beberapa alat sekaligus dalam satu giliran kalau memang perlu.
- Jumlah uang: "25rb"/"25k" = 25000, "1,5jt"/"1.5 juta" = 1500000.
- Tanggal relatif: hitung dari hari ini. "kemarin", "senin lalu", "besok" — ubah jadi YYYY-MM-DD.
- Kalau info wajibnya kurang dan nggak bisa ditebak masuk akal, tanya satu pertanyaan pendek. Kalau bisa ditebak, tebak aja dan sebutkan tebakanmu.
- Buat pertanyaan analisis ("bulan ini boros di mana?", "gimana progres skripsi gua?"), pakai baca_data dulu baru jawab dengan angka konkret.
- Bedain rencana sama catatan: "besok jam 9 ada bimbingan" itu tambah_agenda, "tadi pagi 2 jam ngerjain BAB III" itu catat_blok_waktu. Kalau ditanya soal bocornya waktu, panggil baca_agenda dulu.
- Setelah nyatat, konfirmasi dalam satu kalimat. Jangan ngulang seluruh isi datanya.
- Jangan bikin janji soal notifikasi, backup, atau hal di luar alat yang kamu punya.

Soal latihan: penggunanya pemain basket level lanjut yang lagi ngejar vertical jump, gym alat lengkap.
Kalau dia minta saran latihan, panggil baca_latihan dulu — baca catatan kekurangannya, lalu kasih saran
yang nyebut gerakan dan angka spesifik. Pegang aturan ini: hari lower jangan digabung sama basket,
gym maksimal 90 menit, basket maksimal 120 menit, kontak lompatan maksimal 200 per minggu.
Kalau dia ngeluh nyeri sendi atau tanda cedera, saranin kurangi beban/kontak dan ketemu tenaga medis —
jangan sok mendiagnosis.

Kondisi aplikasi sekarang:
${aiSnapshot()}`;

/* ---------- UI ---------- */
function openAI(){
  $('#ai').classList.add('on');
  document.body.style.overflow = 'hidden';
  paintAI();
  setTimeout(()=>{ const i = $('#aiText'); i && i.focus(); }, 320);
}
function closeAI(){
  $('#ai').classList.remove('on');
  document.body.style.overflow = '';
}

function paintAI(){
  const log = $('#aiLog');
  if (!AI.siap()){
    $('#aiBar').style.display = 'none';
    log.innerHTML = `
      <div class="aiSetup">
        <div class="aiOrb"></div>
        <h3>Asisten belum nyala</h3>
        <p>${Cloud.ready
          ? 'Kuncinya ditaruh di Edge Function proyek Supabase lo — nggak pernah nyampe HP ini.'
          : 'Sambungkan kunci API Anthropic punya lo sendiri. Kuncinya disimpan cuma di HP ini, nggak dikirim ke mana-mana selain ke Anthropic langsung.'}</p>
        <div class="stack" style="text-align:left;margin-top:18px">
          ${Cloud.ready ? `
            <button class="btn block" id="aiConnectSrv">Nyalakan lewat server</button>
            <details class="acc"><summary>Belum nyiapin fungsinya?</summary>
              <div class="body">Sekali doang, dari komputer:
                <pre class="sql">supabase functions deploy asisten
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...</pre>
                Langkah lengkapnya ada di <b>docs/SUPABASE.md</b>.</div></details>
            <details class="acc"><summary>Atau simpan kunci di HP ini aja</summary>
              <div class="body">Lebih gampang, tapi kuncinya kesimpan apa adanya di HP.
                <div class="stack" style="margin-top:12px">
                  ${F.text('aiKey','Kunci API (sk-ant-…)', AI.cfg.key)}
                  <button class="btn ghost block" id="aiConnect">Pakai kunci ini</button>
                </div></div></details>
          ` : `
            ${F.text('aiKey','Kunci API (sk-ant-…)', AI.cfg.key)}
            <button class="btn block" id="aiConnect">Sambungkan</button>
          `}
          <details class="acc"><summary>Cara dapetin kuncinya</summary>
            <div class="body">Buka <b>console.anthropic.com</b> → daftar → isi saldo (minimal $5) → menu <b>API Keys</b> → <b>Create Key</b> → salin.
            <br><br>Pemakaian dibayar per pesan dan ditagih ke akun lo sendiri. Ngobrol ringan biasanya jatuhnya sangat murah, tapi ini tetap uang lo — pantau di halaman Usage.</div></details>
        </div>
      </div>`;
    /* dua tombol, satu jalan: ambil daftar model, kalau dapet berarti jalurnya hidup */
    const nyalakan = async (b, label, siapkan, batalkan) => {
      b.disabled = true; b.textContent = 'Ngecek…';
      siapkan();
      try{
        const r = await aiReq('GET', '/v1/models?limit=100');
        const ids = (r.data||[]).map(m=>m.id);
        if (!ids.length) throw new Error('Nggak ada model yang tersedia di akun ini.');
        AI.cfg.model = ids.find(i=>/sonnet|flash/i.test(i)) || ids[0];
        AI.cfg.models = ids;
        AI.save(); toast('Asisten nyala'); paintAI();
      }catch(e){
        batalkan();
        log.querySelector('.aiSetup').insertAdjacentHTML('beforeend',
          `<div class="note" style="color:var(--c-bad);margin-top:12px">${esc(e.message)}</div>`);
        b.disabled = false; b.textContent = label;
      }
    };

    const bs = $('#aiConnectSrv');
    if (bs) bs.onclick = ()=> nyalakan(bs, 'Nyalakan lewat server',
      ()=>{ AI.mundur = false; AI.cfg.paksaLokal = false; },
      ()=>{});

    const b = $('#aiConnect');
    if (b) b.onclick = ()=>{
      const k = val('aiKey').trim();
      if (!k.startsWith('sk-ant-')){ toast('Kuncinya harus diawali sk-ant-'); return; }
      nyalakan(b, Cloud.ready ? 'Pakai kunci ini' : 'Sambungkan',
        ()=>{ AI.cfg.key = k; AI.cfg.paksaLokal = true; },
        ()=>{ AI.cfg.key = ''; AI.cfg.paksaLokal = false; AI.save(); });
    };
    return;
  }

  $('#aiBar').style.display = '';
  if (!AI.raw.length){
    const usul = [
      'tadi jajan 25rb buat makan siang',
      'bab 3 udah 70 persen',
      'bulan ini gua boros di mana?',
      'ingetin: kirim revisi ke klien jumat',
      'tadi lari 30 menit',
      'ide konten: cara hemat listrik di kos',
    ];
    log.innerHTML = `
      <div class="aiHello">
        <div class="aiOrb"></div>
        <h3>Mau catat apa?</h3>
        <p>Tulis apa adanya, biar gua yang masukin ke tempat yang benar. Bisa juga nanya soal data lo sendiri.</p>
      </div>
      <div class="aiSug">${usul.map(u=>`<button class="chip" data-say="${esc(u)}">${esc(u)}</button>`).join('')}</div>`;
  }
}

function aiBubble(who, text){
  const log = $('#aiLog');
  if (log.querySelector('.aiHello') || log.querySelector('.aiSug')) log.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'msg ' + who;
  el.innerHTML = `<div class="bub">${esc(text).replace(/\n/g,'<br>')}</div>`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}
function aiAction(nama, hasil){
  const log = $('#aiLog');
  const el = document.createElement('div');
  el.className = 'aiAct';
  el.innerHTML = `<span class="tick">✓</span><span>${esc(hasil)}</span>`;
  log.appendChild(el); log.scrollTop = log.scrollHeight;
}
/* satu baris urungkan per giliran, bukan per alat — snapshot-nya juga per giliran */
function aiUrung(){
  const log = $('#aiLog');
  const el = document.createElement('div');
  el.className = 'aiAct urung';
  el.innerHTML = `<span class="tick">↺</span><span class="grow">Salah catat?</span><button type="button">Urungkan</button>`;
  el.querySelector('button').onclick = ()=>{
    const l = Undo.balikin();
    el.innerHTML = `<span class="tick">↺</span><span>${l === null ? 'Udah nggak bisa dibatalin.' : 'Dibatalin, data balik kayak sebelumnya.'}</span>`;
  };
  log.appendChild(el); log.scrollTop = log.scrollHeight;
}
function aiThinking(on){
  const log = $('#aiLog');
  let t = $('#aiDots');
  if (on){
    if (!t){ t = document.createElement('div'); t.id='aiDots'; t.className='msg ai';
      t.innerHTML = `<div class="bub dots"><i></i><i></i><i></i></div>`; log.appendChild(t); }
    log.scrollTop = log.scrollHeight;
  } else if (t) t.remove();
}

async function aiSend(text){
  if (AI.busy || !text.trim()) return;
  AI.busy = true;
  $('#aiText').value = ''; $('#aiText').style.height = 'auto';
  aiBubble('me', text);
  AI.raw.push({ role:'user', content:text });
  aiThinking(true);

  try{
    let guard = 0;
    while (guard++ < 8){
      const res = await aiReq('POST', '/v1/messages', {
        model: AI.cfg.model, max_tokens: 2048, system: AI_SYS(),
        tools: AI_TOOLS, messages: AI.raw
      });
      AI.raw.push({ role:'assistant', content: res.content });
      aiThinking(false);

      const teks = (res.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n').trim();
      if (teks) aiBubble('ai', teks);

      const pakai = (res.content||[]).filter(c=>c.type==='tool_use');
      if (!pakai.length) break;

      const hasil = [];
      // asisten nulis tanpa lo lihat formnya. Salah baca "dua juta" jadi "dua ribu"
      // sebelumnya mendarat tanpa rem — sekarang satu batch bisa diurungkan.
      const nulis = pakai.some(u => AI_RUN[u.name] && !u.name.startsWith('baca_'));
      if (nulis) Undo.simpan('yang barusan dicatat asisten');
      for (const u of pakai){
        let out;
        try{ out = AI_RUN[u.name] ? String(AI_RUN[u.name](u.input||{})) : 'Alat tidak dikenal.'; }
        catch(e){ out = 'Gagal: ' + e.message; }
        if (!u.name.startsWith('baca_')) aiAction(u.name, out);   // alat baca balikin JSON, jangan ditumpahin ke chat
        hasil.push({ type:'tool_result', tool_use_id:u.id, content: out });
      }
      commit(false); Store.flush();
      if (nulis) aiUrung();
      AI.raw.push({ role:'user', content: hasil });
      aiThinking(true);
    }
  }catch(e){
    aiThinking(false);
    const m = String(e.message||e);
    aiBubble('ai', /credit|balance|quota/i.test(m) ? 'Saldo API lo kayaknya habis. Cek di console.anthropic.com bagian Billing.'
      : /authentication|invalid.*key|401/i.test(m) ? 'Kunci API-nya ditolak. Ganti di pengaturan asisten.'
      : /not_found|model/i.test(m) ? 'Model yang dipilih nggak tersedia. Ganti modelnya di pengaturan asisten.'
      : /rate/i.test(m) ? 'Kena batas kecepatan. Tunggu sebentar terus coba lagi.'
      : 'Gagal nyambung: ' + m);
  }finally{
    aiThinking(false);
    AI.busy = false;
    render();
    $('#aiLog').scrollTop = $('#aiLog').scrollHeight;
  }
}

/* ---------- kabel ---------- */
document.addEventListener('click', ev=>{
  const s = ev.target.closest('[data-say]');
  if (s){ aiSend(s.dataset.say); return; }
  if (ev.target.closest('#aiFab')){ openAI(); return; }
  if (ev.target.closest('#aiClose')){ closeAI(); return; }
  if (ev.target.closest('#aiReset')){ AI.raw = []; paintAI(); toast('Obrolan dikosongkan'); return; }
  if (ev.target.closest('#aiGear')){ closeAI(); sheetAI(); return; }
});

function sheetAI(){
  const models = AI.cfg.models || (AI.cfg.model ? [AI.cfg.model] : []);
  const srv = AI.lewatServer();
  const jalur = srv
    ? `<div class="note" style="color:var(--c-ok)">Lewat Edge Function — kunci Anthropic nggak ada di HP ini.</div>`
    : AI.mundur
      ? `<div class="note" style="color:var(--c-warn)">Edge Function belum kejawab, lagi mundur ke kunci di HP. Deploy fungsinya biar balik aman.</div>`
      : `<div class="note" style="color:var(--c-warn)">Kunci kesimpan apa adanya di HP ini. Sambungkan Supabase, deploy fungsi <b>asisten</b>, biar kuncinya pindah ke server.</div>`;
  form('Pengaturan asisten', srv ? 'Kunci ada di server, bukan di HP' : 'Kunci disimpan di HP ini',
    jalur +
    (srv ? '' : F.text('aiK','Kunci API Anthropic', AI.cfg.key, 'sk-ant-…')) +
    (models.length ? F.sel('aiM','Model', models.map(m=>[m,m]), AI.cfg.model)
                   : F.text('aiM','Model', AI.cfg.model, 'isi kunci dulu, nanti kelist')) +
    `<button class="btn ghost block sm" id="aiRefresh">Muat ulang daftar model</button>
     ${Cloud.ready && !srv ? `<button class="btn ghost block sm" id="aiKeSrv">Pindah ke server</button>` : ''}
     <div class="note">Biaya pemakaian ditagih ke akun Anthropic lo sendiri. Pantau di console.anthropic.com bagian Usage.</div>`,
    ()=>{ if (!srv) AI.cfg.key = val('aiK').trim(); AI.cfg.model = val('aiM').trim(); AI.save(); toast('Asisten diperbarui'); },
    (AI.cfg.key || srv) ? ()=>{ AI.cfg = {key:'',model:''}; AI.raw=[]; AI.mundur=false; AI.save(); toast('Asisten diputus'); } : null);
  const ks = $('#aiKeSrv');
  if (ks) ks.onclick = async ()=>{
    ks.textContent = 'Ngecek…'; AI.mundur = false; AI.cfg.paksaLokal = false;
    try{
      await aiReqServer('GET','/v1/models?limit=1');
      AI.cfg.key = ''; AI.save(); closeSheet(); sheetAI();
      toast('Sekarang lewat server. Kunci dihapus dari HP ini.');
    }catch(e){
      AI.cfg.paksaLokal = true; AI.save();
      ks.textContent = 'Belum bisa — ' + (e.status === 501 ? 'kuncinya belum dipasang di server' : e.status === 404 ? 'fungsinya belum di-deploy' : e.message);
    }
  };
  const rb = $('#aiRefresh');
  if (rb) rb.onclick = async ()=>{
    AI.cfg.key = val('aiK').trim(); rb.textContent = 'Ngambil…';
    try{
      const r = await aiReq('GET','/v1/models?limit=100');
      AI.cfg.models = (r.data||[]).map(m=>m.id);
      if (!AI.cfg.model) AI.cfg.model = AI.cfg.models.find(i=>/sonnet|flash/i.test(i)) || AI.cfg.models[0];
      AI.save(); closeSheet(); sheetAI(); toast(`${AI.cfg.models.length} model ketemu`);
    }catch(e){ rb.textContent = 'Gagal — cek kuncinya'; }
  };
}

/* textarea auto-grow + kirim */
(function aiInput(){
  const ta = $('#aiText');
  if (!ta) return;
  ta.addEventListener('input', ()=>{ ta.style.height='auto'; ta.style.height = Math.min(ta.scrollHeight,132)+'px'; });
  ta.addEventListener('keydown', e=>{ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); aiSend(ta.value); } });
  $('#aiSend').onclick = ()=> aiSend(ta.value);
})();
</script>
