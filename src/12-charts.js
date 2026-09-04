<script>
/* ============================================================
   RUTIN — grafik (SVG buatan tangan, no library)
   ============================================================ */

function ring(pct, size=76, sw=8, color='--inv', trackC='--track'){
  const r = (size - sw)/2, c = 2*Math.PI*r, off = c * (1 - clamp(pct,0,1));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${cssv(trackC)}" stroke-width="${sw}"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${cssv(color)}" stroke-width="${sw}"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${c.toFixed(2)}"
      style="animation:dash 1s var(--ease) forwards"><animate attributeName="stroke-dashoffset"
      from="${c.toFixed(2)}" to="${off.toFixed(2)}" dur="0.9s" fill="freeze" calcMode="spline"
      keySplines="0.32 0.72 0 1"/></circle></svg>`;
}

/* garis + area. data: [{l:label, v:number}] */
function areaChart(data, o={}){
  const W=340, H=o.h||118, pl=o.padL??26, pr=8, pt=10, pb=20;
  if (!data.length) return `<div class="empty" style="padding:22px">Belum ada data</div>`;
  const vs = data.map(d=>d.v);
  let mx = o.max ?? Math.max(...vs), mn = o.min ?? Math.min(...vs);
  if (mx === mn){ mx += Math.abs(mx||1)*.12 + 1; mn -= Math.abs(mn||1)*.12 + 1; }
  const pad = (mx-mn)*.14; mx += pad; mn -= pad;
  if (o.zero) mn = Math.min(0, mn);
  const X = i => pl + (W-pl-pr) * (data.length===1 ? .5 : i/(data.length-1));
  const Y = v => pt + (H-pt-pb) * (1 - (v-mn)/(mx-mn));
  const col = cssv(o.color||'--inv');
  const gid = 'g'+uid();
  let dpath = '', apath = '';
  data.forEach((d,i)=>{ const x=X(i).toFixed(1), y=Y(d.v).toFixed(1);
    dpath += (i?' L':'M')+x+' '+y; });
  apath = dpath + ` L${X(data.length-1).toFixed(1)} ${(H-pb).toFixed(1)} L${X(0).toFixed(1)} ${(H-pb).toFixed(1)} Z`;
  const grid = [0,.5,1].map(f=>{ const y=(pt+(H-pt-pb)*f).toFixed(1);
    return `<line class="gline" x1="${pl}" y1="${y}" x2="${W-pr}" y2="${y}"/>`; }).join('');
  const ylab = [mx, mn].map((v,i)=>`<text class="axl" x="0" y="${i===0?pt+4:H-pb+3}">${o.fmtY?o.fmtY(v):Math.round(v)}</text>`).join('');
  const step = Math.ceil(data.length/(o.ticks||4));
  const xlab = data.map((d,i)=> (i%step===0||i===data.length-1)
    ? `<text class="axl" x="${X(i).toFixed(1)}" y="${H-4}" text-anchor="middle">${esc(d.l)}</text>` : '').join('');
  const dots = data.length<=14 ? data.map((d,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(d.v).toFixed(1)}" r="2.6" fill="${cssv('--bg')}" stroke="${col}" stroke-width="1.8"/>`).join('') : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">
    <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}<path d="${apath}" fill="url(#${gid})"/>
    <path d="${dpath}" fill="none" stroke="${col}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${ylab}${xlab}</svg>`;
}

