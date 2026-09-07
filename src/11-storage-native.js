<script>
/* ============================================================
   RUTIN — penyimpanan tahan banting, jembatan native, pengingat
   ============================================================ */

/* ---------- IndexedDB ---------- */
const IDB = {
  db: null,
  open(){
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      let r;
      try { r = indexedDB.open('rutin', 1); } catch(e){ return rej(e); }
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('kv')) r.result.createObjectStore('kv'); };
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror  = () => rej(r.error);
      r.onblocked = () => rej(new Error('idb blocked'));
    });
  },
  async get(k){
    const db = await this.open();
    return new Promise((res, rej) => {
      const q = db.transaction('kv','readonly').objectStore('kv').get(k);
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
  },
  async set(k, v){
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('kv','readwrite');
      t.objectStore('kv').put(v, k);
      t.oncomplete = () => res(true); t.onerror = () => rej(t.error);
    });
  }
};

/* Penulisan bertingkat: localStorage langsung (sinkron, anti mati mendadak),
   IndexedDB nyusul (muat lebih banyak & lebih tahan). */
const Store = {
  ok: false, t: null, lastWrite: 0,
  async init(){ try{ await IDB.open(); this.ok = true; }catch(e){ this.ok = false; console.warn('idb off', e); } },
  async load(){
    if (!this.ok) return false;
    try{
      const rec = await IDB.get('state');
      if (rec && rec.v && (rec.updatedAt||0) > (S.updatedAt||0)){
        S = rec; migrate(); LS.set('rutin.state', S); return true;
      }
    }catch(e){ console.warn('idb load', e); }
    return false;
  },
  save(){ if (!this.ok) return; clearTimeout(this.t); this.t = setTimeout(()=>this.flush(), 250); },
  async flush(){
    if (!this.ok) return;
    clearTimeout(this.t);
    try{ await IDB.set('state', S); this.lastWrite = Date.now(); }catch(e){ console.warn('idb save', e); }
  }
};
['pagehide','freeze','blur'].forEach(ev => window.addEventListener(ev, ()=>{ LS.set('rutin.state', S); Store.flush(); }));
document.addEventListener('visibilitychange', ()=>{ if (document.hidden){ LS.set('rutin.state', S); Store.flush(); } });

/* ---------- jembatan native (Capacitor) ---------- */
const Native = {
  get cap(){ return window.Capacitor; },
  get on(){ try{ return !!(this.cap && this.cap.isNativePlatform && this.cap.isNativePlatform()); }catch(e){ return false; } },
  p(name){ try{ return this.cap.Plugins[name]; }catch(e){ return null; } },

  async init(){
    if (!this.on) return;
    document.documentElement.classList.add('native');
    try{
      const sb = this.p('StatusBar');
      if (sb){ await sb.setOverlaysWebView({ overlay:false }); this.paintStatusBar(); }
    }catch(e){}
    try{ const sp = this.p('SplashScreen'); sp && setTimeout(()=>sp.hide(), 220); }catch(e){}

    // tombol back Android
    try{
      const app = this.p('App');
      app && app.addListener('backButton', () => {
        if ($('#ai').classList.contains('on')) return closeAI();
        if ($('#sheet').classList.contains('on')) return closeSheet();
        if ($('#gate').classList.contains('on')) return;
        if (view !== 'home') return go('home');
        app.exitApp();
      });
      app && app.addListener('appStateChange', st => {
        if (st.isActive){ const t = today(); if (t !== lastDay){ lastDay = t; dayCur = t; monCur = t.slice(0,7); render(); } Cloud.syncDown(); }
        else {
          LS.set('rutin.state', S); Store.flush(); Cloud.push();
          // teks notifikasi dikarang dari keadaan sekarang — disegerin pas HP ditaruh,
          // jadi pengingat besok pagi nggak nyebut angka kemarin. Sejam sekali cukup.
          if (Date.now() - (Notif.terakhirApply||0) > 36e5) Notif.apply();
        }
      });
    }catch(e){}
    Notif.pasangAksi();
  },

  async paintStatusBar(){
    if (!this.on) return;
    try{
      const sb = this.p('StatusBar'); if (!sb) return;
      const dark = document.documentElement.dataset.theme === 'dark';
      await sb.setStyle({ style: dark ? 'DARK' : 'LIGHT' });   // DARK = teks terang
      await sb.setBackgroundColor({ color: dark ? '#0E0F11' : '#F6F6F7' });
    }catch(e){}
  }
};

