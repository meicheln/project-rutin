<script>
/* ============================================================
   RUTIN — core
   ============================================================ */
'use strict';

/* ---------- tiny helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
const clamp = (n,a,b) => Math.max(a, Math.min(b,n));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum = (a,f=(x=>x)) => a.reduce((t,x)=>t+(+f(x)||0),0);

const pad = n => String(n).padStart(2,'0');
const D   = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today= () => D(new Date());
const fromD= s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays = (s,n) => { const d=fromD(s); d.setDate(d.getDate()+n); return D(d); };
const daysBetween = (a,b) => Math.round((fromD(b)-fromD(a))/864e5);
const HARI  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const HARI3 = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BLN3  = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const tgl   = s => { const d=fromD(s); return `${d.getDate()} ${BLN3[d.getMonth()]}`; };
const tglFull=s => { const d=fromD(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };

const rp = n => {
  const v = Math.round(Math.abs(+n||0));
  return 'Rp' + v.toLocaleString('id-ID');
};
const rpShort = n => {
  const v = Math.abs(+n||0);
  if (v >= 1e9) return 'Rp' + (v/1e9).toFixed(v>=1e10?0:1).replace('.',',') + ' M';
  if (v >= 1e6) return 'Rp' + (v/1e6).toFixed(v>=1e7?0:1).replace('.',',') + ' jt';
  if (v >= 1e3) return 'Rp' + Math.round(v/1e3) + 'rb';
  return 'Rp' + Math.round(v);
};
const hm = m => { m = Math.round(m); const h = Math.floor(m/60), mm = m%60;
  return h && mm ? `${h}j ${pad(mm)}m` : h ? `${h} jam` : `${mm} menit`; };
const hmShort = m => { m = Math.round(m); const h = Math.floor(m/60), mm = m%60;
  return h && mm ? `${h}j${pad(mm)}` : h ? `${h}j` : `${mm}m`; };
const cssv = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || v;

function toast(msg, ms=2100){
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(()=>t.classList.remove('on'), ms);
}
function buzz(p=8){ try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} }

/* ---------- storage (aman kalau localStorage diblokir) ---------- */
const mem = {};
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : (k in mem ? mem[k] : d); }
             catch(e){ return (k in mem) ? mem[k] : d; } },
  set(k, v){ mem[k] = v; try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ delete mem[k]; try{ localStorage.removeItem(k); }catch(e){} }
};

/* ---------- katalog ---------- */
const CAT_OUT = [
  {id:'makan',    n:'Makan',            ic:'🍜', c:'--c-clay'},
  {id:'transport',n:'Transport',        ic:'🛵', c:'--c-info'},
  {id:'kos',      n:'Kos & Tagihan',    ic:'🏠', c:'--c-violet'},
  {id:'kuota',    n:'Kuota & Langganan',ic:'📶', c:'--c-teal'},
  {id:'kuliah',   n:'Kuliah & Skripsi', ic:'🎓', c:'--c-lime'},
  {id:'hiburan',  n:'Hiburan',          ic:'🎬', c:'--c-pink'},
  {id:'belanja',  n:'Belanja',          ic:'🛍️', c:'--c-warn'},
  {id:'sehat',    n:'Kesehatan',        ic:'💊', c:'--c-ok'},
  {id:'lainout',  n:'Lainnya',          ic:'📦', c:'--text-3'},
];
const CAT_IN = [
  {id:'gaji',     n:'Gaji',      ic:'💼', c:'--c-ok'},
  {id:'freelance',n:'Freelance', ic:'⚡', c:'--c-teal'},
  {id:'kiriman',  n:'Kiriman',   ic:'💌', c:'--c-pink'},
  {id:'bonus',    n:'Bonus',     ic:'🎁', c:'--c-warn'},
  {id:'lainin',   n:'Lainnya',   ic:'➕', c:'--c-info'},
];
const CAT = [...CAT_OUT, ...CAT_IN];
const catOf = id => CAT.find(c=>c.id===id) || {id, n:'Lainnya', ic:'📦', c:'--text-3'};

