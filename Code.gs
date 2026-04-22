/**
 * Code.gs — Google Apps Script Backend
 * OBR & Voucher Tracker — PRMSU Budget Office
 *
 * SETUP:
 * 1. Go to https://script.google.com → New Project
 * 2. Paste this entire file
 * 3. Replace SHEET_ID with your Google Sheet ID
 * 4. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy Web App URL → paste into js/api.js → API_URL
 */

const SHEET_ID   = 'YOUR_GOOGLE_SHEET_ID_HERE'; // ← PALITAN ITO
const SHEET_NAME = 'Records';

function getHeaders() {
  return ['id','createdAt','year','date','dateIn','timeIn','obrNo','payee','amount',
    'chargeTo','receivedBy','particulars','dateReleased','timeOut','dvNo',
    'dvPayee','dvAmount','dvCharge','dvParticulars','oupReceived','oupDate',
    'oupTime','receivedInitial','action','location'];
}

function corsResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    if (e.parameter.action === 'getAll') return corsResponse({ok:true, data:getAllRecords()});
    return corsResponse({ok:false, error:'Unknown action'});
  } catch(err) { return corsResponse({ok:false, error:err.message}); }
}

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.action === 'insert') return corsResponse({ok:true, data:insertRecord(p.record)});
    if (p.action === 'update') return corsResponse({ok:true, data:updateRecord(p.record)});
    if (p.action === 'delete') { deleteRecord(p.id); return corsResponse({ok:true}); }
    return corsResponse({ok:false, error:'Unknown action'});
  } catch(err) { return corsResponse({ok:false, error:err.message}); }
}

function getSheet() {
  const ss   = SpreadsheetApp.openById(SHEET_ID);
  let sheet  = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(getHeaders());
    sheet.setFrozenRows(1);
    const hr = sheet.getRange(1,1,1,getHeaders().length);
    hr.setBackground('#0d1117');hr.setFontColor('#ffffff');hr.setFontWeight('bold');
  }
  return sheet;
}

function getAllRecords() {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {}; headers.forEach((h,i) => { obj[h] = row[i]; }); return obj;
  });
}

function insertRecord(record) {
  const sheet = getSheet();
  const row   = getHeaders().map(h => record[h] !== undefined ? record[h] : '');
  sheet.appendRow(row); return record;
}

function updateRecord(record) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const headers = data[0]; const idCol = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === record.id) {
      const row = getHeaders().map(h => record[h] !== undefined ? record[h] : '');
      sheet.getRange(i+1,1,1,row.length).setValues([row]); return record;
    }
  }
  throw new Error('Record not found: ' + record.id);
}

function deleteRecord(id) {
  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();
  const headers = data[0]; const idCol = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === id) { sheet.deleteRow(i+1); return; }
  }
}
