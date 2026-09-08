<script>
/* ============================================================
   RUTIN — form, interaksi, setup
   ============================================================ */

/* ---------- pembangun form ---------- */
const F = {
  text:(id,l,v='',ph='')=>`<div class="field"><label>${l}</label><input class="inp" id="${id}" value="${esc(v)}" placeholder="${esc(ph)}"></div>`,
  area:(id,l,v='',ph='')=>`<div class="field"><label>${l}</label><textarea class="inp" id="${id}" placeholder="${esc(ph)}">${esc(v)}</textarea></div>`,
  num:(id,l,v='',ph='',step='any')=>`<div class="field"><label>${l}</label><input class="inp tnum" id="${id}" type="number" inputmode="decimal" step="${step}" value="${v===0?0:(v||'')}" placeholder="${esc(ph)}"></div>`,
  date:(id,l,v='')=>`<div class="field"><label>${l}</label><input class="inp" id="${id}" type="date" value="${v||''}"></div>`,
  time:(id,l,v='')=>`<div class="field"><label>${l}</label><input class="inp tnum" id="${id}" type="time" value="${v||''}"></div>`,
  sel:(id,l,opts,v)=>`<div class="field"><label>${l}</label><select class="inp" id="${id}">${
    opts.map(([k,n])=>`<option value="${k}"${k===v?' selected':''}>${esc(n)}</option>`).join('')}</select></div>`,
  amt:(id,l,v='')=>`<div class="field"><label>${l}</label><div class="amtwrap"><span class="cur">Rp</span>
    <input class="inp tnum" id="${id}" type="number" inputmode="numeric" step="500" value="${v||''}" placeholder="0"></div></div>`,
  chips:(name,l,opts,v)=>`<div class="field"><label>${l}</label>
    <div class="row" style="gap:6px;flex-wrap:wrap" data-chipgroup="${name}">${
      opts.map(o=>`<button type="button" class="chip ${o.id===v?'on':''}" data-chip="${name}" data-val="${o.id}">${o.ic?o.ic+' ':''}${esc(o.n)}</button>`).join('')}</div>
    <input type="hidden" id="${name}" value="${esc(v||'')}"></div>`,
  rowgrid:(a,b)=>`<div class="grid2">${a}${b}</div>`,
};
const val = id => { const e = $('#'+id); return e ? e.value : ''; };
const numv = id => +val(id) || 0;

let sheetSaveFn = null, sheetDelFn = null;
function form(title, sub, body, onSave, onDelete, saveLabel='Simpan'){
  sheetSaveFn = onSave; sheetDelFn = onDelete;
  openSheet(`<h3>${esc(title)}</h3>${sub?`<div class="sheetsub">${esc(sub)}</div>`:'<div style="height:14px"></div>'}
    <div class="stack">${body}</div>
    <div class="row" style="gap:9px;margin-top:18px">
      ${onDelete?`<button class="btn danger" id="sheetDel" style="flex:none;padding:12px 16px">Hapus</button>`:''}
      <button class="btn block" id="sheetSave">${saveLabel}</button>
    </div>`);
  const sv = $('#sheetSave'); if (sv) sv.onclick = ()=>{ if (sheetSaveFn && sheetSaveFn() !== false) closeSheet(); };
  const dl = $('#sheetDel'); if (dl) dl.onclick = ()=>{ if (confirm('Hapus data ini?')){ sheetDelFn(); closeSheet(); } };
}

/* ---------- definisi tiap sheet ---------- */
function sheetTx(type, existing){
  const isIn = type === 'in';
  const cats = isIn ? CAT_IN : CAT_OUT;
  const e = existing || {};
  form(existing? 'Ubah transaksi' : (isIn?'Catat pemasukan':'Catat pengeluaran'),
    isIn?'Duit yang masuk hari ini':'Jujur aja, biar datanya kepake',
    F.amt('txAmt','Jumlah', e.amt) +
    F.chips('txCat','Kategori', cats, e.cat || cats[0].id) +
    F.text('txNote','Catatan', e.note, isIn?'Gaji bulan ini…':'Nasi goreng depan kos…') +
    F.date('txDate','Tanggal', e.d || (view==='day'? dayCur : today())),
    ()=>{
      const amt = numv('txAmt');
      if (!amt){ $('#txAmt').classList.add('shake'); setTimeout(()=>$('#txAmt').classList.remove('shake'),400); return false; }
      const o = { id: e.id||uid(), d: val('txDate')||today(), type, amt, cat: val('txCat'), note: val('txNote').trim() };
      if (e.id) S.txns[S.txns.findIndex(t=>t.id===e.id)] = o; else S.txns.push(o);
      commit(); toast(isIn?`+${rp(amt)} dicatat`:`−${rp(amt)} dicatat`); buzz(12);
    },
    existing ? ()=>{ S.txns = S.txns.filter(t=>t.id!==e.id); commit(); toast('Transaksi dihapus'); } : null);
}

