'use strict';

const PIE_COLORS = {
  PENDING:'#c8750a', OUP:'#6c3fc9', ACCOUNTING:'#1a6cf0',
  RELEASED:'#137a3e', APPROVED:'#0c8b72', DISAPPROVED:'#c62828', RETURNED:'#c45a0a'
};

// ─── Get currently selected year (0 = all years) ──────────────
function getSelectedYear() {
  const sel = document.getElementById('dash-year-filter');
  return sel ? parseInt(sel.value) || 0 : 0;
}

// ─── Build year filter options from records ───────────────────
function buildYearFilters() {
  const db   = getRecords();
  const years = [...new Set(db.map(r => r.year || new Date(r.dateIn || r.createdAt || Date.now()).getFullYear()))].filter(Boolean).sort((a,b) => b - a);

  ['dash-year-filter','rec-year-filter','budget-year-filter'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="0">All Years</option>' +
      years.map(y => `<option value="${y}" ${String(y)===cur?'selected':''}>${y}</option>`).join('');
    if (!cur) sel.value = years[0] || new Date().getFullYear();
  });
}

// ─── Filter records by selected year ─────────────────────────
function filterByYear(db, yr) {
  if (!yr || yr === 0) return db;
  return db.filter(r => {
    const y = r.year || new Date(r.dateIn || r.createdAt || Date.now()).getFullYear();
    return y === yr;
  });
}

// ─── Main Dashboard Refresh ───────────────────────────────────
function refreshDashboard() {
  buildYearFilters();

  const allDb = getRecords();
  const yr    = getSelectedYear();
  const db    = filterByYear(allDb, yr);

  updateNavCount(allDb.length);

  // Date label
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  const displayYr = yr || 'All Years';
  setText('year-chip',       '📅 ' + displayYr);
  setText('form-year-label', 'Year ' + new Date().getFullYear());

  // Pipeline counts
  const bo  = db.filter(r => r.action === 'PENDING').length;
  const oup = db.filter(r => r.action === 'OUP').length;
  const acc = db.filter(r => r.action === 'ACCOUNTING' || r.action === 'APPROVED').length;
  const rel = db.filter(r => r.action === 'RELEASED').length;
  const p   = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v+' paper'+(v!==1?'s':''); };
  p('pipe-bo',bo); p('pipe-oup',oup); p('pipe-acc',acc); p('pipe-rel',rel);

  // KPI
  const totalAmt = db.reduce((s,r) => s + Number(r.amount||0), 0);
  setText('kpi-total',    db.length);
  setText('kpi-amount',   fmtPHP(totalAmt));
  setText('kpi-released', rel);
  setText('kpi-pending',  db.filter(r => r.action!=='RELEASED' && r.action!=='DISAPPROVED').length);
  setText('oc-bo', bo); setText('oc-oup', oup); setText('oc-acc', acc);

  // Reimbursement section
  renderReimbursementSummary(db);

  // Charts
  renderChargeBars(db);
  renderPie(db);
}

