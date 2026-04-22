'use strict';
const ACTION_STAGE={PENDING:0,OUP:1,ACCOUNTING:2,APPROVED:2,RELEASED:3,DISAPPROVED:0,RETURNED:0};
function renderTrackerList(){
  const active=getRecords().filter(r=>r.action!=='RELEASED'&&r.action!=='DISAPPROVED');
  const el=document.getElementById('track-list');
  if(!active.length){el.innerHTML='<p class="text-muted" style="font-size:13px;padding:10px 0">No Active Documents.</p>';return;}
  el.innerHTML=active.slice(0,12).map(r=>`<div class="tal-item"><div style="flex:1;min-width:0"><div class="tal-payee">${escHtml(r.payee)}</div><div class="tal-sub">${r.obrNo||'No OBR'} · ${r.dateIn||''} · <strong>${r.year||''}</strong></div></div><div style="font-size:12px;color:var(--muted);margin-right:8px">${locationLabel(r.location)}</div><div>${statusPill(r.action)}</div></div>`).join('');
}
function trackPaper(){
  const q=document.getElementById('track-input')?.value.trim().toLowerCase();if(!q)return;
  const r=getRecords().find(x=>(x.obrNo||'').toLowerCase().includes(q)||(x.payee||'').toLowerCase().includes(q)||(x.dvNo||'').toLowerCase().includes(q));
  document.getElementById('track-all').classList.add('hidden');
  const el=document.getElementById('track-result');
  if(!r){el.classList.remove('hidden');el.innerHTML=`<div class="track-result" style="text-align:center;padding:32px"><div style="font-size:38px;margin-bottom:10px">🔍</div><p style="font-weight:600">Walang nahanap</p><p style="font-size:12px;color:var(--muted);margin-top:4px">No match for "<strong>${escHtml(q)}</strong>"</p></div>`;return;}
  const cur=ACTION_STAGE[r.action]??0;
  const stages=[{label:'Budget Office',sub:r.dateIn?`Date In: ${r.dateIn}${r.timeIn?' at '+r.timeIn:''}`:'Received',icon:'🏛'},{label:'OUP',sub:r.oupDate?`Forwarded: ${r.oupDate}`:'Pending/Forwarded',icon:'🏠'},{label:'Accounting',sub:r.dvNo?`DV: ${r.dvNo}`:'Under review',icon:'📋'},{label:'Released',sub:r.dateReleased?`Released: ${r.dateReleased}`:'Awaiting release',icon:'✅'}];
  el.classList.remove('hidden');
  el.innerHTML=`<div class="track-result"><div class="tr-meta"><div><div class="tr-payee">${escHtml(r.payee)}</div><div class="tr-details">${r.obrNo||'No OBR'} · ${fmtPHP(r.amount)} · ${r.chargeTo||'—'} · <strong>Year ${r.year||'—'}</strong></div><div style="margin-top:8px">${statusPill(r.action)}</div></div><div class="tr-loc-chip">📍 ${locationLabel(r.location)}</div></div><div class="timeline">${stages.map((s,i)=>{const dc=i<cur?'done':(i===cur?'current':'pending');const lc=i<cur?'done':'';return`<div class="tl-step"><div class="tl-col"><div class="tl-dot ${dc}">${i<cur?'✓':(i+1)}</div>${i<stages.length-1?`<div class="tl-line ${lc}"></div>`:''}</div><div class="tl-content"><div class="tl-stage-name">${s.icon} ${s.label}</div><div class="tl-stage-info">${s.sub}</div></div></div>`;}).join('')}</div></div>`;
}
function clearTracker(){
  const inp=document.getElementById('track-input');if(inp)inp.value='';
  const res=document.getElementById('track-result');res.classList.add('hidden');res.innerHTML='';
  document.getElementById('track-all').classList.remove('hidden');renderTrackerList();
}
