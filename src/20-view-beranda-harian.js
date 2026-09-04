<script>
/* ============================================================
   RUTIN — layar Beranda & Harian
   ============================================================ */

/* ---------- turunan data ---------- */
const txOfMonth = m => S.txns.filter(t => t.d.startsWith(m));
const txOfDay   = d => S.txns.filter(t => t.d === d);
const inSum  = a => sum(a.filter(t=>t.type==='in'),  t=>t.amt);
const outSum = a => sum(a.filter(t=>t.type==='out'), t=>t.amt);
const saldoTotal = () => inSum(S.txns) - outSum(S.txns);

const babPct = () => S.skripsi.bab.length ? sum(S.skripsi.bab, b=>b.p)/S.skripsi.bab.length/100 : 0;
const tasksOpen = () => S.tasks.filter(t=>!t.done);
const overdue = () => tasksOpen().filter(t=>t.due && t.due < today());
const dueToday = () => tasksOpen().filter(t=>t.due === today());
const lastWeight = () => { const a=[...S.badan.berat].sort((x,y)=>x.d<y.d?-1:1); return a.length?a[a.length-1]:null; };
const intake = d => (S.badan.asupan[d] || {kcal:0, air:0});
const jamMinggu = () => { const s7 = addDays(today(),-6);
  return sum(S.workLogs.filter(w=>w.d>=s7), w=>w.jam); };

function deadlines(){
  const out = [];
  S.skripsi.bab.forEach(b=>{ if(b.dl && b.st!=='acc') out.push({t:b.n, d:b.dl, k:'Skripsi'}); });
  if (S.skripsi.deadline) out.push({t:'Target sidang', d:S.skripsi.deadline, k:'Skripsi'});
  S.tasks.filter(t=>!t.done && t.due).forEach(t=>out.push({t:t.t, d:t.due, k:'Kerja'}));
  S.ide.filter(i=>i.dl && i.st!=='tayang').forEach(i=>out.push({t:i.judul, d:i.dl, k:'Konten'}));
  return out.sort((a,b)=>a.d<b.d?-1:1);
}

/* ---------- render dispatcher ---------- */
function render(){
  applyTheme();
  if (view==='home')  renderHome();
  if (view==='day')   renderDay();
  if (view==='money') renderMoney();
  if (view==='prog')  renderProg();
  if (view==='idea')  renderIdea();
}

