<script>
/* ============================================================
   RUTIN — layar Uang, Progres, Ide
   ============================================================ */

/* ============================ UANG ============================ */
let moneyFilter = 'semua', moneyLimit = 10;
function renderMoney(){
  const [y,mm] = monCur.split('-').map(Number);
  $('#moneyMonthLbl').textContent = `${BULAN[mm-1]} ${y}`;
  $('#mNext').style.opacity = monCur >= today().slice(0,7) ? .35 : 1;

  const tx = txOfMonth(monCur).sort((a,b)=> a.d===b.d ? (b.id>a.id?1:-1) : (a.d<b.d?1:-1));
  const masuk = inSum(tx), keluar = outSum(tx), net = masuk-keluar;
  const bud = +S.settings.budget||0;

  // per kategori (pengeluaran)
  const byCat = {};
  tx.filter(t=>t.type==='out').forEach(t=>{ byCat[t.cat] = (byCat[t.cat]||0)+t.amt; });
  const segs = Object.entries(byCat).sort((a,b)=>b[1]-a[1])
    .map(([id,v])=>({ n:catOf(id).n, ic:catOf(id).ic, v, c:catOf(id).c }));

  // harian
  const dim = new Date(y, mm, 0).getDate();
  const perDay = [...Array(dim)].map((_,i)=>{
    const dd = `${y}-${pad(mm)}-${pad(i+1)}`;
    return { l: (i+1)%5===0||i===0 ? String(i+1) : '', v: outSum(txOfDay(dd)), c:'--c-bad' };
  });
  const hariAktif = perDay.filter(x=>x.v>0).length;
  const rata = hariAktif ? keluar/hariAktif : 0;

  const filtered = moneyFilter==='semua' ? tx : tx.filter(t=>t.type===moneyFilter);
  const byDate = {};
  filtered.forEach(t=>{ (byDate[t.d] = byDate[t.d]||[]).push(t); });

  $('#moneyBody').innerHTML = `
  <div class="card">
    <div class="lbl">Selisih bulan ini</div>
    <div class="big tnum" style="color:${net>=0?cssv('--c-ok'):cssv('--c-bad')};margin:2px 0 14px">${net<0?'−':''}${rp(net)}</div>
    <div class="grid2">
      <div style="background:var(--surface-2);border-radius:var(--r-md);padding:11px 12px">
        <div class="row" style="gap:6px"><span class="dot" style="background:var(--c-ok)"></span><span class="lbl">Masuk</span></div>
        <div class="mid tnum" style="margin-top:4px">${rp(masuk)}</div>
      </div>
      <div style="background:var(--surface-2);border-radius:var(--r-md);padding:11px 12px">
        <div class="row" style="gap:6px"><span class="dot" style="background:var(--c-bad)"></span><span class="lbl">Keluar</span></div>
        <div class="mid tnum" style="margin-top:4px">${rp(keluar)}</div>
      </div>
    </div>
    ${bud>0?`<div style="margin-top:14px">
      <div class="row between xs" style="margin-bottom:6px">
        <span class="dim">Budget ${rpShort(bud)} · rata-rata ${rpShort(rata)}/hari</span>
        <span style="font-weight:750;color:${keluar<=bud?'var(--text-2)':cssv('--c-bad')}">${Math.round(keluar/bud*100)}%</span>
      </div>
      <div class="bar"><i style="width:${clamp(keluar/bud*100,0,100).toFixed(0)}%;background:${keluar>bud?cssv('--c-bad'):keluar/bud>.8?cssv('--c-warn'):cssv('--inv')}"></i></div>
    </div>`:''}
    <div class="row" style="gap:9px;margin-top:15px">
      <button class="btn block" data-sheet="out" style="background:var(--c-bad-soft);color:var(--c-bad)">− Pengeluaran</button>
      <button class="btn block" data-sheet="in" style="background:var(--c-ok-soft);color:var(--c-ok)">+ Pemasukan</button>
    </div>
  </div>

  ${keluar>0?`<div class="sect"><h2>Ke mana perginya</h2></div>
  <div class="card">
    <div class="row" style="gap:16px;align-items:center">
      <div class="ringwrap" style="flex:none">${donut(segs,120,16)}
        <div class="rc"><div class="tnum" style="font-size:15px;font-weight:800;letter-spacing:-.03em">${rpShort(keluar)}</div>
        <div style="font-size:9px;color:var(--text-3);font-weight:650">total</div></div>
      </div>
      <div class="grow">
        ${segs.slice(0,5).map(s=>`<div class="row" style="margin-bottom:8px;gap:8px">
          <span class="dot" style="background:var(${s.c})"></span>
          <span class="grow xs" style="font-weight:600">${s.ic} ${s.n}</span>
          <span class="xs tnum" style="font-weight:750">${Math.round(s.v/keluar*100)}%</span>
        </div>`).join('')}
        ${segs.length>5?`<div class="xs dim">+${segs.length-5} kategori lain</div>`:''}
      </div>
    </div>
    <div class="hr"></div>
    ${segs.map(s=>`<div style="margin-bottom:11px">
      <div class="row between xs" style="margin-bottom:5px">
        <span style="font-weight:650">${s.ic} ${s.n}</span><span class="tnum" style="font-weight:750">${rp(s.v)}</span></div>
      <div class="bar" style="height:5px"><i style="width:${(s.v/keluar*100).toFixed(0)}%;background:var(${s.c})"></i></div>
    </div>`).join('')}
  </div>

  <div class="sect"><h2>Pengeluaran harian</h2></div>
  <div class="card">${barChart(perDay,{h:112, color:'--c-bad', fmtY:v=>rpShort(v)})}
    <div class="xs dim" style="margin-top:8px">Hari teraktif: ${(()=>{const m=perDay.reduce((a,b,i)=>b.v>perDay[a].v?i:a,0);return perDay[m].v?`tanggal ${m+1} — ${rp(perDay[m].v)}`:'–'})()}</div>
  </div>`:''}

  <div class="sect"><h2>Riwayat</h2>
    <div class="row" style="gap:5px">
      ${[['semua','Semua'],['out','Keluar'],['in','Masuk']].map(([k,l])=>
        `<button class="chip ${moneyFilter===k?'on':''}" data-mfilter="${k}" style="padding:5px 11px;font-size:12px">${l}</button>`).join('')}
    </div>
  </div>
  ${Object.keys(byDate).length ? Object.entries(byDate).slice(0, moneyLimit).map(([dt,list])=>`
    <div style="margin-bottom:12px">
      <div class="row between" style="padding:0 3px 6px">
        <span class="lbl">${dt===today()?'Hari ini':dt===addDays(today(),-1)?'Kemarin':tglFull(dt).split(',')[0]+', '+tgl(dt)}</span>
        <span class="xs dim tnum">${rp(outSum(list))} keluar</span>
      </div>
      <div class="card tight">
        ${list.map(t=>{ const c = catOf(t.cat);
          return `<button class="item press" data-tx="${t.id}" style="width:100%;text-align:left;background:none">
            <span class="ico" style="background:var(--surface-2)">${c.ic}</span>
            <span class="grow"><span class="t" style="display:block">${esc(t.note||c.n)}</span>
            <span class="s">${c.n}</span></span>
            <span class="amt" style="color:${t.type==='in'?cssv('--c-ok'):'var(--text)'}">${t.type==='in'?'+':'−'}${rp(t.amt)}</span>
          </button>`; }).join('')}
      </div>
    </div>`).join('') + (Object.keys(byDate).length > moneyLimit
      ? `<button class="btn ghost block sm" id="moreTx">Tampilkan ${Math.min(10, Object.keys(byDate).length-moneyLimit)} hari lagi</button>`
      : Object.keys(byDate).length > 3 ? `<div class="xs dim" style="text-align:center;padding:6px 0">Itu semua transaksi bulan ini.</div>` : '')
  : `<div class="card"><div class="empty"><b>Belum ada transaksi</b>Catat sekali aja tiap habis jajan — 5 detik, seumur hidup kepake.</div></div>`}
  `;
  const more = $('#moreTx'); if (more) more.onclick = ()=>{ moneyLimit += 10; renderMoney(); };
}