const ACTS = [
  {id:'tidur',   n:'Tidur',        c:'--c-violet'},
  {id:'ibadah',  n:'Ibadah',       c:'--c-teal'},
  {id:'skripsi', n:'Skripsi',      c:'--c-lime'},
  {id:'kerja',   n:'Kerja',        c:'--c-info'},
  {id:'kelas',   n:'Kampus',       c:'--c-clay'},
  {id:'olahraga',n:'Olahraga',     c:'--c-ok'},
  {id:'makan',   n:'Makan',        c:'--c-warn'},
  {id:'sosial',  n:'Sosial',       c:'--c-pink'},
  {id:'santai',  n:'Santai / HP',  c:'--c-bad'},
  {id:'jalan',   n:'Perjalanan',   c:'--c-teal'},
  {id:'lainact', n:'Lainnya',      c:'--text-3'},
];
const actOf = id => ACTS.find(a=>a.id===id) || ACTS[ACTS.length-1];

const BAB_ST = {
  belum: {n:'Belum mulai', c:'--text-3'},
  nulis: {n:'Lagi nulis',  c:'--c-info'},
  revisi:{n:'Revisi',      c:'--c-warn'},
  acc:   {n:'ACC',         c:'--c-ok'},
};
const IDE_ST = {
  ide:     {n:'Ide mentah', c:'--text-3'},
  konsep:  {n:'Konsep',     c:'--c-info'},
  produksi:{n:'Produksi',   c:'--c-warn'},
  edit:    {n:'Editing',    c:'--c-violet'},
  tayang:  {n:'Tayang',     c:'--c-ok'},
};
const PRIO = { tinggi:{n:'Tinggi',c:'--c-bad'}, sedang:{n:'Sedang',c:'--c-warn'}, rendah:{n:'Rendah',c:'--text-3'} };

/* ---------- default state ---------- */
function seed(){
  return {
    v: 1,
    updatedAt: Date.now(),
    profile: { nama:'', mulai: today() },
    settings: {
      theme:'auto', budget:0, targetTidur:7, targetAir:8, targetKalori:2200,
      targetSkripsiMenit:60, beratTarget:0, jamKerjaTarget:6,
      ingatkan:false, jamPagi:'07:00', jamMalam:'21:30'
    },
    routines: [
      {id:uid(), n:'Bangun sebelum jam 6',    tag:'pagi'},
      {id:uid(), n:'Minum air begitu bangun', tag:'badan'},
      {id:uid(), n:'Beresin kamar',           tag:'pagi'},
      {id:uid(), n:'Olahraga / gerak 20 menit', tag:'badan'},
      {id:uid(), n:'Garap skripsi 1 jam',     tag:'fokus'},
      {id:uid(), n:'Catat pengeluaran hari ini', tag:'fokus'},
      {id:uid(), n:'Jauhin HP 1 jam sebelum tidur', tag:'malam'},
      {id:uid(), n:'Tidur sebelum jam 12',    tag:'malam'},
    ],
    days: {},            // 'YYYY-MM-DD': {bangun,tidur,mood,energi,catatan,rt:{},blocks:[]}
    txns: [],            // {id,d,type:'in'|'out',amt,cat,note}
    tasks: [],           // {id,t,proj,prio,due,done,doneAt,est}
    workLogs: [],        // {id,d,jam,proj,note}
    skripsi: {
      judul:'', dosen:'', deadline:'',
      bab: [
        {id:uid(), n:'BAB I — Pendahuluan',            p:0, st:'belum', dl:''},
        {id:uid(), n:'BAB II — Tinjauan Pustaka',      p:0, st:'belum', dl:''},
        {id:uid(), n:'BAB III — Metode Penelitian',    p:0, st:'belum', dl:''},
        {id:uid(), n:'BAB IV — Hasil & Pembahasan',    p:0, st:'belum', dl:''},
        {id:uid(), n:'BAB V — Penutup',                p:0, st:'belum', dl:''},
      ],
      bimbingan: [],     // {id,d,catatan,aksi}
    },
    badan: {
      berat: [],         // {d,kg}
      latihan: [],       // {id,d,jenis,menit,note}
      asupan: {},        // 'YYYY-MM-DD': {kcal, air}
    },
    ide: [],             // {id,judul,platform,st,hook,isi,tag,dl,created}
    latihan: null,       // diisi LT() pas pertama dipakai (butuh PROGRAM yang dimuat belakangan)
  };
}