function sheetTask(existing){
  const e = existing || {};
  form(existing?'Ubah tugas':'Tugas baru','',
    F.text('tkT','Judul tugas', e.t, 'Kirim revisi ke klien') +
    F.rowgrid(F.text('tkProj','Proyek', e.proj, 'opsional'), F.sel('tkPrio','Prioritas',[['tinggi','Tinggi'],['sedang','Sedang'],['rendah','Rendah']], e.prio||'sedang')) +
    F.rowgrid(F.date('tkDue','Tenggat', e.due), F.num('tkEst','Perkiraan jam', e.est,'2')),
    ()=>{
      const t = val('tkT').trim(); if (!t) return false;
      const o = { id:e.id||uid(), t, proj:val('tkProj').trim(), prio:val('tkPrio'), due:val('tkDue'), est:numv('tkEst'),
                  done:e.done||false, doneAt:e.doneAt||'' };
      if (e.id) S.tasks[S.tasks.findIndex(x=>x.id===e.id)] = o; else S.tasks.push(o);
      commit(); toast(existing?'Tugas diperbarui':'Tugas ditambah');
    },
    existing ? ()=>{ S.tasks = S.tasks.filter(x=>x.id!==e.id); commit(); toast('Tugas dihapus'); } : null);
}

function sheetJam(existing){
  const e = existing || {};
  form(existing?'Ubah jam kerja':'Catat jam kerja','Berapa jam efektif kerja hari ini',
    F.rowgrid(F.num('wlJam','Jumlah jam', e.jam, '3', '0.5'), F.date('wlD','Tanggal', e.d || (view==='day'?dayCur:today()))) +
    F.text('wlProj','Proyek', e.proj, 'opsional') +
    F.text('wlNote','Ngerjain apa', e.note, 'opsional'),
    ()=>{
      const j = numv('wlJam'); if (!j) return false;
      const o = { id:e.id||uid(), d:val('wlD')||today(), jam:j, proj:val('wlProj').trim(), note:val('wlNote').trim() };
      if (e.id) S.workLogs[S.workLogs.findIndex(x=>x.id===e.id)] = o; else S.workLogs.push(o);
      commit(); toast(`${j} jam dicatat`);
    },
    existing ? ()=>{ S.workLogs = S.workLogs.filter(x=>x.id!==e.id); commit(); toast('Log dihapus'); } : null);
}

function sheetIdea(existing){
  const e = existing || {};
  const plats = ['TikTok','Instagram','YouTube','X','LinkedIn','Blog','Lainnya'];
  form(existing?'Ubah ide':'Simpan ide','Tangkap dulu, rapihin belakangan',
    F.text('idJ','Judul / inti ide', e.judul, 'Cara ngatur uang anak kos') +
    F.chips('idSt','Status', Object.entries(IDE_ST).map(([k,v])=>({id:k,n:v.n})), e.st||'ide') +
    F.chips('idPlat','Platform', plats.map(p=>({id:p,n:p})), e.platform||'TikTok') +
    F.text('idHook','Hook / kalimat pembuka', e.hook, '3 detik pertama harus nampol') +
    F.area('idIsi','Konsep & catatan', e.isi, 'Alur, referensi, properti yang dibutuhin, apa aja…') +
    F.rowgrid(F.text('idTag','Tag (pisah koma)', e.tag, 'keuangan, kos'), F.date('idDl','Target tayang', e.dl)),
    ()=>{
      const j = val('idJ').trim(); if (!j) return false;
      const o = { id:e.id||uid(), judul:j, st:val('idSt'), platform:val('idPlat'), hook:val('idHook').trim(),
                  isi:val('idIsi').trim(), tag:val('idTag').trim(), dl:val('idDl'), created:e.created||today() };
      if (e.id) S.ide[S.ide.findIndex(x=>x.id===e.id)] = o; else S.ide.unshift(o);
      commit(); toast(existing?'Ide diperbarui':'Ide tersimpan');
    },
    existing ? ()=>{ S.ide = S.ide.filter(x=>x.id!==e.id); commit(); toast('Ide dihapus'); } : null);
}

function sheetBerat(){
  const last = lastWeight();
  form('Catat berat','Timbang di jam yang sama tiap hari biar konsisten',
    F.rowgrid(F.num('bwKg','Berat (kg)', last?last.kg:'', '65', '0.1'), F.date('bwD','Tanggal', today())),
    ()=>{
      const kg = numv('bwKg'); if (!kg) return false;
      const d = val('bwD')||today();
      const i = S.badan.berat.findIndex(x=>x.d===d);
      if (i>=0) S.badan.berat[i].kg = kg; else S.badan.berat.push({d, kg});
      commit(); toast(`${String(kg).replace('.',',')} kg dicatat`);
    });
}

function sheetKalori(){
  const ins = intake(today());
  form('Asupan kalori','Perkiraan aja nggak apa-apa, yang penting rutin',
    F.num('kcV','Total kalori hari ini', ins.kcal||'', String(S.settings.targetKalori)),
    ()=>{ S.badan.asupan[today()] = { ...ins, kcal: numv('kcV') }; commit(); toast('Kalori diperbarui'); });
}

function sheetLatihan(existing){
  const e = existing || {};
  form(existing?'Ubah latihan':'Catat latihan','',
    F.text('ltJ','Jenis latihan', e.jenis, 'Lari, gym, push up…') +
    F.rowgrid(F.num('ltM','Durasi (menit)', e.menit, '30'), F.date('ltD','Tanggal', e.d||today())) +
    F.text('ltN','Catatan', e.note, 'opsional'),
    ()=>{
      const j = val('ltJ').trim(), m = numv('ltM'); if (!j||!m) return false;
      const o = { id:e.id||uid(), jenis:j, menit:m, d:val('ltD')||today(), note:val('ltN').trim() };
      if (e.id) S.badan.latihan[S.badan.latihan.findIndex(x=>x.id===e.id)] = o; else S.badan.latihan.push(o);
      commit(); toast(`${m} menit dicatat`);
    },
    existing ? ()=>{ S.badan.latihan = S.badan.latihan.filter(x=>x.id!==e.id); commit(); toast('Latihan dihapus'); } : null);
}