/* ============================ PROGRES ============================ */
function renderProg(){
  $$('#progSeg button').forEach(b=>b.classList.toggle('on', b.dataset.p===progTab));
  if (progTab==='latihan') renderLatihan();
  if (progTab==='skripsi') renderSkripsi();
  if (progTab==='kerja')   renderKerja();
  if (progTab==='badan')   renderBadan();
}

function renderSkripsi(){
  const sk = S.skripsi, p = babPct();
  const sisa = sk.deadline ? daysBetween(today(), sk.deadline) : null;
  const menitSkripsi7 = [...Array(7)].map((_,i)=>{
    const dd = addDays(today(),-(6-i));
    const bl = (dayRO(dd).blocks||[]).filter(b=>b.c==='skripsi');
    const m = sum(bl, b=>{ let s=tmin(b.s),e=tmin(b.e); if(e<=s)e+=1440; return e-s; });
    return { l:HARI3[fromD(dd).getDay()], v:m, c:'--c-lime' };
  });
  const totalM = sum(menitSkripsi7, x=>x.v);

  $('#progSub').textContent = sk.judul ? sk.judul.slice(0,40) : 'skripsi · kerja · badan';

  $('#progBody').innerHTML = `
  <div class="card">
    <div class="row" style="gap:16px">
      <div class="ringwrap">${ring(p,80,9,p>=1?'--c-ok':'--c-lime')}
        <div class="rc"><div class="tnum" style="font-size:19px;font-weight:800;letter-spacing:-.04em">${Math.round(p*100)}<span style="font-size:11px">%</span></div></div>
      </div>
      <div class="grow">
        <div class="lbl">Judul</div>
        <div style="font-weight:700;font-size:14.5px;letter-spacing:-.02em;line-height:1.35;margin:2px 0 6px">${sk.judul?esc(sk.judul):'<span class="dim" style="font-weight:500">Belum diisi</span>'}</div>
        <div class="xs dim">${sk.dosen?'Pembimbing: '+esc(sk.dosen):'Pembimbing belum diisi'}</div>
      </div>
    </div>
    ${sisa!==null?`<div class="hr"></div>
      <div class="row between">
        <div><div class="lbl">Target sidang</div><div class="sm" style="font-weight:650;margin-top:2px">${tglFull(sk.deadline)}</div></div>
        <div style="text-align:right"><div class="mid tnum" style="color:${sisa<0?cssv('--c-bad'):sisa<30?cssv('--c-warn'):'var(--text)'}">${Math.abs(sisa)}</div>
        <div class="xs dim">${sisa<0?'hari lewat':'hari lagi'}</div></div>
      </div>`:''}
    <div style="margin-top:14px"><button class="btn ghost block sm" data-sheet="skripsiInfo">Ubah info skripsi</button></div>
  </div>

  <div class="sect"><h2>Progres per bab</h2><button class="link" data-sheet="babAdd">+ Bab</button></div>
  <div class="stack">
    ${sk.bab.map(b=>{
      const st = BAB_ST[b.st]||BAB_ST.belum;
      const sisaB = b.dl ? daysBetween(today(), b.dl) : null;
      return `<div class="card tight press" data-bab="${b.id}">
        <div class="row between" style="margin-bottom:9px">
          <div class="grow" style="min-width:0">
            <div style="font-weight:700;font-size:14px;letter-spacing:-.02em">${esc(b.n)}</div>
            <div class="row" style="gap:6px;margin-top:4px">
              <span class="pill" style="background:var(${st.c});color:var(--bg);opacity:.92">${st.n}</span>
              ${b.dl?`<span class="xs" style="color:var(${b.st==='acc'?'--text-3':sisaB<0?'--c-bad':sisaB<=3?'--c-warn':'--text-3'});font-weight:650">${tgl(b.dl)}${(sisaB<0&&b.st!=='acc')?' · telat':''}</span>`:''}
            </div>
          </div>
          <div class="tnum" style="font-weight:800;font-size:17px;letter-spacing:-.03em">${b.p}%</div>
        </div>
        <div class="bar"><i style="width:${b.p}%;background:var(${b.p>=100?'--c-ok':'--c-lime'})"></i></div>
      </div>`;
    }).join('')}
  </div>

  <div class="sect"><h2>Waktu garap 7 hari</h2></div>
  <div class="card">${barChart(menitSkripsi7,{h:104, fmtY:v=>hmShort(v)})}
    <div class="xs dim" style="margin-top:8px">Total ${hm(totalM)} minggu ini${S.settings.targetSkripsiMenit?` · target ${S.settings.targetSkripsiMenit} menit/hari`:''}.
    Data diambil dari blok waktu berkategori "Skripsi" di tab Harian.</div>
  </div>

  <div class="sect"><h2>Catatan bimbingan</h2><button class="link" data-sheet="bimbingan">+ Catat</button></div>
  ${sk.bimbingan.length ? `<div class="stack">${[...sk.bimbingan].sort((a,b)=>a.d<b.d?1:-1).map(b=>`
    <div class="card tight press" data-bimb="${b.id}">
      <div class="row between" style="margin-bottom:6px">
        <span class="lbl">${tglFull(b.d)}</span>
        ${b.selesai?`<span class="pill" style="background:var(--c-ok-soft);color:var(--c-ok)">beres</span>`:''}
      </div>
      <div class="sm" style="line-height:1.55;white-space:pre-wrap">${esc(b.catatan)}</div>
      ${b.aksi?`<div style="margin-top:9px;padding:9px 11px;background:var(--surface-2);border-radius:11px">
        <div class="lbl" style="margin-bottom:3px">Yang harus dikerjain</div>
        <div class="sm" style="white-space:pre-wrap">${esc(b.aksi)}</div></div>`:''}
    </div>`).join('')}</div>`
  : `<div class="card"><div class="empty"><b>Belum ada catatan bimbingan</b>Habis ketemu dosen, langsung catat di sini biar nggak lupa revisinya.</div></div>`}
  `;
}

