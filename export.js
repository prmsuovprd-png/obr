'use strict';
function exportCSV(){
  const db=getRecords();if(!db.length){showToast('⚠️ No records','error');return;}
  const h=['#','Year','Date In','OBR/BUR No.','Payee','Amount','Charge To','Particulars',
           'DV No.','DV Payee','DV Amount','DV Charge To','DV Particulars',
           'OUP Received By','OUP Date','Status','Location'];
  const rows=db.map((r,i)=>[
    i+1,
    r.year||'',
    r.dateIn||'',
    r.obrNo||'',
    r.payee||'',
    r.amount||0,
    r.chargeTo||'',
    (r.particulars||'').replace(/,/g,';').replace(/\n/g,' '),
    r.dvNo||'',
    r.dvPayee||'',
    r.dvAmount||0,
    r.dvCharge||'',
    (r.dvParticulars||'').replace(/,/g,';').replace(/\n/g,' '),
    r.oupReceived||'',
    r.oupDate||'',
    r.action||'',
    locationLabel(r.location),
  ]);
  const csv=[h,...rows].map(row=>row.map(v=>`"${v}"`).join(',')).join('\n');
  dlFile('OBR_Voucher_All_Years.csv','text/csv;charset=utf-8;','\uFEFF'+csv);
  showToast('📄 CSV exported!','success');
}

function exportExcel(){
  const db=getRecords();if(!db.length){showToast('⚠️ No records','error');return;}
  const e=s=>(s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html=`
    <table>
      <thead>
        <tr style="background:#0d1117;color:#fff;font-weight:bold">
          <th>#</th>
          <th>Year</th>
          <th>Date In</th>
          <th>OBR/BUR No.</th>
          <th>Payee</th>
          <th>Amount (OBR)</th>
          <th>Charge To</th>
          <th>Particulars</th>
          <th>DV No.</th>
          <th>DV Payee</th>
          <th>DV Amount</th>
          <th>DV Charge To</th>
          <th>DV Particulars</th>
          <th>OUP Received By</th>
          <th>OUP Date</th>
          <th>Status</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
  `;
  db.forEach((r,i)=>{
    html+=`<tr>
      <td>${i+1}</td>
      <td>${r.year||''}</td>
      <td>${e(r.dateIn)}</td>
      <td>${e(r.obrNo)}</td>
      <td>${e(r.payee)}</td>
      <td>${r.amount||0}</td>
      <td>${e(r.chargeTo)}</td>
      <td>${e(r.particulars)}</td>
      <td style="background:#e8f0fe;font-weight:bold">${e(r.dvNo)}</td>
      <td style="background:#e8f0fe">${e(r.dvPayee)}</td>
      <td style="background:#e8f0fe">${r.dvAmount||0}</td>
      <td style="background:#e8f0fe">${e(r.dvCharge)}</td>
      <td style="background:#e8f0fe">${e(r.dvParticulars)}</td>
      <td>${e(r.oupReceived)}</td>
      <td>${e(r.oupDate)}</td>
      <td>${e(r.action)}</td>
      <td>${e(locationLabel(r.location))}</td>
    </tr>`;
  });
  html+='</tbody></table>';
  dlFile('OBR_Voucher_All_Years.xls','application/vnd.ms-excel',html);
  showToast('📊 Excel exported!','success');
}

function dlFile(name,type,content){
  const blob=new Blob([content],{type});const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
