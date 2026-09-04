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
        S = rec; LS.set('rutin.state', S); return true;
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
        else { LS.set('rutin.state', S); Store.flush(); Cloud.push(); }
      });
    }catch(e){}
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

/* ---------- pengingat harian ---------- */
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

  async apply(){
    const s = S.settings;
    if (Native.on){
      const ln = Native.p('LocalNotifications'); if (!ln) return;
      try{
        const pend = await ln.getPending();
        if (pend.notifications.length) await ln.cancel({ notifications: pend.notifications });
      }catch(e){}
      const mk = (id, jam, title, body, idle) => {
        const [h,m] = (jam||'07:00').split(':').map(Number);
        return { id, title, body, schedule:{ on:{ hour:h||7, minute:m||0 }, allowWhileIdle:idle, repeats:true },
                 smallIcon:'ic_stat_rutin', channelId:'rutin-harian' };
      };
      try{
        await ln.createChannel({ id:'rutin-harian', name:'Pengingat harian',
          description:'Pengingat pagi & malam dari Rutin', importance:4, visibility:1 });
      }catch(e){}
      const susun = idle => !s.ingatkan ? [] : [
        mk(101, s.jamPagi,  'Selamat pagi' + (S.profile.nama?', '+S.profile.nama.split(' ')[0]:''),
           'Ceklis rutinitas pagi lo, terus tentuin satu hal yang wajib kelar hari ini.', idle),
        mk(102, s.jamMalam, 'Tutup hari',
           'Catat pengeluaran hari ini, isi blok waktu yang kelewat, sama jam tidur lo.', idle),
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
              smallIcon:'ic_stat_rutin', channelId:'rutin-harian' });
          }
        }
      }catch(e){}

      const kirim = async idle => {
        const paket = [...susun(idle), ...lat.map(n => idle ? n : { ...n, schedule:{ ...n.schedule, allowWhileIdle:false } })];
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
      return;
    }
    // web: cuma jalan selama aplikasi kebuka
    clearTimeout(Notif._t1); clearTimeout(Notif._t2);
    if (!s.ingatkan || !('Notification' in window) || Notification.permission !== 'granted') return;
    const arm = (jam, judul, isi, slot) => {
      const [h,m] = (jam||'07:00').split(':').map(Number);
      const now = new Date(), t = new Date();
      t.setHours(h||7, m||0, 0, 0);
      if (t <= now) t.setDate(t.getDate()+1);
      Notif['_t'+slot] = setTimeout(()=>{
        try{ new Notification(judul, { body:isi }); }catch(e){}
        arm(jam, judul, isi, slot);
      }, t - now);
    };
    arm(s.jamPagi,  'Selamat pagi', 'Ceklis rutinitas pagi lo.', 1);
    arm(s.jamMalam, 'Tutup hari',  'Catat pengeluaran & jam tidur.', 2);
  }
};
</script>