function sheetBlock(existing){
  const e = existing || {};
  const o = dayRO(dayCur);
  const bl = [...(o.blocks||[])].sort((a,b)=>tmin(a.s)-tmin(b.s));
  const lastEnd = bl.length ? bl[bl.length-1].e : '';
  const now = new Date();
  form(existing?'Ubah blok waktu':'Blok waktu', tglFull(dayCur),
    F.rowgrid(F.time('blS','Mulai', e.s || lastEnd || `${pad(Math.max(now.getHours()-1,0))}:00`),
              F.time('blE','Selesai', e.e || `${pad(now.getHours())}:${pad(Math.floor(now.getMinutes()/5)*5)}`)) +
    F.chips('blC','Kegiatan', ACTS, e.c||'skripsi') +
    F.text('blT','Detail', e.t, 'Ngerjain BAB III bagian populasi…'),
    ()=>{
      const s = val('blS'), en = val('blE'); if (!s||!en) return false;
      const ob = { id:e.id||uid(), s, e:en, c:val('blC'), t:val('blT').trim() };
      const dd = day(dayCur);
      if (e.id) dd.blocks[dd.blocks.findIndex(x=>x.id===e.id)] = ob; else dd.blocks.push(ob);
      commit(); toast('Blok waktu disimpan');
    },
    existing ? ()=>{ const dd = day(dayCur); dd.blocks = dd.blocks.filter(x=>x.id!==e.id); commit(); toast('Blok dihapus'); } : null);
}

/* agenda nyentuh notifikasi, jadi tiap perubahan harus ngejadwalin ulang */
function simpanAgenda(pesan){
  commit();
  try{ Notif.apply(); }catch(e){}
  if (pesan) toast(pesan);
}

function sheetAgenda(existing){
  const e = existing || {};
  const ul = e.ulang || 'sekali';
  const hariOn = e.hari || [fromD(view==='day'?dayCur:today()).getDay()];
  form(existing?'Ubah agenda':'Agenda baru','Rencana yang mau lo tepatin',
    F.text('agJ','Mau ngapain', e.judul, 'Bimbingan sama dosen') +
    F.rowgrid(F.time('agS','Mulai', e.mulai||'08:00'), F.time('agE','Selesai', e.selesai||'09:00')) +
    F.chips('agK','Kegiatan', ACTS, e.kat||'kerja') +
    F.sel('agU','Ulang', [['sekali','Sekali'],['harian','Tiap hari'],['mingguan','Mingguan']], ul) +
    F.sel('agIngat','Ingetin', [['0','Nggak usah'],['5','5 menit sebelum'],['15','15 menit sebelum'],
      ['30','30 menit sebelum'],['60','1 jam sebelum']], String(e.ingat||0)) +
    `<div class="field" id="agTglW"${ul!=='sekali'?' style="display:none"':''}>
      <label>Tanggal</label><input class="inp" id="agTgl" type="date" value="${e.tgl || (view==='day'?dayCur:today())}"></div>
    <div class="field" id="agHariW"${ul!=='mingguan'?' style="display:none"':''}>
      <label>Hari</label><div class="row" style="gap:6px;flex-wrap:wrap">
        ${[1,2,3,4,5,6,0].map(w=>`<button type="button" class="chip ${hariOn.includes(w)?'on':''}" data-agh="${w}"
          style="font-size:12px;padding:7px 12px">${HARI3[w]}</button>`).join('')}</div></div>`,
    ()=>{
      const j = val('agJ').trim(), s = val('agS'), en = val('agE');
      if (!j || !s || !en) return false;
      const u = val('agU');
      const hari = $$('[data-agh].on').map(b=>+b.dataset.agh);
      if (u === 'mingguan' && !hari.length){ toast('Pilih minimal satu hari'); return false; }
      const o = { id:e.id||uid(), judul:j, kat:val('agK'), mulai:s, selesai:en, ulang:u,
                  hari: u==='mingguan' ? hari : [],
                  tgl: u==='sekali' ? (val('agTgl')||today()) : '', ingat: +val('agIngat')||0,
                  sumber: e.sumber||'manual', oleh: e.oleh||null };
      const i = S.agenda.findIndex(x=>x.id===o.id);
      if (i>=0) S.agenda[i] = o; else S.agenda.push(o);
      simpanAgenda(o.ingat ? 'Agenda disimpan, diingetin ' + o.ingat + ' menit sebelumnya' : (existing?'Agenda diperbarui':'Agenda ditambah'));
    },
    existing ? ()=>{ S.agenda = S.agenda.filter(x=>x.id!==e.id); simpanAgenda('Agenda dihapus'); } : null);

  $$('[data-agh]').forEach(b => b.onclick = ()=>{ b.classList.toggle('on'); buzz(5); });
  $('#agU').onchange = ()=>{
    const u = val('agU');
    $('#agTglW').style.display  = u==='sekali'   ? '' : 'none';
    $('#agHariW').style.display = u==='mingguan' ? '' : 'none';
  };
}