/* ============================ BERANDA ============================ */
function renderHome(){
  const h = new Date().getHours();
  const salam = h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam';
  const nm = S.profile.nama ? ', ' + S.profile.nama.split(' ')[0] : '';
  $('#greet').textContent = salam + nm;
  $('#todayStr').textContent = tglFull(today());

  const d = today(), dr = dayRO(d);
  const pct = routinePct(d), st = streak();
  const m = today().slice(0,7), tx = txOfMonth(m);
  const masuk = inSum(tx), keluar = outSum(tx);
  const bud = +S.settings.budget||0;
  const sisaBud = bud - keluar;
  const dlm = deadlines().slice(0,4);
  const w = lastWeight();
  const ins = intake(d);
  const od = overdue().length, dt = dueToday().length;

  // tren 7 hari rutinitas
  const tren7 = [...Array(7)].map((_,i)=>{ const dd = addDays(d, -(6-i));
    return { l: HARI3[fromD(dd).getDay()], v: Math.round(routinePct(dd)*100), dim: routinePct(dd)===0 }; });

  const quick = [
    ['out','Pengeluaran','−'], ['in','Pemasukan','+'],
    ['task','Tugas','✓'], ['idea','Ide','◇'], ['berat','Berat','⚖']
  ];

  $('#homeBody').innerHTML = `
  <div class="card" style="padding:18px 16px">
    <div class="row" style="gap:16px">
      <div class="ringwrap">
        ${ring(pct, 84, 9, pct>=1?'--c-ok':'--inv')}
        <div class="rc"><div style="font-size:20px;font-weight:800;letter-spacing:-.04em" class="tnum">${Math.round(pct*100)}<span style="font-size:11px">%</span></div>
        <div style="font-size:9.5px;font-weight:650;color:var(--text-3);margin-top:-2px">rutinitas</div></div>
      </div>
      <div class="grow">
        <div class="row between" style="margin-bottom:9px">
          <div>
            <div class="lbl">Runtutan</div>
            <div class="mid tnum">${st} hari <span style="font-size:13px">${st>=3?'🔥':''}</span></div>
          </div>
          <div style="text-align:right">
            <div class="lbl">Selesai</div>
            <div class="mid tnum">${routineDone(d)}<span class="dim" style="font-size:13px">/${S.routines.length}</span></div>
          </div>
        </div>
        <div class="bar"><i style="width:${(pct*100).toFixed(0)}%;background:${pct>=1?cssv('--c-ok'):cssv('--inv')}"></i></div>
        <div class="xs dim" style="margin-top:7px">${pct>=1?'Kelar semua. Mantap.':pct>=.6?'Dikit lagi, sisa '+(S.routines.length-routineDone(d))+' item.':'Yuk mulai dari yang paling gampang.'}</div>
      </div>
    </div>
  </div>

  <div class="swipe" style="margin-top:12px">
    ${quick.map(([k,l,g])=>`<button class="chip press" data-sheet="${k}" style="padding:9px 14px">
      <span style="font-weight:800;margin-right:5px;opacity:.6">${g}</span>${l}</button>`).join('')}
  </div>

  ${od+dt>0 ? `<div class="card tight" style="margin-top:12px;border-color:${od?cssv('--c-bad-soft'):cssv('--border')}">
    <div class="row"><span class="dot" style="background:var(${od?'--c-bad':'--c-warn'})"></span>
    <div class="grow sm"><b>${od?od+' tugas telat':''}${od&&dt?' · ':''}${dt?dt+' jatuh tempo hari ini':''}</b></div>
    <button class="chip" data-go="prog" data-ptab="kerja">Lihat</button></div></div>`:''}

  <div class="sect"><h2>Bulan ini</h2><span class="link" data-go="money">Detail →</span></div>
  <div class="card">
    <div class="row between" style="align-items:flex-start">
      <div>
        <div class="lbl">Sisa arus kas</div>
        <div class="big tnum" style="color:${masuk-keluar>=0?cssv('--c-ok'):cssv('--c-bad')}">${masuk-keluar<0?'−':''}${rp(masuk-keluar)}</div>
      </div>
      <div style="text-align:right">
        <div class="xs" style="color:var(--c-ok);font-weight:700">↑ ${rpShort(masuk)}</div>
        <div class="xs" style="color:var(--c-bad);font-weight:700;margin-top:3px">↓ ${rpShort(keluar)}</div>
      </div>
    </div>
    ${bud>0?`<div style="margin-top:14px">
      <div class="row between xs" style="margin-bottom:6px">
        <span class="dim">Budget ${rpShort(bud)}</span>
        <span style="font-weight:700;color:${sisaBud>=0?'var(--text-2)':cssv('--c-bad')}">${sisaBud>=0?'sisa '+rpShort(sisaBud):'lewat '+rpShort(-sisaBud)}</span>
      </div>
      <div class="bar"><i style="width:${clamp(keluar/bud*100,0,100).toFixed(0)}%;background:${keluar>bud?cssv('--c-bad'):keluar/bud>.8?cssv('--c-warn'):cssv('--inv')}"></i></div>
    </div>`:`<div class="xs dim" style="margin-top:10px">Atur budget bulanan di pengaturan biar kelihatan sisanya.</div>`}
  </div>

  <div class="grid2" style="margin-top:11px">
    <div class="kpi press" data-go="prog" data-ptab="skripsi">
      <div class="lbl">Skripsi</div>
      <div class="v tnum">${Math.round(babPct()*100)}%</div>
      <div class="bar" style="margin-top:8px;height:5px"><i style="width:${(babPct()*100).toFixed(0)}%"></i></div>
    </div>
    <div class="kpi press" data-go="prog" data-ptab="kerja">
      <div class="lbl">Jam kerja / 7 hari</div>
      <div class="v tnum">${(jamMinggu()).toFixed(1).replace('.0','')}<span style="font-size:13px;font-weight:650"> jam</span></div>
      <div class="d dim">${tasksOpen().length} tugas terbuka</div>
    </div>
    <div class="kpi press" data-go="prog" data-ptab="badan">
      <div class="lbl">Berat</div>
      <div class="v tnum">${w? w.kg.toString().replace('.',',') : '–'}<span style="font-size:13px;font-weight:650"> kg</span></div>
      <div class="d dim">${w? 'update '+tgl(w.d) : 'belum dicatat'}</div>
    </div>
    <div class="kpi press" data-sheet="air">
      <div class="lbl">Air hari ini</div>
      <div class="v tnum">${ins.air}<span style="font-size:13px;font-weight:650">/${S.settings.targetAir}</span></div>
      <div class="d dim">${ins.kcal? ins.kcal+' kkal':'gelas'}</div>
    </div>
  </div>

  <div class="sect"><h2>Rutinitas 7 hari</h2></div>
  <div class="card">${barChart(tren7,{h:104, max:100, fmtY:v=>Math.round(v)+'%'})}</div>

  ${dlm.length?`<div class="sect"><h2>Tenggat terdekat</h2></div>
  <div class="card">${dlm.map(x=>{
    const sisa = daysBetween(today(), x.d);
    const c = sisa<0?'--c-bad':sisa<=2?'--c-warn':'--text-3';
    return `<div class="item"><span class="dot" style="background:var(${c})"></span>
      <div class="grow"><div class="t">${esc(x.t)}</div><div class="s">${x.k} · ${tgl(x.d)}</div></div>
      <div class="xs" style="font-weight:750;color:var(${c})">${sisa<0?Math.abs(sisa)+' hr telat':sisa===0?'hari ini':sisa+' hari'}</div></div>`;
  }).join('')}</div>`:''}

  <div class="sect"><h2>Konsistensi 4 bulan</h2></div>
  <div class="card">
    ${heatmap(17, dd => S.days[dd] ? routinePct(dd) : 0)}
    <div class="row between xs dim" style="margin-top:10px">
      <span>Tiap kotak = 1 hari</span>
      <span class="row" style="gap:4px">kosong
        <i style="width:9px;height:9px;border-radius:2px;background:${cssv('--track')};display:block"></i>
        <i style="width:9px;height:9px;border-radius:2px;background:${cssv('--c-ok')};opacity:.4;display:block"></i>
        <i style="width:9px;height:9px;border-radius:2px;background:${cssv('--c-ok')};display:block"></i> penuh</span>
    </div>
  </div>

  <div style="text-align:center;padding:26px 0 4px" class="xs dim">
    ${S.txns.length + S.tasks.length + S.ide.length + Object.keys(S.days).length} catatan tersimpan
    · ${Cloud.ready ? 'tersinkron' : 'lokal'}
  </div>`;
}

