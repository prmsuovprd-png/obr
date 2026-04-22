'use strict';

function refreshBudgetPage() {
  const allDb = getRecords();
  const yr    = (() => {
    const sel = document.getElementById('budget-year-filter');
    return sel ? parseInt(sel.value) || 0 : 0;
  })();
  const db    = filterByYear(allDb, yr);
  const total = db.reduce((s,r) => s + Number(r.amount||0), 0);

  const displayYr = yr || 'All Years';
  setText('bh-total', fmtPHP(total));
  setText('bh-sub',   db.length + ' vouchers · ' + displayYr);

  // Dashboard budget card
  const bscYr = (() => {
    const s = document.getElementById('dash-year-filter');
    return s ? parseInt(s.value) || 0 : 0;
  })();
  const bscDb = filterByYear(allDb, bscYr);
  const bscTotal = bscDb.reduce((s,r) => s + Number(r.amount||0), 0);
  setText('bsc-year',   bscYr || 'All Years');
  setText('bsc-total',  fmtPHP(bscTotal));
  setText('bsc-count',  bscDb.length + ' vouchers');

  const sumAmt = arr => arr.reduce((s,r) => s + Number(r.amount||0), 0);

  const pending     = db.filter(r => r.action === 'PENDING');
  const inProcess   = db.filter(r => r.action==='OUP'||r.action==='ACCOUNTING'||r.action==='APPROVED');
  const released    = db.filter(r => r.action === 'RELEASED');
  const disapproved = db.filter(r => r.action==='DISAPPROVED'||r.action==='RETURNED');

  setText('bsc-pending-amt',  fmtPHP(sumAmt(bscDb.filter(r=>r.action==='PENDING'))));
  setText('bsc-process-amt',  fmtPHP(sumAmt(bscDb.filter(r=>r.action==='OUP'||r.action==='ACCOUNTING'||r.action==='APPROVED'))));
  setText('bsc-released-amt', fmtPHP(sumAmt(bscDb.filter(r=>r.action==='RELEASED'))));
  setText('bsc-released-amount', fmtPHP(sumAmt(bscDb.filter(r=>r.action==='RELEASED'))));

  setText('bb-pending',           fmtPHP(sumAmt(pending)));
  setText('bb-pending-count',     pending.length    + ' voucher' + (pending.length!==1?'s':''));
  setText('bb-process',           fmtPHP(sumAmt(inProcess)));
  setText('bb-process-count',     inProcess.length  + ' voucher' + (inProcess.length!==1?'s':''));
  setText('bb-released',          fmtPHP(sumAmt(released)));
  setText('bb-released-count',    released.length   + ' voucher' + (released.length!==1?'s':''));
  setText('bb-disapproved',       fmtPHP(sumAmt(disapproved)));
  setText('bb-disapproved-count', disapproved.length+ ' voucher' + (disapproved.length!==1?'s':''));

  renderBudgetTable(db, total);
  renderMonthlyBars(db);
}

function renderBudgetTable(db, grandTotal) {
  const tbody = document.getElementById('budget-tbody');
  if (!tbody) return;
  const map = {};
  db.forEach(r => {
    const k = (r.chargeTo||'N/A').trim();
    if (!map[k]) map[k] = {total:0, released:0, pending:0, count:0};
    const amt = Number(r.amount||0);
    map[k].total   += amt;
    map[k].count++;
    if (r.action==='RELEASED') map[k].released += amt;
    else if (r.action!=='DISAPPROVED'&&r.action!=='RETURNED') map[k].pending += amt;
  });
  const sorted = Object.entries(map).sort((a,b)=>b[1].total-a[1].total);
  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">Walang records pa sa taong ito.</td></tr>`;
    return;
  }
  tbody.innerHTML = sorted.map(([code,d]) => {
    const pct = grandTotal>0 ? Math.round(d.total/grandTotal*100) : 0;
    return `<tr>
      <td><span class="charge-chip">${escHtml(code)}</span></td>
      <td class="mono" style="text-align:center">${d.count}</td>
      <td class="amount">${fmtPHP(d.total)}</td>
      <td style="color:var(--green);font-family:'JetBrains Mono',monospace;font-weight:600">${fmtPHP(d.released)}</td>
      <td style="color:var(--amber);font-family:'JetBrains Mono',monospace;font-weight:600">${fmtPHP(d.pending)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;background:var(--surface);border-radius:4px;height:6px;overflow:hidden">
            <div style="height:100%;background:var(--blue);border-radius:4px;width:${pct}%;transition:width .4s"></div>
          </div>
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);width:32px;text-align:right">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderMonthlyBars(db) {
  const el = document.getElementById('monthly-bars');
  if (!el) return;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const map = {};
  db.forEach(r => {
    if (!r.dateIn) return;
    const d = new Date(r.dateIn); if (isNaN(d)) return;
    const key = d.getFullYear()+'-'+String(d.getMonth()).padStart(2,'0');
    map[key] = (map[key]||0) + Number(r.amount||0);
  });
  const sorted = Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
  if (!sorted.length) { el.innerHTML='<p style="color:var(--muted);font-size:13px;padding:16px 0">Walang data pa.</p>'; return; }
  const max = Math.max(...sorted.map(([,v])=>v))||1;
  el.innerHTML = sorted.map(([key,val]) => {
    const [yr,mo] = key.split('-');
    const label   = MONTHS[parseInt(mo)]+' '+yr;
    return `<div class="bar-row">
      <div class="bar-label" title="${label}">${label}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(val/max*100)}%;background:var(--teal)"></div></div>
      <div class="bar-val">${fmtPHP(val)}</div>
    </div>`;
  }).join('');
}