function sheetRoutines(){
  const tags = [['pagi','Pagi'],['badan','Badan'],['fokus','Fokus'],['malam','Malam']];
  sheetSaveFn = null; sheetDelFn = null;
  openSheet(`<h3>Atur rutinitas</h3><div class="sheetsub">Checklist yang muncul tiap hari</div>
    <div id="rtList">${S.routines.map(r=>`
      <div class="item" data-rtrow="${r.id}">
        <span class="grow"><input class="inp" data-rtname="${r.id}" value="${esc(r.n)}" style="padding:9px 11px;font-size:14px"></span>
        <select class="inp" data-rttag="${r.id}" style="width:96px;padding:9px 26px 9px 10px;font-size:13px">
          ${tags.map(([k,n])=>`<option value="${k}"${r.tag===k?' selected':''}>${n}</option>`).join('')}</select>
        <button class="iconbtn" data-rtdel="${r.id}" style="flex:none">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg></button>
      </div>`).join('')}</div>
    <button class="btn ghost block sm" id="rtAdd" style="margin-top:12px">+ Tambah rutinitas</button>
    <button class="btn block" id="rtSave" style="margin-top:10px">Simpan</button>`);
  $('#rtAdd').onclick = ()=>{ S.routines.push({id:uid(), n:'Rutinitas baru', tag:'pagi'}); commit(false); sheetRoutines(); };
  $('#rtSave').onclick = ()=>{
    S.routines.forEach(r=>{
      const n = $(`[data-rtname="${r.id}"]`), t = $(`[data-rttag="${r.id}"]`);
      if (n) r.n = n.value.trim() || r.n;
      if (t) r.tag = t.value;
    });
    commit(); closeSheet(); toast('Rutinitas diperbarui');
  };
  $$('[data-rtdel]').forEach(b=> b.onclick = ()=>{
    S.routines = S.routines.filter(r=>r.id!==b.dataset.rtdel); commit(false); sheetRoutines();
  });
}

function sheetSkripsiInfo(){
  const sk = S.skripsi;
  form('Info skripsi','',
    F.area('skJ','Judul', sk.judul, 'Judul skripsi lo…') +
    F.text('skD','Dosen pembimbing', sk.dosen) +
    F.date('skDl','Target sidang', sk.deadline) +
    F.num('skTarget','Target garap per hari (menit)', S.settings.targetSkripsiMenit, '60'),
    ()=>{ sk.judul = val('skJ').trim(); sk.dosen = val('skD').trim(); sk.deadline = val('skDl');
          S.settings.targetSkripsiMenit = numv('skTarget'); commit(); toast('Info skripsi disimpan'); });
}

function sheetBab(existing){
  const e = existing || {};
  form(existing?'Ubah bab':'Tambah bab','',
    F.text('bbN','Nama bab', e.n, 'BAB VI — Lampiran') +
    `<div class="field"><label>Progres <span class="tnum" id="bbLbl">${e.p||0}%</span></label>
      <input type="range" id="bbP" min="0" max="100" step="5" value="${e.p||0}" style="width:100%;accent-color:${cssv('--inv')}"></div>` +
    F.rowgrid(F.sel('bbSt','Status', Object.entries(BAB_ST).map(([k,v])=>[k,v.n]), e.st||'belum'), F.date('bbDl','Tenggat', e.dl)),
    ()=>{
      const n = val('bbN').trim(); if (!n) return false;
      const o = { id:e.id||uid(), n, p:+val('bbP'), st:val('bbSt'), dl:val('bbDl') };
      if (o.st==='acc' && o.p<100) o.p = 100;
      if (e.id) S.skripsi.bab[S.skripsi.bab.findIndex(x=>x.id===e.id)] = o; else S.skripsi.bab.push(o);
      commit(); toast('Bab disimpan');
    },
    existing ? ()=>{ S.skripsi.bab = S.skripsi.bab.filter(x=>x.id!==e.id); commit(); toast('Bab dihapus'); } : null);
  const r = $('#bbP'); if (r) r.oninput = ()=> $('#bbLbl').textContent = r.value + '%';
}

function sheetBimbingan(existing){
  const e = existing || {};
  form(existing?'Ubah catatan bimbingan':'Catatan bimbingan','Tulis mumpung masih inget',
    F.date('bmD','Tanggal', e.d||today()) +
    F.area('bmC','Kata dosen', e.catatan, 'Metodenya kurang kuat, tambah referensi 5 tahun terakhir…') +
    F.area('bmA','Yang harus dikerjain', e.aksi, 'Revisi 3.2, cari 5 jurnal baru…'),
    ()=>{
      const c = val('bmC').trim(); if (!c) return false;
      const o = { id:e.id||uid(), d:val('bmD')||today(), catatan:c, aksi:val('bmA').trim(), selesai:e.selesai||false };
      if (e.id) S.skripsi.bimbingan[S.skripsi.bimbingan.findIndex(x=>x.id===e.id)] = o; else S.skripsi.bimbingan.push(o);
      commit(); toast('Catatan tersimpan');
    },
    existing ? ()=>{ S.skripsi.bimbingan = S.skripsi.bimbingan.filter(x=>x.id!==e.id); commit(); toast('Catatan dihapus'); } : null);
}

