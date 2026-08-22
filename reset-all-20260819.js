(()=>{'use strict';
const BTN='yuanFullResetBtn';
function clearDb(name){return new Promise(resolve=>{try{const r=indexedDB.deleteDatabase(name);r.onsuccess=r.onerror=r.onblocked=()=>resolve();}catch{resolve();}})}
async function reset(){
  if(!confirm('⚠️ 正式啟用前歸零\n\n將刪除目前瀏覽器中的成交測試資料、Relay 第一層、交易所反查快取、待調閱／已調閱及診斷資料。\n\n程式與交易所辨識規則不會刪除。\n\n確定要繼續嗎？'))return;
  const code=prompt('最後確認：請輸入「全部歸零」後按確定。');
  if(code!=='全部歸零')return alert('未輸入正確確認文字，已取消。');
  const dbs=['YUAN_POLY_CASE_DB_V1','YUAN_FIRST_LAYER_DB_V1','YUAN_FIRST_LAYER_DB_V2'];
  for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i)||'';if(/^(YUAN_|KEELUNG_|POLY_|OKLINK_|EXCHANGE_)/.test(k)){try{localStorage.removeItem(k)}catch{}}}
  try{sessionStorage.clear()}catch{}
  await Promise.allSettled(dbs.map(clearDb));
  alert('✅ 測試資料已全部歸零。頁面將重新載入，接下來可正式使用。');
  location.reload();
}
function mount(){
  if(document.getElementById(BTN))return;
  const anchor=document.getElementById('yuanRecipientExchange')||document.getElementById('yuanFirstLayerCard');
  if(!anchor)return setTimeout(mount,500);
  const box=document.createElement('div');
  box.style='margin-top:14px;padding-top:12px;border-top:1px solid rgba(120,120,120,.25);display:flex;justify-content:flex-end';
  box.innerHTML='<button id="'+BTN+'" class="ghost" style="border-color:#c53030;color:#c53030">⚠️ 正式啟用前：全部資料歸 0</button>';
  anchor.appendChild(box);
  document.getElementById(BTN).onclick=reset;
}
mount();
})();