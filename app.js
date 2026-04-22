'use strict';
(async function init(){
  if(!isApiConfigured()) document.getElementById('setup-banner')?.classList.remove('hidden');
  showLoading('Loading records...');
  try{const data=await apiGetAll();setRecords(data);updateDbStatus(true);}
  catch(e){updateDbStatus(false);}
  finally{hideLoading();}
  buildYearFilters();
  updateNavCount(getRecords().length);
  refreshDashboard();
  refreshBudgetPage();
  const fi=document.getElementById('f-date-in');if(fi)fi.value=today();
  const fd=document.getElementById('f-date');if(fd)fd.value=today();
  updateFormYear();
  setupAutoCopy();
})();
