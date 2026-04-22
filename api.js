'use strict';

// ═══════════════════════════════════════════════
// ⭐ PALITAN MO LANG ANG DALAWANG ITO:
// ═══════════════════════════════════════════════
const SUPABASE_URL = 'https://uxssnusfdsxirebixcju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_F072vin2kqaKRbVgmtZ1LQ_AwL84WBZ';
// ═══════════════════════════════════════════════

const TABLE      = 'records';
const LOCAL_KEY  = 'prmsu_obr_local';
const HEADERS    = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Prefer':        'return=representation',
};

function isApiConfigured() {
  return SUPABASE_KEY && !SUPABASE_KEY.includes('PASTE_MO');
}

// ─── GET ALL ──────────────────────────────────
async function apiGetAll() {
  if (!isApiConfigured()) return getLocalRecords();
  try {
    const res  = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=created_at.desc`,
      { headers: HEADERS }
    );
    if (!res.ok) throw new Error('Fetch failed: ' + res.status);
    const data = await res.json();
    // Map snake_case → camelCase
    const mapped = data.map(mapFromDB);
    saveLocalCache(mapped);
    return mapped;
  } catch (e) {
    console.warn('apiGetAll failed, using cache:', e);
    return getLocalRecords();
  }
}

// ─── INSERT ───────────────────────────────────
async function apiInsert(record) {
  if (!isApiConfigured()) return localInsert(record);
  try {
    const res  = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}`,
      { method: 'POST', headers: HEADERS, body: JSON.stringify(mapToDB(record)) }
    );
    if (!res.ok) throw new Error('Insert failed: ' + res.status);
    const db = getLocalRecords(); db.unshift(record); saveLocalCache(db);
    return record;
  } catch (e) {
    console.warn('apiInsert failed:', e);
    return localInsert(record);
  }
}

// ─── UPDATE ───────────────────────────────────
async function apiUpdate(record) {
  if (!isApiConfigured()) return localUpdate(record);
  try {
    const res  = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(record.id)}`,
      { method: 'PATCH', headers: HEADERS, body: JSON.stringify(mapToDB(record)) }
    );
    if (!res.ok) throw new Error('Update failed: ' + res.status);
    const db  = getLocalRecords();
    const idx = db.findIndex(r => r.id === record.id);
    if (idx >= 0) { db[idx] = record; saveLocalCache(db); }
    return record;
  } catch (e) {
    console.warn('apiUpdate failed:', e);
    return localUpdate(record);
  }
}

// ─── DELETE ───────────────────────────────────
async function apiDelete(id) {
  if (!isApiConfigured()) return localDelete(id);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`,
      { method: 'DELETE', headers: HEADERS }
    );
    if (!res.ok) throw new Error('Delete failed: ' + res.status);
    saveLocalCache(getLocalRecords().filter(r => r.id !== id));
  } catch (e) {
    console.warn('apiDelete failed:', e);
    localDelete(id);
  }
}

// ─── Map camelCase ↔ snake_case ───────────────
function mapToDB(r) {
  return {
    id:               r.id,
    created_at:       r.createdAt,
    year:             r.year,
    date:             r.date,
    date_in:          r.dateIn,
    time_in:          r.timeIn,
    obr_no:           r.obrNo,
    payee:            r.payee,
    amount:           r.amount,
    charge_to:        r.chargeTo,
    received_by:      r.receivedBy,
    particulars:      r.particulars,
    date_released:    r.dateReleased,
    time_out:         r.timeOut,
    dv_no:            r.dvNo,
    dv_payee:         r.dvPayee,
    dv_amount:        r.dvAmount,
    dv_charge:        r.dvCharge,
    dv_particulars:   r.dvParticulars,
    oup_received:     r.oupReceived,
    oup_date:         r.oupDate,
    oup_time:         r.oupTime,
    received_initial: r.receivedInitial,
    action:           r.action,
    location:         r.location,
  };
}

function mapFromDB(r) {
  return {
    id:               r.id,
    createdAt:        r.created_at,
    year:             r.year,
    date:             r.date,
    dateIn:           r.date_in,
    timeIn:           r.time_in,
    obrNo:            r.obr_no,
    payee:            r.payee,
    amount:           r.amount,
    chargeTo:         r.charge_to,
    receivedBy:       r.received_by,
    particulars:      r.particulars,
    dateReleased:     r.date_released,
    timeOut:          r.time_out,
    dvNo:             r.dv_no,
    dvPayee:          r.dv_payee,
    dvAmount:         r.dv_amount,
    dvCharge:         r.dv_charge,
    dvParticulars:    r.dv_particulars,
    oupReceived:      r.oup_received,
    oupDate:          r.oup_date,
    oupTime:          r.oup_time,
    receivedInitial:  r.received_initial,
    action:           r.action,
    location:         r.location,
  };
}

// ─── Local Cache ──────────────────────────────
function getLocalRecords() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch (e) { return []; }
}
function saveLocalCache(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); }
  catch (e) {}
}
function localInsert(r)  { const db=getLocalRecords(); db.unshift(r); saveLocalCache(db); return r; }
function localUpdate(r)  { const db=getLocalRecords(); const i=db.findIndex(x=>x.id===r.id); if(i>=0){db[i]=r;saveLocalCache(db);} return r; }
function localDelete(id) { saveLocalCache(getLocalRecords().filter(r=>r.id!==id)); }

// ─── Helpers ──────────────────────────────────
function genId()  { return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function today()  { return new Date().toISOString().split('T')[0]; }