function sheetSettings(){
  sheetSaveFn = null; sheetDelFn = null;
  const last = LS.get('rutin.lastsync', 0);
  openSheet(`<h3>Pengaturan</h3><div class="sheetsub">Sesuaikan target dan data lo</div>
  <div class="stack">
    ${F.text('stNama','Nama panggilan', S.profile.nama, 'Blay')}
    ${F.sel('stTheme','Tema',[['auto','Ikut sistem'],['dark','Gelap'],['light','Terang']], S.settings.theme)}
    ${F.amt('stBudget','Budget pengeluaran / bulan', S.settings.budget)}
    <div class="grid2">
      ${F.num('stAir','Target air (gelas)', S.settings.targetAir,'8')}
      ${F.num('stKal','Target kalori', S.settings.targetKalori,'2200')}
    </div>
    <div class="grid2">
      ${F.num('stBerat','Target berat (kg)', S.settings.beratTarget,'0','0.1')}
      ${F.num('stJam','Target jam kerja/hari', S.settings.jamKerjaTarget,'6','0.5')}
    </div>
    ${F.num('stTidur','Target jam tidur / malam', S.settings.targetTidur,'7','0.5')}
    <button class="btn block" id="stSave">Simpan pengaturan</button>

    <div class="hr"></div>
    <div class="lbl">Pengingat harian</div>
    <div class="card tight" style="background:var(--surface-2)">
      <div class="row between">
        <div class="grow"><div class="sm" style="font-weight:650">Ingetin tiap hari</div>
          <div class="xs dim">Pagi buat ceklis rutinitas, malam buat catat pengeluaran & jam tidur</div></div>
        <button class="chip ${S.settings.ingatkan?'on':''}" id="stNotif" style="flex:none">${S.settings.ingatkan?'Nyala':'Mati'}</button>
      </div>
      <div class="grid2" style="margin-top:11px">
        ${F.time('stJamPagi','Pagi', S.settings.jamPagi)}
        ${F.time('stJamMalam','Malam', S.settings.jamMalam)}
      </div>
      <div class="note" style="margin-top:9px" id="stNotifNote"></div>
    </div>

    <div class="lbl" style="margin-top:6px">Asisten</div>
    <div class="card tight" style="background:var(--surface-2)">
      <div class="row between">
        <div class="grow"><div class="sm" style="font-weight:650">${AI.siap()?'Tersambung':'Belum diatur'}</div>
          <div class="xs dim">${AI.siap()?esc(AI.cfg.model):'Catat & tanya pakai bahasa biasa'}</div></div>
        <button class="chip ${AI.siap()?'':'on'}" id="stAI" style="flex:none">${AI.siap()?'Atur':'Nyalakan'}</button>
      </div>
    </div>

    <div class="hr"></div>
    <div class="lbl">Sinkronisasi</div>
    <div class="card tight" style="background:var(--surface-2)">
      <div class="row between">
        <div class="grow"><div class="sm" style="font-weight:650">${Cloud.ready ? 'Tersambung' : Cloud.configured() ? 'Belum masuk' : 'Mode lokal'}</div>
        <div class="xs dim">${Cloud.ready ? esc(Cloud.user.email) + (last?' · sinkron '+new Date(last).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}):'') : 'Data cuma ada di HP ini'}</div></div>
        ${Cloud.ready
          ? `<button class="chip" id="stOut">Keluar</button>`
          : `<button class="chip on" id="stCloud">Sambungkan</button>`}
      </div>
      ${Cloud.ready?`<div class="row" style="gap:8px;margin-top:11px">
        <button class="btn ghost block sm" id="stPull">Tarik cloud</button>
        <button class="btn ghost block sm" id="stPush">Kirim ke cloud</button></div>`:''}
    </div>

    <div class="lbl" style="margin-top:6px">Cadangan</div>
    <div class="row" style="gap:9px">
      <button class="btn ghost block sm" id="stExp">Unduh cadangan</button>
      <button class="btn ghost block sm" id="stImp">Pulihkan</button>
    </div>
    <input type="file" id="stFile" accept="*/*" style="display:none">
    <button class="btn ghost block sm" id="stTempel" style="margin-top:9px">Pulihkan dari teks yang disalin</button>
    <button class="btn danger block sm" id="stReset">Hapus semua data</button>
    <div class="note" style="text-align:center;padding:6px 0 2px">Rutin · dibuat khusus buat lo</div>
  </div>`);

  $('#stSave').onclick = ()=>{
    S.profile.nama = val('stNama').trim();
    S.settings.theme = val('stTheme');
    S.settings.budget = numv('stBudget');
    S.settings.targetAir = numv('stAir')||8;
    S.settings.targetKalori = numv('stKal')||2000;
    S.settings.beratTarget = numv('stBerat');
    S.settings.jamKerjaTarget = numv('stJam');
    S.settings.targetTidur = numv('stTidur')||7;
    S.settings.jamPagi = val('stJamPagi') || '07:00';
    S.settings.jamMalam = val('stJamMalam') || '21:30';
    commit(); Notif.apply(); closeSheet(); toast('Pengaturan disimpan');
  };
  const g = id => $('#'+id);
  const noteEl = g('stNotifNote');
  noteEl.textContent = Native.on ? 'Berjalan di latar walau aplikasi ditutup.'
    : 'Di browser, pengingat cuma jalan selama tab aplikasi masih kebuka. Di versi APK jalan penuh di latar.';
  g('stNotif').onclick = async ()=>{
    if (!S.settings.ingatkan){
      const ok = await Notif.izin();
      if (!ok){ toast('Izin notifikasi ditolak'); return; }
      S.settings.ingatkan = true;
    } else S.settings.ingatkan = false;
    S.settings.jamPagi = val('stJamPagi') || '07:00';
    S.settings.jamMalam = val('stJamMalam') || '21:30';
    commit(false); await Notif.apply();
    const b = g('stNotif'); b.classList.toggle('on', S.settings.ingatkan);
    b.textContent = S.settings.ingatkan ? 'Nyala' : 'Mati';
    toast(S.settings.ingatkan ? 'Pengingat dinyalakan' : 'Pengingat dimatikan');
  };
  g('stAI').onclick = ()=>{ closeSheet(); setTimeout(()=> AI.siap() ? sheetAI() : openAI(), 260); };
  g('stCloud') && (g('stCloud').onclick = ()=>{ closeSheet(); openGate('cfg'); });
  g('stOut')   && (g('stOut').onclick = async ()=>{ await Cloud.signOut(); closeSheet(); render(); toast('Sudah keluar'); });
  g('stPull')  && (g('stPull').onclick = async ()=>{ try{ const r = await Cloud.pull();
      if (r && r.data && r.data.v){ S = r.data; LS.set('rutin.state',S); render(); toast('Data cloud dipakai'); }
      else toast('Cloud masih kosong'); }catch(e){ toast('Gagal narik data'); } });
  g('stPush')  && (g('stPush').onclick = async ()=>{ await Cloud.push(true); toast('Terkirim ke cloud'); });
  /* Di dalam APK, unduhan lewat blob URL sering nggak ngapa-ngapain — WebView-nya
     nggak punya pengelola unduhan. Dulu kodenya tetap bilang "Cadangan diunduh",
     jadi orang ngira punya file padahal nggak. Sekarang di native langsung kasih
     teksnya buat disalin, dan itu yang dijanjiin. */
  g('stExp').onclick = ()=>{
    const isi = JSON.stringify(S, null, 2);
    if (Native.on) return sheetCadanganTeks(isi);
    try{
      const blob = new Blob([isi], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `rutin-cadangan-${today()}.json`; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
      toast('Cadangan diunduh');
    }catch(e){ sheetCadanganTeks(isi); }
  };
  g('stImp').onclick = ()=> g('stFile').click();
  g('stFile').onchange = ev => {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ()=> pulihkanDari(String(r.result));
    r.onerror = ()=> toast('Filenya nggak kebaca');
    r.readAsText(f);
  };
  g('stTempel') && (g('stTempel').onclick = ()=> sheetTempelCadangan());
  g('stReset').onclick = ()=>{ if (confirm('Yakin hapus SEMUA data di HP ini? Nggak bisa dibalikin.')){
    S = seed(); commit(); closeSheet(); toast('Data direset'); } };
}

/* quick add menu dari FAB */
function sheetQuick(){
  sheetSaveFn = null;
  const hariIni = (typeof sesiHari === 'function') ? sesiHari(today()) : [];
  const opts = [
    ['asisten','✦','Tanya asisten','Tulis apa adanya'],
    ...(hariIni.length ? [['latihanHariIni','🏋','Mulai latihan', PROGRAM[hariIni[0]].n.split(' — ')[0]]] : []),
    ['out','💸','Pengeluaran','Catat duit keluar'],
    ['in','💰','Pemasukan','Catat duit masuk'],
    ['block','🕒','Blok waktu','Kegiatan jam berapa'],
    ['task','✅','Tugas','Kerjaan baru'],
    ['jam','⏱','Jam kerja','Log jam hari ini'],
    ['idea','💡','Ide konten','Simpan sebelum lupa'],
    ['latihan','💪','Latihan','Olahraga hari ini'],
    ['berat','⚖️','Berat badan','Timbangan hari ini'],
  ];
  openSheet(`<h3>Tambah cepat</h3><div class="sheetsub">Mau catat apa?</div>
    <div class="grid2">${opts.map(([k,ic,n,s])=>`
      <button class="card tight press" data-sheet="${k}" style="text-align:left">
        <div style="font-size:21px;margin-bottom:6px">${ic}</div>
        <div style="font-weight:700;font-size:14px;letter-spacing:-.02em">${n}</div>
        <div class="xs dim" style="margin-top:2px">${s}</div>
      </button>`).join('')}</div>`);
}

/* Satu jalur pemulihan buat file maupun teks yang ditempel, dan pesan galatnya
   nyebut penyebabnya — "nggak valid" doang bikin orang buntu. */
function pulihkanDari(teks){
  let o;
  try{ o = JSON.parse(teks); }
  catch(e){ toast('Isinya bukan JSON yang utuh — mungkin kepotong pas nyalin', 3600); return false; }
  if (!o || typeof o !== 'object'){ toast('Isinya bukan data Rutin', 3200); return false; }
  if (!o.v){ toast('Ini JSON, tapi bukan cadangan Rutin (nggak ada penanda versi)', 4000); return false; }
  Undo.simpan('pemulihan cadangan');
  S = o; migrate(); commit();
  closeSheet();
  const n = (S.txns||[]).length + Object.keys(S.days||{}).length;
  toast(`Data dipulihkan — ${n} catatan masuk`, 3600);
  return true;
}

function sheetCadanganTeks(isi){
  sheetSaveFn = null; sheetDelFn = null;
  openSheet(`<h3>Cadangan</h3>
    <div class="sheetsub">Salin semuanya, simpan di catatan atau kirim ke diri sendiri</div>
    <textarea class="inp" id="cadTeks" readonly style="height:190px;font-size:11px;font-family:ui-monospace,monospace">${esc(isi)}</textarea>
    <div class="note">${(isi.length/1024).toFixed(0)} KB. Buat mulihin nanti: Pengaturan → Pulihkan dari teks yang disalin.</div>
    <button class="btn block" id="cadSalin" style="margin-top:14px">Salin semua</button>`);
  $('#cadSalin').onclick = async ()=>{
    const ta = $('#cadTeks');
    try{
      await navigator.clipboard.writeText(isi);
      toast('Tersalin. Tempel di catatan sekarang juga.', 3600);
    }catch(e){
      ta.focus(); ta.select();
      toast('Kepilih semua — tekan Salin di keyboard', 3600);
    }
  };
}

function sheetTempelCadangan(){
  sheetSaveFn = null; sheetDelFn = null;
  openSheet(`<h3>Pulihkan dari teks</h3>
    <div class="sheetsub">Tempel isi cadangan yang lo salin</div>
    <textarea class="inp" id="pulTeks" placeholder='{"v":1,"updatedAt":...' style="height:170px;font-size:11px;font-family:ui-monospace,monospace"></textarea>
    <button class="btn block" id="pulOk" style="margin-top:14px">Pulihkan</button>`);
  $('#pulOk').onclick = ()=>{
    const t = val('pulTeks').trim();
    if (!t){ toast('Belum ada yang ditempel'); return; }
    pulihkanDari(t);
  };
}

const SHEETS = {
  out:()=>sheetTx('out'), in:()=>sheetTx('in'), task:()=>sheetTask(), jam:()=>sheetJam(),
  idea:()=>sheetIdea(), berat:sheetBerat, kalori:sheetKalori, latihan:()=>sheetLatihan(),
  block:()=>sheetBlock(), routines:sheetRoutines, settings:sheetSettings, agenda:()=>sheetAgenda(),
  skripsiInfo:sheetSkripsiInfo, babAdd:()=>sheetBab(), bimbingan:()=>sheetBimbingan(),
  quick:sheetQuick,
  jadwalLatihan:sheetJadwalLatihan,
  asisten:()=>{ closeSheetSilent(); setTimeout(openAI, 120); },
  latihanHariIni:()=>{ closeSheetSilent(); const h = sesiHari(today()); if (h.length) setTimeout(()=>bukaSesi(h[0]), 120); },
  air:()=>{ const i = intake(today()); S.badan.asupan[today()] = {...i, air:(i.air||0)+1};
            commit(); toast(`Gelas ke-${S.badan.asupan[today()].air} 💧`); buzz(10); },
};

/* ---------- delegasi event ---------- */
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-go],[data-sheet],[data-rt],[data-mood],[data-energi],[data-air],[data-tx],[data-task],[data-taskedit],[data-bab],[data-bimb],[data-idea],[data-lat],[data-wlog],[data-block],[data-agenda],[data-mfilter],[data-kfilter],[data-ifilter],[data-chip],[data-edit]');
  if (!t) return;
  const d = t.dataset;

  if (d.chip){ $$(`[data-chip="${d.chip}"]`).forEach(c=>c.classList.remove('on')); t.classList.add('on');
    $('#'+d.chip).value = d.val; buzz(5); return; }

  if (d.go){ if (d.ptab) progTab = d.ptab; go(d.go); return; }
  if (d.sheet){ closeSheetSilent(); (SHEETS[d.sheet]||(()=>{}))(); return; }

  if (d.rt){ const o = day(dayCur); o.rt = o.rt||{}; o.rt[d.rt] = !o.rt[d.rt]; buzz(o.rt[d.rt]?14:6);
    if (routinePct(dayCur)===1) toast('Semua rutinitas kelar hari ini 🎉');
    commit(); return; }
  if (d.mood){ const o = day(dayCur); o.mood = o.mood===+d.mood?0:+d.mood; buzz(); commit(); return; }
  if (d.energi){ const o = day(dayCur); o.energi = o.energi===+d.energi?0:+d.energi; buzz(); commit(); return; }
  if (d.air){ const i = intake(today()); S.badan.asupan[today()] = {...i, air: i.air===+d.air ? +d.air-1 : +d.air};
    buzz(10); commit(); return; }

  if (d.tx){ const x = S.txns.find(v=>v.id===d.tx); x && sheetTx(x.type, x); return; }
  if (d.task){ const x = S.tasks.find(v=>v.id===d.task); if (x){ x.done = !x.done; x.doneAt = x.done?today():'';
    buzz(x.done?16:6); if (x.done) toast('Kelar. Satu lagi turun.'); commit(); } return; }
  if (d.taskedit){ const x = S.tasks.find(v=>v.id===d.taskedit); x && sheetTask(x); return; }
  if (d.bab){ const x = S.skripsi.bab.find(v=>v.id===d.bab); x && sheetBab(x); return; }
  if (d.bimb){ const x = S.skripsi.bimbingan.find(v=>v.id===d.bimb); x && sheetBimbingan(x); return; }
  if (d.idea){ const x = S.ide.find(v=>v.id===d.idea); x && sheetIdea(x); return; }
  if (d.lat){ const x = S.badan.latihan.find(v=>v.id===d.lat); x && sheetLatihan(x); return; }
  if (d.wlog){ const x = S.workLogs.find(v=>v.id===d.wlog); x && sheetJam(x); return; }
  if (d.block){ const x = (dayRO(dayCur).blocks||[]).find(v=>v.id===d.block); x && sheetBlock(x); return; }
  if (d.agenda){
    // item turunan bukan punya agenda — lempar ke sumber aslinya
    if (d.agenda.startsWith('lat:')){ bukaSesi(d.agenda.slice(4)); return; }
    if (d.agenda.startsWith('tgs:')){ progTab = 'kerja'; go('prog'); return; }
    const x = S.agenda.find(v=>v.id===d.agenda); x && sheetAgenda(x); return;
  }

  if (d.mfilter){ moneyFilter = d.mfilter; moneyLimit = 10; renderMoney(); return; }
  if (d.kfilter){ kerjaFilter = d.kfilter; renderKerja(); return; }
  if (d.ifilter){ ideaFilter = d.ifilter; renderIdea(); return; }

  if (d.edit){ const o = dayRO(dayCur);
    form(d.edit==='bangun'?'Jam bangun':'Jam tidur', tglFull(dayCur),
      F.time('tmV', d.edit==='bangun'?'Bangun jam':'Tidur jam', o[d.edit]),
      ()=>{ day(dayCur)[d.edit] = val('tmV'); commit(); toast('Tersimpan'); });
    return; }
});
function closeSheetSilent(){ sheetOnClose = null; $('#sheet').classList.remove('on');
  $('#scrim').classList.remove('on'); document.body.style.overflow=''; }