let kerjaFilter = 'aktif';
function renderKerja(){
  $('#progSub').textContent = 'skripsi · kerja · badan';
  const jam14 = [...Array(14)].map((_,i)=>{
    const dd = addDays(today(),-(13-i));
    return { l: i%3===0? String(fromD(dd).getDate()):'', v: sum(S.workLogs.filter(w=>w.d===dd),w=>w.jam), c:'--c-info' };
  });
  const tot14 = sum(jam14,x=>x.v);
  const proj = {};
  S.workLogs.forEach(w=>{ const k = w.proj||'Tanpa proyek'; proj[k] = (proj[k]||0)+w.jam; });

  let list = [...S.tasks];
  if (kerjaFilter==='aktif')   list = list.filter(t=>!t.done);
  if (kerjaFilter==='hari')    list = list.filter(t=>!t.done && t.due===today());
  if (kerjaFilter==='telat')   list = list.filter(t=>!t.done && t.due && t.due<today());
  if (kerjaFilter==='selesai') list = list.filter(t=>t.done);
  const rank = {tinggi:0,sedang:1,rendah:2};
  list.sort((a,b)=> (a.due||'9999')<(b.due||'9999') ? -1 : (a.due||'9999')>(b.due||'9999') ? 1 : rank[a.prio]-rank[b.prio]);

  $('#progBody').innerHTML = `
  <div class="grid3" style="margin-bottom:12px">
    <div class="kpi"><div class="lbl">Terbuka</div><div class="v tnum">${tasksOpen().length}</div></div>
    <div class="kpi"><div class="lbl">Telat</div><div class="v tnum" style="color:${overdue().length?cssv('--c-bad'):'var(--text)'}">${overdue().length}</div></div>
    <div class="kpi"><div class="lbl">Jam / 14 hr</div><div class="v tnum">${tot14.toFixed(0)}</div></div>
  </div>

  <div class="row" style="gap:9px;margin-bottom:14px">
    <button class="btn block sm" data-sheet="task">+ Tugas</button>
    <button class="btn ghost block sm" data-sheet="jam">+ Jam kerja</button>
  </div>

  <div class="chiprow" style="margin-bottom:12px">
    ${[['aktif','Aktif'],['hari','Hari ini'],['telat','Telat'],['selesai','Selesai'],['semua','Semua']].map(([k,l])=>
      `<button class="chip ${kerjaFilter===k?'on':''}" data-kfilter="${k}">${l}</button>`).join('')}
  </div>

  ${list.length?`<div class="card">${list.map(t=>{
    const late = !t.done && t.due && t.due<today();
    const pr = PRIO[t.prio]||PRIO.sedang;
    return `<div class="item">
      <button class="check ${t.done?'on':''}" data-task="${t.id}"><svg viewBox="0 0 24 24" fill="none"><polyline points="4 12.5 9.5 18 20 6.5"/></svg></button>
      <button class="grow press" data-taskedit="${t.id}" style="text-align:left;background:none">
        <div class="t ${t.done?'strike':''}">${esc(t.t)}</div>
        <div class="s row" style="gap:7px">
          ${!t.done?`<span style="color:var(${pr.c});font-weight:700">${pr.n}</span>`:''}
          ${t.proj?`<span>${esc(t.proj)}</span>`:''}
          ${t.due?`<span style="color:var(${late?'--c-bad':'--text-3'});font-weight:${late?700:500}">${t.due===today()?'hari ini':tgl(t.due)}</span>`:''}
        </div>
      </button>
    </div>`;}).join('')}</div>`
  :`<div class="card"><div class="empty"><b>Kosong di sini</b>${kerjaFilter==='aktif'?'Nggak ada tugas terbuka. Nikmatin dulu.':'Nggak ada yang cocok sama filter ini.'}</div></div>`}

  <div class="sect"><h2>Jam kerja 14 hari</h2></div>
  <div class="card">${barChart(jam14,{h:106, fmtY:v=>v.toFixed(0)+'j'})}
    <div class="xs dim" style="margin-top:8px">Rata-rata ${(tot14/14).toFixed(1).replace('.',',')} jam/hari.
    ${S.settings.jamKerjaTarget?` Target ${S.settings.jamKerjaTarget} jam.`:''}</div>
  </div>

  ${Object.keys(proj).length?`<div class="sect"><h2>Per proyek</h2></div>
  <div class="card">${Object.entries(proj).sort((a,b)=>b[1]-a[1]).map(([n,v])=>{
    const mx = Math.max(...Object.values(proj));
    return `<div style="margin-bottom:11px">
      <div class="row between xs" style="margin-bottom:5px"><span style="font-weight:650">${esc(n)}</span>
      <span class="tnum" style="font-weight:750">${v.toFixed(1).replace('.0','')} jam</span></div>
      <div class="bar" style="height:5px"><i style="width:${(v/mx*100).toFixed(0)}%;background:var(--c-info)"></i></div></div>`;
  }).join('')}</div>`:''}

  ${S.workLogs.length?`<div class="sect"><h2>Log terakhir</h2></div>
  <div class="card tight">${[...S.workLogs].sort((a,b)=>a.d<b.d?1:-1).slice(0,8).map(w=>`
    <button class="item press" data-wlog="${w.id}" style="width:100%;text-align:left;background:none">
      <span class="ico" style="background:var(--surface-2)">⏱</span>
      <span class="grow"><span class="t" style="display:block">${esc(w.proj||'Kerja')}</span>
      <span class="s">${tgl(w.d)}${w.note?' · '+esc(w.note):''}</span></span>
      <span class="amt tnum">${w.jam} jam</span></button>`).join('')}</div>`:''}
  `;
}