/* batang. data: [{l,v,c?}] */
function barChart(data, o={}){
  const W=340, H=o.h||120, pl=o.padL??26, pr=6, pt=10, pb=20;
  if (!data.length) return `<div class="empty" style="padding:22px">Belum ada data</div>`;
  const mx = Math.max(o.max||0, ...data.map(d=>Math.abs(d.v)), 1);
  const bw = (W-pl-pr)/data.length;
  const w  = Math.min(bw*.62, 26);
  const bars = data.map((d,i)=>{
    const h = (H-pt-pb) * (Math.abs(d.v)/mx);
    const x = pl + bw*i + (bw-w)/2, y = H-pb-h;
    const c = cssv(d.c || o.color || '--inv');
    return `<rect x="${x.toFixed(1)}" y="${(H-pb).toFixed(1)}" width="${w.toFixed(1)}" height="0" rx="${Math.min(w/2.6,6)}" fill="${c}" opacity="${d.dim?.34:1}">
      <animate attributeName="height" from="0" to="${h.toFixed(1)}" dur=".7s" begin="${i*0.03}s" fill="freeze" calcMode="spline" keySplines="0.32 0.72 0 1"/>
      <animate attributeName="y" from="${(H-pb).toFixed(1)}" to="${y.toFixed(1)}" dur=".7s" begin="${i*0.03}s" fill="freeze" calcMode="spline" keySplines="0.32 0.72 0 1"/></rect>`;
  }).join('');
  const labs = data.map((d,i)=>`<text class="axl" x="${(pl+bw*i+bw/2).toFixed(1)}" y="${H-4}" text-anchor="middle">${esc(d.l)}</text>`).join('');
  const grid = [0,.5].map(f=>{ const y=(pt+(H-pt-pb)*f).toFixed(1);
    return `<line class="gline" x1="${pl}" y1="${y}" x2="${W-pr}" y2="${y}"/>`; }).join('');
  const ymax = `<text class="axl" x="0" y="${pt+4}">${o.fmtY?o.fmtY(mx):Math.round(mx)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${grid}${bars}${labs}${ymax}</svg>`;
}

/* donut. segs: [{n,v,c}] */
function donut(segs, size=132, sw=17){
  const tot = sum(segs, s=>s.v);
  const r = (size-sw)/2, C = 2*Math.PI*r, cx = size/2;
  if (!tot) return `<svg width="${size}" height="${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${cssv('--track')}" stroke-width="${sw}"/></svg>`;
  let acc = 0;
  const arcs = segs.filter(s=>s.v>0).map((s,i)=>{
    const frac = s.v/tot, len = C*frac, off = -C*acc; acc += frac;
    const el = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${cssv(s.c)}" stroke-width="${sw}"
      stroke-dasharray="0 ${C.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" stroke-linecap="butt">
      <animate attributeName="stroke-dasharray" from="0 ${C.toFixed(2)}" to="${(len-1.5).toFixed(2)} ${(C-len+1.5).toFixed(2)}"
        dur=".75s" begin="${i*.05}s" fill="freeze" calcMode="spline" keySplines="0.32 0.72 0 1"/></circle>`;
    return el;
  }).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${cssv('--track')}" stroke-width="${sw}" opacity=".6"/>
    ${arcs}</svg>`;
}

/* heatmap konsistensi — weeks kolom, 7 baris */
function heatmap(weeks=17, valFn){
  const end = today();
  let start = addDays(end, -(weeks*7-1));
  // geser start ke hari Minggu
  const sd = fromD(start); start = addDays(start, -sd.getDay());
  const cells = [];
  let d = start;
  while (daysBetween(d, end) >= 0){
    const v = valFn(d);
    cells.push({d, v});
    d = addDays(d,1);
  }
  const col = cssv('--c-ok');
  const html = cells.map(c=>{
    const a = c.v<=0 ? 0 : c.v>=1 ? 1 : .18 + c.v*.82;
    const bg = a===0 ? cssv('--track') : col;
    const isToday = c.d===today();
    return `<i title="${c.d}" style="background:${bg};opacity:${a===0?1:a};${isToday?`outline:1.5px solid ${cssv('--text-2')};outline-offset:1px`:''}"></i>`;
  }).join('');
  return `<div class="heat">${html}</div>`;
}

/* bar tipis buat distribusi waktu 24 jam */
function dayStrip(blocks){
  if (!blocks.length) return '';
  const W=340,H=15;
  const segs = blocks.map(b=>{
    const s = tmin(b.s), e = tmin(b.e) <= tmin(b.s) ? tmin(b.e)+1440 : tmin(b.e);
    return `<rect x="${(s/1440*W).toFixed(1)}" y="0" width="${(Math.max(e-s,6)/1440*W).toFixed(1)}" height="${H}" rx="3" fill="${cssv(actOf(b.c).c)}"/>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="height:${H}px">
    <rect x="0" y="0" width="${W}" height="${H}" rx="3" fill="${cssv('--track')}"/>${segs}</svg>`;
}
const tmin = t => { const [h,m]=(t||'0:0').split(':').map(Number); return (h||0)*60 + (m||0); };
const mtime = m => `${pad(Math.floor((m%1440)/60))}:${pad(m%60)}`;
</script>