let S = LS.get('rutin.state', null) || seed();
// migrasi ringan kalau ada field baru
(function migrate(){
  const base = seed();
  for (const k in base) if (!(k in S)) S[k] = base[k];
  for (const k in base.settings) if (!(k in S.settings)) S.settings[k] = base.settings[k];
  if (!S.skripsi.bab) S.skripsi.bab = base.skripsi.bab;
  if (!S.badan.asupan) S.badan.asupan = {};
})();

let pushTimer = null;
function commit(rerender = true){
  S.updatedAt = Date.now();
  LS.set('rutin.state', S);
  try{ Store.save(); }catch(e){}
  clearTimeout(pushTimer);
  pushTimer = setTimeout(()=>Cloud.push(), 1400);
  if (rerender) render();
}

/* ---------- akses harian ---------- */
function day(d = today()){
  if (!S.days[d]) S.days[d] = { bangun:'', tidur:'', mood:0, energi:0, catatan:'', rt:{}, blocks:[] };
  return S.days[d];
}
const dayRO = d => S.days[d] || { bangun:'', tidur:'', mood:0, energi:0, catatan:'', rt:{}, blocks:[] };

function routineDone(d){
  const g = dayRO(d).rt || {};
  return S.routines.filter(r => g[r.id]).length;
}
function routinePct(d){
  return S.routines.length ? routineDone(d)/S.routines.length : 0;
}
/* streak rutinitas: hari dianggap "kena" kalau >=60% rutinitas dicentang */
function streak(){
  let n = 0, d = today();
  if (routinePct(d) < .6) d = addDays(d,-1);          // hari ini belum kelar? mulai dari kemarin
  while (routinePct(d) >= .6 && S.days[d]) { n++; d = addDays(d,-1); }
  return n;
}
function streakOf(rid){
  let n = 0, d = today();
  if (!(dayRO(d).rt||{})[rid]) d = addDays(d,-1);
  while ((dayRO(d).rt||{})[rid]) { n++; d = addDays(d,-1); }
  return n;
}

/* durasi tidur yang berakhir di pagi hari d (dari jam tidur kemarin ke jam bangun hari itu) */
function sleepMin(d){
  const mulai = dayRO(addDays(d,-1)).tidur, bangun = dayRO(d).bangun;
  if (!mulai || !bangun) return 0;
  let s = tmin(mulai), e = tmin(bangun);
  if (e <= s) e += 1440;
  const dur = e - s;
  return dur > 0 && dur < 900 ? dur : 0;
}

/* ---------- tema ---------- */
const ICON_SUN  = '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const ICON_MOON = '<path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z"/>';
function applyTheme(){
  const pref = S.settings.theme;
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = pref === 'auto' ? sysDark : pref === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('#themeIcon').innerHTML = dark ? ICON_SUN : ICON_MOON;
  $('#metaTheme').setAttribute('content', dark ? '#0E0F11' : '#F6F6F7');
  try{ Native.paintStatusBar(); }catch(e){}
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{ if(S.settings.theme==='auto') applyTheme(); });

/* ---------- navigasi ---------- */
let view = 'home';
let dayCur = today();
let monCur = today().slice(0,7);
let progTab = 'latihan';

function go(v){
  view = v;
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-'+v));
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === v));
  window.scrollTo({top:0});
  buzz(6);
  render();
}

