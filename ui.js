'use strict';
const PAGES=['dashboard','new-entry','records','tracker','budget'];
const PAGE_TITLES={'dashboard':'📊 Dashboard','new-entry':'📝 New Entry','records':'📋 Records','tracker':'📍 Paper Tracker','budget':'💰 Budget Summary'};

function showPage(id) {
  PAGES.forEach(p=>{document.getElementById('page-'+p)?.classList.add('hidden');document.getElementById('nav-'+p)?.classList.remove('active');});
  document.getElementById('page-'+id)?.classList.remove('hidden');
  document.getElementById('topbar-title').textContent=PAGE_TITLES[id]||id;
  document.getElementById('nav-'+id)?.classList.add('active');
  if(id==='dashboard'){buildYearFilters();refreshDashboard();refreshBudgetPage();}
  if(id==='records'){buildYearFilters();renderRecords();}
  if(id==='tracker')renderTrackerList();
  if(id==='budget'){buildYearFilters();refreshBudgetPage();}
  window.scrollTo({top:0,behavior:'smooth'});
}
function updateNavCount(n){document.getElementById('nav-count').textContent=n;}
function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function showLoading(msg='Loading...'){document.getElementById('loading-msg').textContent=msg;document.getElementById('loading-overlay').classList.remove('hidden');}
function hideLoading(){document.getElementById('loading-overlay').classList.add('hidden');}
let _tt;
function showToast(msg,type='success'){const el=document.getElementById('toast');el.textContent=msg;el.className='toast show '+type;clearTimeout(_tt);_tt=setTimeout(()=>{el.className='toast';},3400);}
let _cr;
function showConfirm(title,msg,icon='⚠️',okLabel='Delete',okClass='btn-danger'){
  setText('confirm-icon',icon);setText('confirm-title',title);setText('confirm-msg',msg);
  const btn=document.getElementById('confirm-ok');btn.textContent=okLabel;btn.className='btn '+okClass;
  document.getElementById('confirm-overlay').classList.remove('hidden');
  return new Promise(res=>{_cr=res;});
}
function confirmResolve(val){document.getElementById('confirm-overlay').classList.add('hidden');if(_cr){_cr(val);_cr=null;}}
function closeModal(e){if(e&&e.target!==document.getElementById('modal-overlay'))return;document.getElementById('modal-overlay').classList.add('hidden');}
function escHtml(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmtPHP(n){return'₱'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});}
function locationLabel(loc){return(loc||'Budget Office').replace(/[^\x00-\x7F]/g,'').trim()||'Budget Office';}
const STATUS_MAP={PENDING:{cls:'p-pending',label:'Pending'},OUP:{cls:'p-oup',label:'OUP'},ACCOUNTING:{cls:'p-accounting',label:'Accounting'},RELEASED:{cls:'p-released',label:'Released'},APPROVED:{cls:'p-approved',label:'Approved'},DISAPPROVED:{cls:'p-disapproved',label:'Disapproved'},RETURNED:{cls:'p-returned',label:'Returned'}};
function statusPill(action){const s=STATUS_MAP[action]||{cls:'p-pending',label:action||'—'};return`<span class="pill ${s.cls}">${s.label}</span>`;}
function updateDbStatus(ok){const dot=document.getElementById('db-dot');const text=document.getElementById('db-status-text');dot.classList.toggle('error',!ok);text.textContent=ok?(isApiConfigured()?'Google Sheets ✓':'LocalStorage (setup needed)'):'Connection Error';}
