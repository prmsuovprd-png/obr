'use strict';
let _editId=null;
const FORM_FIELDS=['f-date','f-date-in','f-time-in','f-obr-no','f-payee','f-amount','f-charge-to','f-received-by','f-particulars','f-date-released','f-time-out','f-dv-no','f-dv-payee','f-dv-amount','f-dv-charge','f-dv-particulars','f-oup-received','f-oup-date','f-oup-time','f-received-initial'];
function getVal(id){return(document.getElementById(id)?.value||'').trim();}
function setVal(id,val){const el=document.getElementById(id);if(el&&val!=null)el.value=val;}
function resolveLoc(action,raw){
  if(action==='RELEASED')return'Released';
  if(action==='OUP')return'OUP';
  if(action==='ACCOUNTING'||action==='APPROVED')return'Accounting Office';
  return raw||'Budget Office';
}
// Auto-update form year label when date changes
function updateFormYear(){
  const dateIn=getVal('f-date-in');
  if(dateIn){const yr=new Date(dateIn).getFullYear();setText('form-year-label','Year '+yr);}
}

// Copy OBR fields to DV fields
function copyOBRtoDV(){
  const payee=getVal('f-payee');
  const amount=document.getElementById('f-amount')?.value||'';
  const charge=getVal('f-charge-to');
  const parts=getVal('f-particulars');
  if(payee)  setVal('f-dv-payee',   payee);
  if(amount) setVal('f-dv-amount',  amount);
  if(charge) setVal('f-dv-charge',  charge);
  if(parts)  setVal('f-dv-particulars', parts);
  showToast('✅ Na-copy sa DV section!','success');
}

// Auto-copy when payee/amount/charge/particulars loses focus (if DV is still empty)
function setupAutoCopy(){
  const pairs=[
    ['f-payee','f-dv-payee'],
    ['f-amount','f-dv-amount'],
    ['f-charge-to','f-dv-charge'],
    ['f-particulars','f-dv-particulars'],
  ];
  pairs.forEach(([src,dst])=>{
    const srcEl=document.getElementById(src);
    const dstEl=document.getElementById(dst);
    if(!srcEl||!dstEl)return;
    srcEl.addEventListener('blur',()=>{
      // Only auto-copy if DV field is still empty
      if(!dstEl.value.trim() && srcEl.value.trim()){
        dstEl.value=srcEl.value;
      }
    });
  });
}

function clearForm(){
  FORM_FIELDS.forEach(id=>setVal(id,''));
  setVal('f-date-in',today());setVal('f-date',today());
  setVal('f-location','Budget Office');setVal('f-action','PENDING');
  updateFormYear();
  _editId=null;
  const btn=document.getElementById('btn-save');
  if(btn){btn.textContent='✅ Save Entry';btn.onclick=saveEntry;}
}
function buildRecord(action,location){
  return{
    date:getVal('f-date'),dateIn:getVal('f-date-in'),timeIn:getVal('f-time-in'),
    obrNo:getVal('f-obr-no'),payee:getVal('f-payee'),
    amount:parseFloat(document.getElementById('f-amount')?.value)||0,
    chargeTo:getVal('f-charge-to'),receivedBy:getVal('f-received-by'),
    particulars:getVal('f-particulars'),dateReleased:getVal('f-date-released'),
    timeOut:getVal('f-time-out'),dvNo:getVal('f-dv-no'),dvPayee:getVal('f-dv-payee'),
    dvAmount:parseFloat(document.getElementById('f-dv-amount')?.value)||0,
    dvCharge:getVal('f-dv-charge'),dvParticulars:getVal('f-dv-particulars'),
    oupReceived:getVal('f-oup-received'),oupDate:getVal('f-oup-date'),oupTime:getVal('f-oup-time'),
    receivedInitial:getVal('f-received-initial'),action,location,
  };
}
async function saveEntry(){
  if(!getVal('f-date-in')){showToast('⚠️ Date In is required','error');return;}
  if(!getVal('f-payee')){showToast('⚠️ Payee is required','error');return;}
  const amt=parseFloat(document.getElementById('f-amount')?.value);
  if(isNaN(amt)||amt<=0){showToast('⚠️ Enter a valid amount','error');return;}
  if(!getVal('f-particulars')){showToast('⚠️ Particulars is required','error');return;}
  const action=getVal('f-action')||'PENDING';
  // Detect year from Date In
  const dateIn=getVal('f-date-in');
  const entryYear=dateIn?new Date(dateIn).getFullYear():new Date().getFullYear();
  const record={...buildRecord(action,resolveLoc(action,getVal('f-location'))),id:genId(),createdAt:new Date().toISOString(),year:entryYear};
  showLoading('Saving to Google Sheets...');
  try{await apiInsert(record);addRecord(record);buildYearFilters();updateNavCount(getRecords().length);showToast('✅ Entry saved!','success');clearForm();showPage('records');}
  catch(e){showToast('⚠️ Saved locally (no internet)','info');}
  finally{hideLoading();}
}
async function updateEntry(){
  if(!_editId){saveEntry();return;}
  if(!getVal('f-payee')){showToast('⚠️ Payee required','error');return;}
  const amt=parseFloat(document.getElementById('f-amount')?.value);
  if(isNaN(amt)||amt<=0){showToast('⚠️ Valid amount required','error');return;}
  const action=getVal('f-action')||'PENDING';
  const dateIn=getVal('f-date-in');
  const entryYear=dateIn?new Date(dateIn).getFullYear():new Date().getFullYear();
  const existing=getRecords().find(r=>r.id===_editId);
  const record={...existing,...buildRecord(action,resolveLoc(action,getVal('f-location'))),year:entryYear};
  showLoading('Updating...');
  try{await apiUpdate(record);replaceRecord(record);showToast('💾 Updated!','success');}
  catch(e){showToast('⚠️ Updated locally','info');}
  finally{
    hideLoading();_editId=null;
    const btn=document.getElementById('btn-save');
    if(btn){btn.textContent='✅ Save Entry';btn.onclick=saveEntry;}
    clearForm();showPage('records');
  }
}
function editRecord(id){
  const r=getRecords().find(x=>x.id===id);if(!r)return;
  _editId=id;showPage('new-entry');
  setVal('f-date',r.date);setVal('f-date-in',r.dateIn);setVal('f-time-in',r.timeIn);
  setVal('f-obr-no',r.obrNo);setVal('f-payee',r.payee);setVal('f-amount',r.amount);
  setVal('f-charge-to',r.chargeTo);setVal('f-received-by',r.receivedBy);
  setVal('f-particulars',r.particulars);setVal('f-date-released',r.dateReleased);
  setVal('f-time-out',r.timeOut);setVal('f-dv-no',r.dvNo);setVal('f-dv-payee',r.dvPayee);
  setVal('f-dv-amount',r.dvAmount);setVal('f-dv-charge',r.dvCharge);
  setVal('f-dv-particulars',r.dvParticulars);setVal('f-oup-received',r.oupReceived);
  setVal('f-oup-date',r.oupDate);setVal('f-oup-time',r.oupTime);
  setVal('f-received-initial',r.receivedInitial);
  setVal('f-location',locationLabel(r.location));setVal('f-action',r.action);
  updateFormYear();
  const btn=document.getElementById('btn-save');
  if(btn){btn.textContent='💾 Update Entry';btn.onclick=updateEntry;}
  showToast('Editing: '+r.payee,'info');
}