/* tab bar & tombol atas */
$$('.tab').forEach(b => b.onclick = ()=> go(b.dataset.go));
$('#fab').onclick = ()=> sheetQuick();
$('#themeBtn').onclick = ()=>{
  const cur = document.documentElement.dataset.theme;
  S.settings.theme = cur==='dark' ? 'light' : 'dark';
  applyTheme(); commit(); buzz(10);
};
$('#syncBtn').onclick = async ()=>{
  if (!Cloud.configured()){ openGate('cfg'); return; }
  if (!Cloud.ready){ openGate('auth'); return; }
  await Cloud.syncDown(); toast('Sinkron selesai');
};
$('#dayPrev').onclick = ()=>{ dayCur = addDays(dayCur,-1); renderDay(); };
$('#dayNext').onclick = ()=>{ if (dayCur < today()){ dayCur = addDays(dayCur,1); renderDay(); } };
$('#dayToday').onclick = ()=>{ dayCur = today(); renderDay(); };
$('#mPrev').onclick = ()=>{ const [y,m]=monCur.split('-').map(Number);
  monCur = m===1?`${y-1}-12`:`${y}-${pad(m-1)}`; moneyLimit = 10; renderMoney(); window.scrollTo({top:0}); };
$('#mNext').onclick = ()=>{ if (monCur>=today().slice(0,7)) return;
  const [y,m]=monCur.split('-').map(Number); monCur = m===12?`${y+1}-01`:`${y}-${pad(m+1)}`;
  moneyLimit = 10; renderMoney(); window.scrollTo({top:0}); };