/* ---------- sheet ---------- */
let sheetOnClose = null;
function openSheet(html, onClose){
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.add('on');
  $('#scrim').classList.add('on');
  document.body.style.overflow = 'hidden';
  sheetOnClose = onClose || null;
}
function closeSheet(){
  $('#sheet').classList.remove('on');
  $('#scrim').classList.remove('on');
  document.body.style.overflow = '';
  clearTimeout(closeSheet._t);
  closeSheet._t = setTimeout(()=>{ if (!$('#sheet').classList.contains('on')) $('#sheetBody').innerHTML = ''; }, 420);
  if (sheetOnClose) { const f = sheetOnClose; sheetOnClose = null; f(); }
}
$('#scrim').addEventListener('click', closeSheet);

/* ---------- Supabase ---------- */
const Cloud = {
  cfg: LS.get('rutin.sb', null),
  sb: null, user: null, ready: false, busy: false,

  configured(){ return !!(this.cfg && this.cfg.url && this.cfg.key); },

  async client(){
    if (this.sb) return this.sb;
    if (!this.configured()) return null;
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    this.sb = createClient(this.cfg.url, this.cfg.key, { auth:{ persistSession:true, storageKey:'rutin.auth' } });
    return this.sb;
  },

  async restore(){
    if (!this.configured()) return false;
    try{
      const sb = await this.client();
      const { data } = await sb.auth.getSession();
      if (data && data.session){ this.user = data.session.user; this.ready = true; return true; }
    }catch(e){ console.warn('supabase restore', e); }
    return false;
  },

  async signIn(email, pass, mode){
    const sb = await this.client();
    if (!sb) throw new Error('Supabase belum diatur');
    const fn = mode === 'up' ? 'signUp' : 'signInWithPassword';
    const { data, error } = await sb.auth[fn]({ email, password: pass });
    if (error) throw error;
    if (!data.user) throw new Error('Cek email lo buat konfirmasi dulu ya.');
    if (mode === 'up' && !data.session) throw new Error('Akun dibuat. Cek email buat konfirmasi, terus masuk lagi.');
    this.user = data.user; this.ready = true;
    return true;
  },

  async signOut(){
    try{ const sb = await this.client(); sb && await sb.auth.signOut(); }catch(e){}
    this.user = null; this.ready = false;
  },

  async pull(){
    if (!this.ready) return null;
    const sb = await this.client();
    const { data, error } = await sb.from('rutin_state').select('data,updated_at').eq('user_id', this.user.id).maybeSingle();
    if (error) throw error;
    return data;
  },

  async push(force){
    if (!this.ready || this.busy) return;
    this.busy = true; setSync('sync');
    try{
      const sb = await this.client();
      const { error } = await sb.from('rutin_state')
        .upsert({ user_id:this.user.id, data:S, updated_at:new Date().toISOString() }, { onConflict:'user_id' });
      if (error) throw error;
      LS.set('rutin.lastsync', Date.now());
      setSync('ok');
    }catch(e){ console.warn('push', e); setSync('err'); }
    finally{ this.busy = false; }
  },

  async syncDown(){
    try{
      setSync('sync');
      const remote = await this.pull();
      if (remote && remote.data && remote.data.updatedAt && remote.data.updatedAt > (S.updatedAt||0)){
        S = remote.data;
        LS.set('rutin.state', S);
        setSync('ok'); render(); toast('Data terbaru ditarik dari cloud');
      } else {
        await this.push(true);
      }
      LS.set('rutin.lastsync', Date.now());
      setSync('ok');
    }catch(e){ console.warn('syncDown', e); setSync('err'); }
  }
};
function setSync(st){
  const b = $('#syncBtn'); if (!b) return;
  b.classList.toggle('live', st === 'ok');
  b.style.opacity = st === 'sync' ? .5 : 1;
  b.dataset.st = st;
}
</script>