/* ============================ HARIAN ============================ */
function renderDay(){
  const d = dayCur, o = dayRO(d), isToday = d === today();
  $('#dayDateLbl').textContent = isToday ? 'Hari ini · ' + tglFull(d) : tglFull(d);
  $('#dayNext').style.opacity = d >= today() ? .35 : 1;

  const blocks = [...(o.blocks||[])].sort((a,b)=>tmin(a.s)-tmin(b.s));
  const totalPerCat = {};
  blocks.forEach(b=>{ let s=tmin(b.s), e=tmin(b.e); if(e<=s) e+=1440;
    totalPerCat[b.c] = (totalPerCat[b.c]||0) + (e-s); });
  const catList = Object.entries(totalPerCat).sort((a,b)=>b[1]-a[1]);
  const tercatat = sum(catList, x=>x[1]);

  const moodFace = ['😵','🙁','😐','🙂','😄'];
  const grouped = { pagi:'Pagi', badan:'Badan', fokus:'Fokus', malam:'Malam' };

  const sm = sleepMin(d), targetTidurM = (+S.settings.targetTidur||7)*60;

  $('#dayBody').innerHTML = `
  <div class="grid3" style="margin-bottom:12px">
    <button class="kpi press" data-edit="bangun" style="text-align:left">
      <div class="lbl">Bangun</div>
      <div class="v tnum" style="font-size:18px">${o.bangun||'--:--'}</div>
    </button>
    <button class="kpi press" data-edit="tidur" style="text-align:left">
      <div class="lbl">Tidur</div>
      <div class="v tnum" style="font-size:18px">${o.tidur||'--:--'}</div>
    </button>
    <div class="kpi">
      <div class="lbl">Lama tidur</div>
      <div class="v tnum" style="font-size:18px;color:${sm? (sm>=targetTidurM?cssv('--c-ok'):cssv('--c-warn')) :'var(--text-3)'}">${sm?hmShort(sm):'–'}</div>
    </div>
  </div>
  ${!o.bangun && !o.tidur ? `<div class="xs dim" style="margin:-6px 0 12px;text-align:center">Isi jam tidur malam ini, lama tidurnya kehitung besok pagi.</div>`:''}

  <div class="card">
    <div class="row between" style="margin-bottom:11px">
      <div><div class="lbl">Rutinitas</div>
        <div class="mid tnum">${routineDone(d)}<span class="dim" style="font-size:14px">/${S.routines.length}</span></div></div>
      <button class="chip" data-sheet="routines">Atur</button>
    </div>
    ${['pagi','badan','fokus','malam'].map(g=>{
      const list = S.routines.filter(r=>r.tag===g);
      if (!list.length) return '';
      return `<div style="margin-top:12px"><div class="lbl" style="margin-bottom:5px">${grouped[g]}</div>
      ${list.map(r=>{
        const on = !!(o.rt||{})[r.id], sk = streakOf(r.id);
        return `<button class="item press" data-rt="${r.id}" style="width:100%;text-align:left;background:none;border-bottom:1px solid var(--border)">
          <span class="check ${on?'on':''}"><svg viewBox="0 0 24 24" fill="none"><polyline points="4 12.5 9.5 18 20 6.5"/></svg></span>
          <span class="grow"><span class="t ${on?'strike':''}" style="display:block">${esc(r.n)}</span></span>
          ${sk>1?`<span class="badge tnum">${sk}🔥</span>`:''}
        </button>`;
      }).join('')}</div>`;
    }).join('')}
  </div>

  <div class="sect"><h2>Linimasa</h2><button class="link" data-sheet="block">+ Blok waktu</button></div>
  <div class="card">
    ${blocks.length? dayStrip(blocks) : ''}
    ${blocks.length? `<div class="tl" style="margin-top:14px">${renderTimeline(blocks)}</div>` : `
      <div class="empty"><b>Belum ada blok waktu</b>Catat kegiatan lo per rentang jam biar kelihatan ke mana waktu lo pergi.
      <div style="margin-top:14px"><button class="btn sm" data-sheet="block">Tambah blok pertama</button></div></div>`}
    ${catList.length?`<div class="hr"></div>
      <div class="lbl" style="margin-bottom:9px">Total ${hm(tercatat)} tercatat</div>
      ${catList.map(([c,mn])=>`<div class="row" style="margin-bottom:7px">
        <span class="dot" style="background:var(${actOf(c).c})"></span>
        <span class="grow sm">${actOf(c).n}</span>
        <span class="sm tnum" style="font-weight:700">${hm(mn)}</span>
        <span class="xs dim tnum" style="width:34px;text-align:right">${Math.round(mn/tercatat*100)}%</span>
      </div>`).join('')}`:''}
  </div>

  <div class="sect"><h2>Catatan hari ini</h2></div>
  <div class="card">
    <div class="lbl" style="margin-bottom:8px">Mood</div>
    <div class="row" style="gap:8px;margin-bottom:14px">
      ${moodFace.map((f,i)=>`<button class="chip ${o.mood===i+1?'on':''}" data-mood="${i+1}"
        style="flex:1;font-size:19px;padding:8px 0;text-align:center">${f}</button>`).join('')}
    </div>
    <div class="lbl" style="margin-bottom:8px">Energi ${o.energi?`· ${o.energi}/5`:''}</div>
    <div class="row" style="gap:6px;margin-bottom:14px">
      ${[1,2,3,4,5].map(i=>`<button data-energi="${i}" style="flex:1;height:9px;border-radius:9px;
        background:${o.energi>=i?cssv('--inv'):cssv('--track')};transition:background .25s"></button>`).join('')}
    </div>
    <textarea class="inp" id="dayNote" placeholder="Apa yang terjadi hari ini? Yang bikin senang, yang ganjel, pelajaran…">${esc(o.catatan)}</textarea>
  </div>

  <div class="sect"><h2>Ringkasan hari ini</h2></div>
  <div class="card">
    <div class="item"><span class="ico" style="background:var(--c-bad-soft)">💸</span>
      <div class="grow"><div class="t">${rp(outSum(txOfDay(d)))}</div><div class="s">${txOfDay(d).filter(t=>t.type==='out').length} pengeluaran</div></div>
      <button class="chip" data-sheet="out">Catat</button></div>
    <div class="item"><span class="ico" style="background:var(--surface-2)">💧</span>
      <div class="grow"><div class="t tnum">${intake(d).air} / ${S.settings.targetAir} gelas</div><div class="s">${intake(d).kcal||0} kkal</div></div>
      <button class="chip" data-sheet="air">Isi</button></div>
    <div class="item"><span class="ico" style="background:var(--surface-2)">✅</span>
      <div class="grow"><div class="t">${S.tasks.filter(t=>t.done && t.doneAt===d).length} tugas kelar</div>
      <div class="s">${sum(S.workLogs.filter(w=>w.d===d),w=>w.jam)} jam kerja tercatat</div></div>
      <button class="chip" data-sheet="jam">+ Jam</button></div>
  </div>`;

  const ta = $('#dayNote');
  ta.addEventListener('input', ()=>{ day(d).catatan = ta.value; S.updatedAt=Date.now(); LS.set('rutin.state',S);
    clearTimeout(pushTimer); pushTimer=setTimeout(()=>Cloud.push(),1600); });
}

function renderTimeline(blocks){
  let html = '', prevEnd = null;
  blocks.forEach(b=>{
    const s = tmin(b.s); let e = tmin(b.e); if (e<=s) e+=1440;
    if (prevEnd !== null && s - prevEnd >= 30){
      html += `<div class="tlrow gap press" data-sheet="block"><div class="hh">${mtime(prevEnd)}</div>
        <div class="blk">${hm(s-prevEnd)} belum tercatat — ketuk buat isi</div></div>`;
    }
    const a = actOf(b.c);
    html += `<div class="tlrow press" data-block="${b.id}">
      <div class="hh">${b.s}</div>
      <div class="blk" style="border-left-color:${cssv(a.c)}">
        <div class="bt">${esc(b.t || a.n)}</div>
        <div class="bs">${a.n} · ${b.s}–${b.e} · ${hm(e-s)}</div>
      </div></div>`;
    prevEnd = e;
  });
  return html;
}
</script>