function renderBadan(){
  $('#progSub').textContent = 'skripsi · kerja · badan';
  const b = S.badan;
  const berat = [...b.berat].sort((x,y)=>x.d<y.d?-1:1);
  const last = berat.length?berat[berat.length-1]:null;
  const first = berat.length?berat[0]:null;
  const delta = last&&first ? last.kg-first.kg : 0;
  const goal = +S.settings.beratTarget||0;
  const chart = berat.slice(-30).map(x=>({l:tgl(x.d).replace(' ',' '), v:x.kg}));
  const ins = intake(today());
  const lat14 = [...Array(14)].map((_,i)=>{ const dd=addDays(today(),-(13-i));
    return { l: i%3===0?String(fromD(dd).getDate()):'', v: sum(b.latihan.filter(l=>l.d===dd),l=>l.menit), c:'--c-ok' }; });
  const totLat = sum(lat14,x=>x.v);
  const rutinBadan = S.routines.filter(r=>r.tag==='badan');

  $('#progBody').innerHTML = `
  <div class="card">
    <div class="row between" style="align-items:flex-start">
      <div><div class="lbl">Berat terakhir</div>
        <div class="big tnum">${last?String(last.kg).replace('.',','):'–'}<span style="font-size:14px;font-weight:650"> kg</span></div>
        <div class="xs dim">${last?tglFull(last.d):'belum ada data'}</div></div>
      <div style="text-align:right">
        ${berat.length>1?`<div class="pill" style="background:var(${delta<=0?'--c-ok-soft':'--c-bad-soft'});color:var(${delta<=0?'--c-ok':'--c-bad'})">
          ${delta>0?'+':''}${delta.toFixed(1).replace('.',',')} kg</div><div class="xs dim" style="margin-top:4px">sejak ${tgl(first.d)}</div>`:''}
      </div>
    </div>
    ${goal&&last?`<div style="margin-top:14px">
      <div class="row between xs" style="margin-bottom:6px"><span class="dim">Target ${goal} kg</span>
      <span style="font-weight:700">${Math.abs(last.kg-goal).toFixed(1).replace('.',',')} kg lagi</span></div>
      <div class="bar"><i style="width:${clamp(first.kg===goal?100:Math.abs((last.kg-first.kg)/(goal-first.kg))*100,0,100).toFixed(0)}%;background:var(--c-ok)"></i></div>
    </div>`:''}
    <div style="margin-top:14px"><button class="btn block sm" data-sheet="berat">Catat berat hari ini</button></div>
  </div>

  ${chart.length>1?`<div class="sect"><h2>Tren berat</h2></div>
  <div class="card">${areaChart(chart,{h:126, color:'--c-ok', ticks:5, fmtY:v=>v.toFixed(1)})}</div>`:''}

  <div class="sect"><h2>Asupan hari ini</h2></div>
  <div class="card">
    <div class="row between" style="margin-bottom:11px">
      <div><div class="lbl">Air</div><div class="mid tnum">${ins.air}<span class="dim" style="font-size:14px">/${S.settings.targetAir} gelas</span></div></div>
      <div style="text-align:right"><div class="lbl">Kalori</div>
        <div class="mid tnum">${ins.kcal||0}<span class="dim" style="font-size:14px">/${S.settings.targetKalori}</span></div></div>
    </div>
    <div class="row" style="gap:5px;flex-wrap:wrap;margin-bottom:12px">
      ${[...Array(+S.settings.targetAir||8)].map((_,i)=>`<button data-air="${i+1}"
        style="flex:1;min-width:20px;height:30px;border-radius:8px;border:1.5px solid var(${i<ins.air?'--c-info':'--border'});
        background:${i<ins.air?cssv('--c-info'):'transparent'};transition:all .22s var(--ease-spring)"></button>`).join('')}
    </div>
    <div class="bar"><i style="width:${clamp((ins.kcal||0)/S.settings.targetKalori*100,0,100).toFixed(0)}%;background:var(--c-warn)"></i></div>
    <div class="row" style="gap:9px;margin-top:13px">
      <button class="btn ghost block sm" data-sheet="kalori">+ Kalori</button>
      <button class="btn ghost block sm" data-sheet="latihan">+ Latihan</button>
    </div>
  </div>

  <div class="sect"><h2>Latihan 14 hari</h2></div>
  <div class="card">${barChart(lat14,{h:104, fmtY:v=>hmShort(v)})}
    <div class="xs dim" style="margin-top:8px">Total ${hm(totLat)} · ${b.latihan.filter(l=>l.d>=addDays(today(),-13)).length} sesi.</div>
  </div>

  ${(()=>{
    const t14 = [...Array(14)].map((_,i)=>{ const dd=addDays(today(),-(13-i));
      return { l: i%3===0?String(fromD(dd).getDate()):'', v: sleepMin(dd), c: sleepMin(dd)>=(+S.settings.targetTidur||7)*60 ? '--c-violet':'--c-warn' }; });
    const isi = t14.filter(x=>x.v>0);
    if (!isi.length) return `<div class="sect"><h2>Tidur</h2></div>
      <div class="card"><div class="empty"><b>Belum ada data tidur</b>Isi jam tidur & jam bangun di tab Harian, nanti lama tidurnya kehitung sendiri di sini.</div></div>`;
    const rata = sum(isi,x=>x.v)/isi.length;
    return `<div class="sect"><h2>Tidur 14 hari</h2></div>
      <div class="card">${barChart(t14,{h:104, fmtY:v=>hmShort(v), max:(+S.settings.targetTidur||7)*60})}
        <div class="xs dim" style="margin-top:8px">Rata-rata ${hm(rata)} per malam dari ${isi.length} malam tercatat · target ${S.settings.targetTidur} jam.</div>
      </div>`;
  })()}

  ${b.latihan.length?`<div class="sect"><h2>Sesi terakhir</h2></div>
  <div class="card tight">${[...b.latihan].sort((a,b2)=>a.d<b2.d?1:-1).slice(0,8).map(l=>`
    <button class="item press" data-lat="${l.id}" style="width:100%;text-align:left;background:none">
      <span class="ico" style="background:var(--c-ok-soft)">💪</span>
      <span class="grow"><span class="t" style="display:block">${esc(l.jenis)}</span>
      <span class="s">${tgl(l.d)}${l.note?' · '+esc(l.note):''}</span></span>
      <span class="amt tnum">${l.menit}m</span></button>`).join('')}</div>`:''}

  ${rutinBadan.length?`<div class="sect"><h2>Kebiasaan badan</h2></div>
  <div class="stack">${rutinBadan.map(r=>`
    <div class="card tight">
      <div class="row between" style="margin-bottom:9px">
        <span style="font-weight:650;font-size:14px">${esc(r.n)}</span>
        <span class="badge tnum">${streakOf(r.id)} hari 🔥</span>
      </div>
      ${heatmap(13, dd => (dayRO(dd).rt||{})[r.id] ? 1 : 0)}
    </div>`).join('')}</div>`:''}
  `;
}

/* ============================ IDE ============================ */
let ideaFilter = 'semua';
function renderIdea(){
  const all = S.ide;
  const cnt = k => k==='semua' ? all.length : all.filter(i=>i.st===k).length;
  const key = i => (i.st==='tayang' ? 'z' : '') + (i.dl || '9998');
  const list = (ideaFilter==='semua' ? all : all.filter(i=>i.st===ideaFilter))
    .sort((a,b)=> key(a)<key(b)?-1 : key(a)>key(b)?1 : (a.created<b.created?1:-1));
  $('#ideaSub').textContent = `${all.length} ide · ${cnt('tayang')} tayang`;

  $('#ideaBody').innerHTML = `
  <div class="chiprow" style="margin-bottom:14px">
    ${[['semua','Semua'],...Object.entries(IDE_ST).map(([k,v])=>[k,v.n])].map(([k,l])=>
      `<button class="chip ${ideaFilter===k?'on':''}" data-ifilter="${k}">${l} <span style="opacity:.55">${cnt(k)}</span></button>`).join('')}
  </div>

  ${all.length?`<div class="card tight" style="margin-bottom:14px">
    <div class="row" style="gap:3px;height:9px;border-radius:9px;overflow:hidden;background:var(--track)">
      ${Object.entries(IDE_ST).map(([k,v])=>{ const c=cnt(k); return c?`<i style="flex:${c};background:var(${v.c});display:block;height:100%"></i>`:''; }).join('')}
    </div>
    <div class="row" style="gap:11px;flex-wrap:wrap;margin-top:9px">
      ${Object.entries(IDE_ST).map(([k,v])=>cnt(k)?`<span class="row xs" style="gap:5px"><span class="dot" style="background:var(${v.c})"></span>${v.n} ${cnt(k)}</span>`:'').join('')}
    </div>
  </div>`:''}

  ${list.length? `<div class="stack">${list.map(i=>{
    const st = IDE_ST[i.st]||IDE_ST.ide;
    const sisa = i.dl ? daysBetween(today(), i.dl) : null;
    return `<div class="card press" data-idea="${i.id}" style="border-left:3px solid var(${st.c})">
      <div class="row between" style="margin-bottom:7px">
        <span class="pill" style="background:var(${st.c});color:var(--bg);opacity:.92">${st.n}</span>
        <span class="row" style="gap:7px">
          ${i.platform?`<span class="badge">${esc(i.platform)}</span>`:''}
          ${i.dl?`<span class="xs" style="font-weight:700;color:var(${i.st==='tayang'?'--text-3':sisa<0?'--c-bad':sisa<=2?'--c-warn':'--text-3'})">${tgl(i.dl)}</span>`:''}
        </span>
      </div>
      <div style="font-weight:750;font-size:16px;letter-spacing:-.025em;line-height:1.32">${esc(i.judul)}</div>
      ${i.hook?`<div class="sm muted" style="margin-top:6px;line-height:1.5">${esc(i.hook)}</div>`:''}
      ${i.isi?`<div class="xs dim" style="margin-top:7px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(i.isi)}</div>`:''}
      ${i.tag?`<div class="row" style="gap:5px;margin-top:9px;flex-wrap:wrap">${i.tag.split(',').filter(Boolean).map(t=>`<span class="badge">#${esc(t.trim())}</span>`).join('')}</div>`:''}
    </div>`;}).join('')}</div>`
  : `<div class="card"><div class="empty"><b>Gudang ide masih kosong</b>Ide bagus itu datang pas lagi nggak siap. Simpan di sini begitu kepikiran — biar nggak nguap.
    <div style="margin-top:16px"><button class="btn sm" data-sheet="idea">Simpan ide pertama</button></div></div></div>`}
  `;
}
</script>