$$('#progSeg button').forEach(b => b.onclick = ()=>{ progTab = b.dataset.p; buzz(6); renderProg(); });

/* FAB minggir waktu lagi scroll ke bawah */
(function fabScroll(){
  let last = 0, t = null;
  const fabs = ()=> [$('#fab'), $('#aiFab')];
  window.addEventListener('scroll', ()=>{
    const y = window.scrollY;
    if (y > last + 12 && y > 140) fabs().forEach(f=>f.classList.add('away'));
    else if (y < last - 12) fabs().forEach(f=>f.classList.remove('away'));
    last = y;
    clearTimeout(t); t = setTimeout(()=>fabs().forEach(f=>f.classList.remove('away')), 900);
  }, {passive:true});
})();

/* geser kiri-kanan buat pindah tab */
(function swipeNav(){
  const order = ['home','day','money','prog','idea'];
  let x0=null, y0=null;
  document.addEventListener('touchstart', e=>{ if(e.touches.length!==1) return;
    x0=e.touches[0].clientX; y0=e.touches[0].clientY; }, {passive:true});
  document.addEventListener('touchend', e=>{
    if (x0===null || $('#sheet').classList.contains('on')) { x0=null; return; }
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)*2){
      const i = order.indexOf(view), n = clamp(i + (dx<0?1:-1), 0, order.length-1);
      if (n!==i) go(order[n]);
    }
    x0=null;
  }, {passive:true});
})();

document.addEventListener('visibilitychange', ()=>{ if (document.hidden) Cloud.push(); });
window.addEventListener('beforeunload', ()=>{ LS.set('rutin.state', S); });
</script>
