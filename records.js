'use strict';

function renderRecords() {
  const allDb = getRecords();
  const yr  = (() => { const s=document.getElementById('rec-year-filter'); return s?parseInt(s.value)||0:0; })();
  const db  = filterByYear(allDb, yr);
  const q   = (document.getElementById('rec-search')?.value||'').toLowerCase();
  const sf  = document.getElementById('rec-filter-status')?.value||'';
  const cf  = document.getElementById('rec-filter-charge')?.value||'';
  const dvf = document.getElementById('rec-filter-dv')?.value||'';

  // Rebuild charge filter
  const charges = [...new Set(db.map(r=>r.chargeTo||'').filter(Boolean))].sort();
  const cSel = document.getElementById('rec-filter-charge');
  const prevC = cSel?.value;
  if (cSel) cSel.innerHTML = '<option value="">All Charges</option>' +
    charges.map(c=>`<option value="${c}" ${c===prevC?'selected':''}>${c}</option>`).join('');

  // Rebuild DV type filter — auto-detect prefixes from actual DV numbers
  const dvSel  = document.getElementById('rec-filter-dv');
  const prevDV = dvSel?.value;
  if (dvSel) {
    const prefixes = [...new Set(
      db.filter(r=>r.dvNo&&r.dvNo.trim())
        .map(r=>{ const m=r.dvNo.trim().match(/^([A-Za-z]+)/); return m?m[1].toUpperCase():''; })
        .filter(p=>p.length>=2)
    )].sort();
    dvSel.innerHTML =
      '<option value="">All DV Types</option>' +
      prefixes.map(p=>`<option value="${p}" ${p===prevDV?'selected':''}>${p}</option>`).join('') +
      `<option value="no-dv" ${'no-dv'===prevDV?'selected':''}>— Walang DV pa</option>`;
  }

  const filtered = db.filter(r => {
    const txt = !q||
      (r.payee||'').toLowerCase().includes(q)||
      (r.obrNo||'').toLowerCase().includes(q)||
      (r.dvNo||'').toLowerCase().includes(q)||
      (r.dvPayee||'').toLowerCase().includes(q)||
      (r.particulars||'').toLowerCase().includes(q)||
      (r.chargeTo||'').toLowerCase().includes(q);
    const matchStatus = !sf||r.action===sf;
    const matchCharge = !cf||r.chargeTo===cf;
    let matchDV = true;
    if (dvf==='no-dv') { matchDV=!r.dvNo||r.dvNo.trim()===''; }
    else if (dvf) { const m=(r.dvNo||'').trim().match(/^([A-Za-z]+)/); matchDV=(m?m[1].toUpperCase():'')=== dvf; }
    return txt&&matchStatus&&matchCharge&&matchDV;
  });

  const sub = document.getElementById('rec-sub');
  if (sub) {
    let label = filtered.length+' of '+allDb.length+' record'+(allDb.length!==1?'s':'');
    if (yr)              label += ' · '+yr;
    if (dvf==='no-dv')   label += ' · Walang DV';
    else if (dvf)        label += ' · DV: '+dvf;
    sub.textContent = label;
  }

  const tbody = document.getElementById('records-tbody');
  const empty = document.getElementById('records-empty');
  if (!filtered.length) { tbody.innerHTML=''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  tbody.innerHTML = filtered.map((r,i) => `
    <tr>
      <td class="mono" style="color:var(--subtle)">${i+1}</td>
      <td>${r.dateIn||'—'}</td>
      <td class="mono">${r.obrNo||'—'}</td>
      <td><div style="font-weight:600">${escHtml(r.payee)}</div></td>
      <td class="amount">${fmtPHP(r.amount)}</td>
      <td><span class="charge-chip">${escHtml(r.chargeTo||'—')}</span></td>
      <td>
        <div class="dv-cell">
          ${r.dvNo
            ?`<div class="mono" style="font-weight:600;color:var(--blue)">${escHtml(r.dvNo)}</div>`
            :`<span style="color:var(--subtle);font-size:12px">—</span>`}
          ${r.dvPayee?`<div style="font-size:11px;color:var(--muted)">${escHtml(r.dvPayee)}</div>`:''}
          ${r.dvAmount&&Number(r.dvAmount)>0?`<div style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--teal)">${fmtPHP(r.dvAmount)}</div>`:''}
        </div>
      </td>
      <td>${statusPill(r.action)}</td>
      <td style="font-size:12px;color:var(--muted)">${locationLabel(r.location)}</td>
      <td><div class="row-acts">
        <button class="act-btn" onclick="viewRecord('${r.id}')">View</button>
        <button class="act-btn" onclick="editRecord('${r.id}')">Edit</button>
        <button class="act-btn danger" onclick="deleteRecord('${r.id}')">Delete</button>
      </div></td>
    </tr>`).join('');
}

function filterRecords() { renderRecords(); }

function viewRecord(id) {
  const r = getRecords().find(x=>x.id===id); if (!r) return;
  document.getElementById('modal-title').textContent = '📋 Record — '+(r.obrNo||'No OBR');
  document.getElementById('modal-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Payee</label><p>${escHtml(r.payee)}</p></div>
      <div class="detail-item"><label>Amount (OBR)</label><p class="mono">${fmtPHP(r.amount)}</p></div>
      <div class="detail-item"><label>OBR / BUR No.</label><p class="mono">${r.obrNo||'—'}</p></div>
      <div class="detail-item"><label>DV No.</label><p class="mono" style="color:var(--blue);font-weight:700">${r.dvNo||'—'}</p></div>
      <div class="detail-item"><label>DV Payee</label><p>${escHtml(r.dvPayee)||'—'}</p></div>
      <div class="detail-item"><label>DV Amount</label><p class="mono" style="color:var(--teal)">${r.dvAmount&&Number(r.dvAmount)>0?fmtPHP(r.dvAmount):'—'}</p></div>
      <div class="detail-item"><label>Date In</label><p>${r.dateIn||'—'}${r.timeIn?' at '+r.timeIn:''}</p></div>
      <div class="detail-item"><label>Charge To</label><p>${r.chargeTo||'—'}</p></div>
      <div class="detail-item"><label>Year</label><p class="mono">${r.year||'—'}</p></div>
      <div class="detail-item"><label>Status</label><p>${statusPill(r.action)}</p></div>
      <div class="detail-item"><label>Location</label><p>${locationLabel(r.location)}</p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Particulars (OBR)</label><p>${escHtml(r.particulars)||'—'}</p></div>
      ${r.dvParticulars?`<div class="detail-item" style="grid-column:1/-1"><label>Particulars (DV)</label><p>${escHtml(r.dvParticulars)}</p></div>`:''}
    </div>
    <div class="move-form">
      <label>Quick Update — Move / Change Status</label>
      <div class="move-form-row">
        <select class="form-control" id="move-action" style="flex:1">
          ${['PENDING','OUP','ACCOUNTING','APPROVED','RELEASED','DISAPPROVED','RETURNED'].map(a=>`<option value="${a}" ${a===r.action?'selected':''}>${a}</option>`).join('')}
        </select>
        <select class="form-control" id="move-loc" style="flex:1">
          ${['Budget Office','OUP','Accounting Office','Released'].map(l=>`<option value="${l}" ${locationLabel(r.location)===l?'selected':''}>${l}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="moveRecord('${r.id}')">Update</button>
      </div>
    </div>`;
  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-neutral" onclick="closeModal()">Close</button>
    <button class="btn btn-danger" onclick="deleteRecord('${r.id}')">Delete</button>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function moveRecord(id) {
  const r = getRecords().find(x=>x.id===id); if (!r) return;
  const updated = {...r, action:document.getElementById('move-action')?.value, location:document.getElementById('move-loc')?.value};
  showLoading('Updating...');
  try { await apiUpdate(updated); replaceRecord(updated); showToast('📍 Updated!','success'); }
  catch(e) { showToast('⚠️ Updated locally','info'); }
  finally { hideLoading(); closeModal(); renderRecords(); refreshBudgetPage(); }
}

async function deleteRecord(id) {
  const r = getRecords().find(x=>x.id===id); if (!r) return;
  closeModal();
  const ok = await showConfirm('Delete Record',`Delete "${r.payee}"? This cannot be undone.`,'🗑','Delete','btn-danger');
  if (!ok) return;
  showLoading('Deleting...');
  try { await apiDelete(id); removeRecord(id); showToast('🗑 Deleted','error'); }
  catch(e) { showToast('⚠️ Deleted locally','info'); }
  finally { hideLoading(); renderRecords(); updateNavCount(getRecords().length); refreshBudgetPage(); }
}