/* ---------- pengingat ---------- */
const CH_HARIAN = 'rutin-harian', CH_IST = 'rutin-istirahat';
const ID_IST = 250, ID_SNOOZE = 299, ID_AGENDA = 300;   // agenda: 8 slot per item, 300-491

/* Sinonim buat nebak kategori dari balasan notifikasi. Sengaja pendek —
   cuma kata yang beneran sering diketik dari layar kunci. */
const SINONIM = {
  makan:    ['makan','nasi','kopi','jajan','sarapan','warteg','gofood','ayam','bakso','mie'],
  transport:['bensin','ojek','grab','gojek','angkot','parkir','tol','bus','kereta'],
  kuota:    ['kuota','pulsa','langganan','netflix','spotify'],
  kos:      ['kos','listrik','wifi','sewa','galon'],
  kuliah:   ['print','fotokopi','skripsi','jurnal','ukt','kampus'],
  sehat:    ['obat','dokter','vitamin','apotek'],
  hiburan:  ['nonton','bioskop','game'],
  belanja:  ['belanja','baju','sepatu'],
};
const tebakKatOut = t => (Object.entries(SINONIM).find(([,kata]) => kata.some(k => t.includes(k))) || ['lainout'])[0];

/* Parser balasan notifikasi. Sengaja kecil: cuma pola yang paling sering diketik dari
   layar kunci, dan jalan tanpa sinyal sama sekali. Yang nggak kekenal disimpan jadi
   catatan harian — nggak ada balasan yang hilang diam-diam.
   Ngubah S langsung; pemanggilnya yang commit(). */
function parseCepat(teks){
  const t = String(teks).toLowerCase().trim();
  const d = today();
  const angka = x => parseFloat(String(x).replace(',','.'));
  const adaSatuan = /\d\s*(rb|ribu|k\b|jt|juta)/.test(t);

  // air duluan, biar "2 gelas" nggak kebaca duit
  let m = t.match(/(\d+)?\s*(gelas|air|minum)/);
  if (m && !adaSatuan && !/obat|dokter|vitamin/.test(t) && (!m[1] || +m[1] < 20)){
    const n = m[1] ? +m[1] : 1, i = intake(d);
    S.badan.asupan[d] = { ...i, air: (i.air||0) + n };
    return `${n} gelas air dicatat, total ${S.badan.asupan[d].air}.`;
  }

  m = t.match(/berat\D*(\d+(?:[.,]\d+)?)/) || t.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (m){
    const kg = angka(m[1]);
    if (kg > 25 && kg < 250){
      const i = S.badan.berat.findIndex(x => x.d === d);
      if (i >= 0) S.badan.berat[i].kg = kg; else S.badan.berat.push({ d, kg });
      return `Berat ${String(kg).replace('.',',')} kg dicatat.`;
    }
  }

  // uang: wajib ada satuan atau nilainya >= 1000, biar "berat 67" nggak kebaca duit
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/);
  if (m && m[1] && (m[2] || angka(m[1]) >= 1000)){
    let n = angka(m[1]);
    if (/rb|ribu|k/.test(m[2]||'')) n *= 1000;
    if (/jt|juta/.test(m[2]||'')) n *= 1e6;
    const masuk = /(masuk|gaji|dapet|dapat|terima|bonus|transfer|kiriman|freelance)/.test(t);
    const cat = masuk ? (CAT_IN.find(c => t.includes(c.n.toLowerCase())) || {id:'lainin'}).id : tebakKatOut(t);
    S.txns.push({ id:uid(), d, type: masuk?'in':'out', amt: Math.round(n), cat, note: String(teks).slice(0,60) });
    return `${masuk?'+':'−'}${rp(n)} ${catOf(cat).n} dicatat.`;
  }

  const o = day(d);
  o.catatan = (o.catatan ? o.catatan + '\n' : '') + '· ' + teks;
  return 'Nggak kebaca otomatis — disimpan ke catatan hari ini.';
}