// ─── Reimbursement Summary on Dashboard ──────────────────────
function renderReimbursementSummary(db) {
  // ── OBR / Obligation totals (uses amount field)
  const totalReimb = db.reduce((s,r) => s + Number(r.amount||0), 0);
  const relReimb   = db.filter(r => r.action === 'RELEASED').reduce((s,r) => s + Number(r.amount||0), 0);
  const pendReimb  = db.filter(r => r.action === 'PENDING').reduce((s,r) => s + Number(r.amount||0), 0);
  const procReimb  = db.filter(r => r.action==='OUP'||r.action==='ACCOUNTING'||r.action==='APPROVED').reduce((s,r) => s + Number(r.amount||0), 0);

  setText('reimb-total',       fmtPHP(totalReimb));
  setText('reimb-count',       db.length + ' voucher' + (db.length!==1?'s':''));
  setText('reimb-released',    fmtPHP(relReimb));
  setText('reimb-pending',     fmtPHP(pendReimb));
  setText('reimb-inprocess',   fmtPHP(procReimb));
  setText('reimb-released-stat', fmtPHP(relReimb));

  // ── DV / Disbursement Voucher totals (uses dvAmount field)
  const dvDb    = db.filter(r => r.dvAmount && Number(r.dvAmount) > 0);
  const dvTotal = dvDb.reduce((s,r) => s + Number(r.dvAmount||0), 0);
  const dvRel   = dvDb.filter(r => r.action === 'RELEASED').reduce((s,r) => s + Number(r.dvAmount||0), 0);
  const dvPend  = dvDb.filter(r => r.action === 'PENDING').reduce((s,r) => s + Number(r.dvAmount||0), 0);
  const dvProc  = dvDb.filter(r => r.action==='OUP'||r.action==='ACCOUNTING'||r.action==='APPROVED').reduce((s,r) => s + Number(r.dvAmount||0), 0);

  setText('dv-total',      fmtPHP(dvTotal));
  setText('dv-count',      dvDb.length + ' voucher' + (dvDb.length!==1?'s':'') + ' with DV');
  setText('dv-released',   fmtPHP(dvRel));
  setText('dv-pending',    fmtPHP(dvPend));
  setText('dv-inprocess',  fmtPHP(dvProc));
  setText('dv-released-stat', fmtPHP(dvRel));

  // Per charge code breakdown
  const chargeEl = document.getElementById('reimb-per-charge');
  if (!chargeEl) return;

  const map = {};
  db.forEach(r => {
    const k = (r.chargeTo || 'N/A').trim();
    if (!map[k]) map[k] = { obrTotal:0, dvTotal:0, released:0, count:0 };
    map[k].obrTotal += Number(r.amount||0);
    map[k].dvTotal  += Number(r.dvAmount||0);
    map[k].count++;
    if (r.action === 'RELEASED') map[k].released += Number(r.amount||0);
  });

  const sorted     = Object.entries(map).sort((a,b) => b[1].obrTotal - a[1].obrTotal);
  const grandTotal = totalReimb || 1;

  if (!sorted.length) {
    chargeEl.innerHTML = '<p style="color:var(--muted);font-size:12px;padding:8px 0">Walang data pa.</p>';
    return;
  }

  chargeEl.innerHTML = sorted.map(([code, d]) => {
    const pct = Math.round(d.obrTotal / grandTotal * 100);
    return `
      <div class="reimb-charge-row">
        <div class="reimb-charge-left">
          <span class="charge-chip">${escHtml(code)}</span>
          <span class="reimb-charge-count">${d.count} voucher${d.count!==1?'s':''}</span>
        </div>
        <div class="reimb-charge-bar-wrap">
          <div class="reimb-charge-bar">
            <div class="reimb-charge-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div class="reimb-charge-col">
          <div class="reimb-charge-lbl">OBR</div>
          <div class="reimb-charge-amt">${fmtPHP(d.obrTotal)}</div>
        </div>
        <div class="reimb-charge-col">
          <div class="reimb-charge-lbl">DV</div>
          <div class="reimb-charge-amt" style="color:var(--teal)">${d.dvTotal > 0 ? fmtPHP(d.dvTotal) : '—'}</div>
        </div>
        <div class="reimb-charge-pct">${pct}%</div>
      </div>
    `;
  }).join('');
}

// ─── Bar chart ────────────────────────────────────────────────
function renderChargeBars(db) {
  const el = document.getElementById('charge-bars'); if (!el) return;
  const map = {};
  db.forEach(r => { const k=(r.chargeTo||'N/A').trim(); map[k]=(map[k]||0)+Number(r.amount||0); });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if (!sorted.length) { el.innerHTML='<div class="empty-state" style="padding:28px"><div class="es-icon">📊</div><p>No data yet</p></div>'; return; }
  const max = sorted[0][1]||1;
  el.innerHTML = sorted.map(([k,v]) => `
    <div class="bar-row">
      <div class="bar-label" title="${escHtml(k)}">${escHtml(k)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/max*100)}%"></div></div>
      <div class="bar-val">${fmtPHP(v)}</div>
    </div>`).join('');
}

// ─── Donut pie ────────────────────────────────────────────────
function renderPie(db) {
  const canvas = document.getElementById('pie-canvas');
  const legend = document.getElementById('pie-legend');
  if (!canvas || !legend) return;
  const map = {};
  db.forEach(r => { const k=r.action||'PENDING'; map[k]=(map[k]||0)+1; });
  const ctx = canvas.getContext('2d');
  const total = Object.values(map).reduce((a,b)=>a+b,0);
  const entries = Object.entries(map);
  ctx.clearRect(0,0,110,110);
  if (!total) {
    ctx.fillStyle='#e1e7ef'; ctx.beginPath(); ctx.arc(55,55,48,0,Math.PI*2); ctx.fill();
  } else {
    let s = -Math.PI/2;
    entries.forEach(([k,v]) => {
      const sl=(v/total)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(55,55); ctx.arc(55,55,48,s,s+sl); ctx.closePath();
      ctx.fillStyle=PIE_COLORS[k]||'#94a3b8'; ctx.fill(); s+=sl;
    });
    ctx.beginPath(); ctx.arc(55,55,26,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
    ctx.fillStyle='#1a2332'; ctx.font='700 14px JetBrains Mono,monospace';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(total,55,55);
  }
  legend.innerHTML = entries.length
    ? entries.map(([k,v]) => `<div class="pie-item"><div class="pie-dot" style="background:${PIE_COLORS[k]||'#94a3b8'}"></div><span>${k}</span><span class="pie-pct">${Math.round(v/total*100)}%</span></div>`).join('')
    : '<p class="text-muted" style="font-size:12px">No data yet</p>';
}