const Notif = {
  async izin(){
    if (Native.on){
      const ln = Native.p('LocalNotifications'); if (!ln) return false;
      let r = await ln.checkPermissions();
      if (r.display !== 'granted') r = await ln.requestPermissions();
      if (r.display !== 'granted') return false;
      // alarm presisi: kalau belum diizinin, pengingat bisa meleset sampai berjam-jam pas HP lagi tidur
      try{
        if (ln.checkExactNotificationSetting){
          const ex = await ln.checkExactNotificationSetting();
          if (ex && ex.exact_alarm !== 'granted'){
            if (confirm('Biar pengingatnya tepat waktu, Android minta izin "alarm & pengingat". Buka pengaturannya sekarang?')){
              await ln.changeExactNotificationSetting();
            }
          }
        }
      }catch(e){}
      return true;
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  },

  /* Isi notifikasi dikarang dari keadaan sekarang, bukan kalimat mati. Dikarang pas
     dijadwalin, jadi bisa basi kalau app nggak dibuka seharian — makanya apply()
     diulang tiap app pindah ke latar. Lihat LIMITATIONS §19. */
  teksPagi(){
    const d = today(), sisa = S.routines.length - routineDone(d);
    const b = [];
    if (sisa > 0) b.push(`${sisa} rutinitas nunggu`);
    try{
      const ag = agendaHari(d).filter(a => a.mulai);
      if (ag.length) b.push(`pertama ${ag[0].judul} jam ${ag[0].mulai}`);
    }catch(e){}
    return b.length ? b.join(' · ') + '.' : 'Kosong hari ini. Tentuin satu hal yang wajib kelar.';
  },
  teksMalam(){
    const d = today(), o = dayRO(d), b = [];
    try{
      const keluar = outSum(txOfDay(d));
      b.push(keluar ? `Keluar hari ini ${rpShort(keluar)}` : 'Pengeluaran belum kecatat');
      const jam = sum(o.blocks||[], x => { let s = tmin(x.s), e = tmin(x.e); if (e <= s) e += 1440; return e - s; });
      if (jam < 240) b.push('linimasa masih bolong');
    }catch(e){}
    if (!o.tidur) b.push('jam tidur belum diisi');
    return b.join(' · ') + '.';
  },

  /* Pengingat per item agenda, "ingat" menit sebelum mulai.
     8 id per item: dasar buat sekali/harian, dasar+1..+7 buat tiap hari yang mingguan. */
  susunAgenda(){
    const out = [];
    (S.agenda||[]).filter(a => +a.ingat > 0 && a.mulai).slice(0, 24).forEach((a, i) => {
      const dasar = ID_AGENDA + i*8;
      const t = tmin(a.mulai) - (+a.ingat);
      const mundur = t < 0 ? 1 : 0;                      // ingat kelewat tengah malam -> mundur sehari
      const mnt = ((t % 1440) + 1440) % 1440;
      const h = Math.floor(mnt/60), m = mnt % 60;
      const umum = { title: a.judul,
        body: `${a.mulai}–${a.selesai} · ${actOf(a.kat).n}. Balas buat langsung nyatet.`,
        smallIcon:'ic_stat_rutin', channelId:CH_HARIAN, actionTypeId:'rutin-agenda', extra:{ agenda:a.id } };
      if (a.ulang === 'harian'){
        out.push({ ...umum, id:dasar, schedule:{ on:{hour:h, minute:m}, allowWhileIdle:true, repeats:true } });
      } else if (a.ulang === 'mingguan'){
        (a.hari||[]).forEach(w => {
          const ww = ((w - mundur) % 7 + 7) % 7;
          out.push({ ...umum, id: dasar + 1 + ww,
            schedule:{ on:{weekday: ww+1, hour:h, minute:m}, allowWhileIdle:true, repeats:true } });
        });
      } else if (a.tgl){
        const at = fromD(a.tgl); at.setHours(h, m, 0, 0);
        if (mundur) at.setDate(at.getDate() - 1);
        if (at > new Date()) out.push({ ...umum, id:dasar, schedule:{ at, allowWhileIdle:true } });
      }
    });
    return out;
  },

  async apply(){
    const s = S.settings;
    if (Native.on){
      const ln = Native.p('LocalNotifications'); if (!ln) return;
      try{
        const pend = await ln.getPending();
        // timer istirahat jangan ikut kebatalin — dia hidup di luar siklus ini
        const buang = pend.notifications.filter(n => n.id !== ID_IST);
        if (buang.length) await ln.cancel({ notifications: buang });
      }catch(e){}
      const mk = (id, jam, title, body, idle) => {
        const [h,m] = (jam||'07:00').split(':').map(Number);
        return { id, title, body, schedule:{ on:{ hour:h||7, minute:m||0 }, allowWhileIdle:idle, repeats:true },
                 smallIcon:'ic_stat_rutin', channelId:CH_HARIAN, actionTypeId:'rutin-balas' };
      };
      try{
        await ln.createChannel({ id:CH_HARIAN, name:'Pengingat harian',
          description:'Pengingat pagi, malam, agenda & hari latihan', importance:4, visibility:1 });
        await ln.createChannel({ id:CH_IST, name:'Timer istirahat',
          description:'Bunyi pas istirahat antar set habis', importance:5, visibility:1 });
      }catch(e){}
      const susun = idle => !s.ingatkan ? [] : [
        mk(101, s.jamPagi,  'Selamat pagi' + (S.profile.nama?', '+S.profile.nama.split(' ')[0]:''),
           this.teksPagi(), idle),
        mk(102, s.jamMalam, 'Tutup hari', this.teksMalam(), idle),
      ];
      // pengingat hari latihan
      const lat = [];
      try{
        const L = LT();
        if (L.ingatLatihan){
          const [lh,lm] = (L.jamIngat||'06:30').split(':').map(Number);
          for (let w = 0; w < 7; w++){
            const list = L.jadwal[w] || [];
            if (!list.length) continue;
            const nama = list.map(sid => PROGRAM[sid] ? PROGRAM[sid].n.split(' — ')[0] : sid).join(' + ');
            const menit = list.reduce((t,sid)=> t + (PROGRAM[sid] ? PROGRAM[sid].menit : 0), 0);
            lat.push({ id: 210 + w, title: 'Hari ini: ' + nama, body: `Total sekitar ${menit} menit. Buka aplikasi buat lihat detail gerakannya.`,
              schedule:{ on:{ weekday: w + 1, hour: lh || 6, minute: lm || 30 }, allowWhileIdle:true, repeats:true },
              smallIcon:'ic_stat_rutin', channelId:CH_HARIAN });
          }
        }
      }catch(e){}
      let ag = [];
      try{ ag = this.susunAgenda(); }catch(e){ console.warn('agenda notif', e); }

      const kirim = async idle => {
        const sisanya = [...lat, ...ag].map(n => idle ? n : { ...n, schedule:{ ...n.schedule, allowWhileIdle:false } });
        const paket = [...susun(idle), ...sisanya];
        if (!paket.length) return;
        await ln.schedule({ notifications: paket });
      };
      try{
        await kirim(true);
      }catch(e){
        // Android 14 bisa nolak alarm presisi — mundur ke jadwal biasa
        try{ await kirim(false); }
        catch(e2){ console.warn('notif', e2); }
      }
      this.terakhirApply = Date.now();
      return;
    }
    // web: cuma jalan selama aplikasi kebuka, dan nggak bisa dibalas
    (this._web||[]).forEach(clearTimeout);
    this._web = [];
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const arm = (jam, judul, isi) => {
      const [h,m] = (jam||'07:00').split(':').map(Number);
      const now = new Date(), t = new Date();
      t.setHours(h||7, m||0, 0, 0);
      if (t <= now) t.setDate(t.getDate()+1);
      this._web.push(setTimeout(()=>{
        try{ new Notification(judul, { body:isi }); }catch(e){}
        arm(jam, judul, isi);
      }, t - now));
    };
    if (s.ingatkan){
      arm(s.jamPagi,  'Selamat pagi', this.teksPagi());
      arm(s.jamMalam, 'Tutup hari',   this.teksMalam());
    }
    (S.agenda||[]).filter(a => +a.ingat > 0 && a.mulai).slice(0, 24).forEach(a => {
      const mnt = ((tmin(a.mulai) - +a.ingat) % 1440 + 1440) % 1440;
      arm(`${pad(Math.floor(mnt/60))}:${pad(mnt%60)}`, a.judul, `${a.mulai}–${a.selesai} · ${actOf(a.kat).n}`);
    });
    this.terakhirApply = Date.now();
  },

  /* Tombol & kolom balasan di notifikasi. Dipasang sekali dari Native.init(). */
  async pasangAksi(){
    if (this._aksi || !Native.on) return;
    const ln = Native.p('LocalNotifications'); if (!ln) return;
    this._aksi = true;
    try{
      if (ln.registerActionTypes) await ln.registerActionTypes({ types:[
        { id:'rutin-balas', actions:[
          { id:'balas', title:'Balas', input:true, inputPlaceholder:'25rb makan · 2 gelas · berat 67' },
          { id:'lewati', title:'Nanti' } ] },
        { id:'rutin-agenda', actions:[
          { id:'balas', title:'Balas', input:true, inputPlaceholder:'25rb makan · 2 gelas · berat 67' },
          { id:'geser', title:'Geser 15m' },
          { id:'lewati', title:'Lewati' } ] },
      ]});
      if (ln.addListener) ln.addListener('localNotificationActionPerformed', ev => {
        try{ Notif.tanggapi(ev); }catch(e){ console.warn('balasan notif', e); }
      });
    }catch(e){ console.warn('aksi notif', e); }
  },

  /* Balasan dari notifikasi. Ini jalur kendali dua arah: dari layar kunci ke data. */
  tanggapi(ev){
    const n = (ev && ev.notification) || {};
    const aksi = (ev && ev.actionId) || '';
    const teks = String((ev && ev.inputValue) || '').trim();

    if (aksi === 'geser'){
      // cuma nunda notifikasinya, JANGAN geser agendanya — item harian/mingguan
      // bakal kegeser selamanya kalau datanya yang diubah
      const ln = Native.p('LocalNotifications');
      try{
        ln && ln.schedule({ notifications:[{ id:ID_SNOOZE, title:n.title||'Pengingat', body:n.body||'',
          smallIcon:'ic_stat_rutin', channelId:CH_HARIAN, actionTypeId:'rutin-agenda', extra:n.extra||{},
          schedule:{ at:new Date(Date.now() + 15*60000), allowWhileIdle:true } }] });
      }catch(e){}
      toast('Diingetin lagi 15 menit lagi');
      return;
    }
    if (aksi === 'lewati' || !teks) return;
    // nulis tanpa lo lihat formnya — jadi wajib ada rem. Salah baca angka bisa dibatalin.
    tulisBisaUrung('balasan "' + teks.slice(0,28) + '"', ()=>{ const h = parseCepat(teks); commit(); return h; });
  },

  /* Alarm timer istirahat — ini yang bikin timer selamat waktu layar mati. */
  async alarmIstirahat(akhir){
    if (!Native.on) return;
    const ln = Native.p('LocalNotifications'); if (!ln) return;
    try{
      await ln.cancel({ notifications:[{ id:ID_IST }] });
      await ln.schedule({ notifications:[{ id:ID_IST, title:'Istirahat habis',
        body:'Lanjut ke set berikutnya.', smallIcon:'ic_stat_rutin', channelId:CH_IST,
        schedule:{ at:new Date(akhir), allowWhileIdle:true } }] });
    }catch(e){}
  },
  async batalIstirahat(){
    if (!Native.on) return;
    const ln = Native.p('LocalNotifications'); if (!ln) return;
    try{ await ln.cancel({ notifications:[{ id:ID_IST }] }); }catch(e){}
  }
};

</script>
