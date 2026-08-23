(()=>{'use strict';
const DB='YUAN_FIRST_LAYER_DB_V2',VER=3,STORE='transfers';
const low=v=>String(v??'').trim().toLowerCase();
const openDB=()=>new Promise((ok,no)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('wallets'))d.createObjectStore('wallets',{keyPath:'wallet'});if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'_key'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function allTransfers(){const db=await openDB();return new Promise((ok,no)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>ok(r.result||[]);r.onerror=()=>no(r.error)})}
const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
function download(txt,name){const b=new Blob(['\ufeff'+txt],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function exportRelayCsv(){
  try{
    const rows=(await allTransfers()).filter(r=>/^0x[a-f0-9]{40}$/.test(low(r.Counterparty)));
    if(!rows.length)return alert('目前沒有可匯出的 Relay 對手方資料。請先執行「更新／新增雙向第一層」。');
    const hs=['RelayAddress','Counterparty','Direction','Token','Amount','Time','TxHash'];
    const out=rows.map(r=>({
      RelayAddress:r.ProxyWallet||'',
      Counterparty:low(r.Counterparty),
      Direction:r.Direction||'',
      Token:r.OutputToken||r.InputToken||'',
      Amount:r.OutputAmount||r.InputAmount||'',
      Time:r.UpdatedAt||'',
      TxHash:r.FillTxHash||r.DepositTxHash||''
    }));
    const txt=[hs.join(','),...out.map(r=>hs.map(h=>q(r[h])).join(','))].join('\r\n');
    const unique=new Set(out.map(r=>r.Counterparty));
    download(txt,`YUAN_Relay_待Console調閱_${new Date().toISOString().slice(0,10)}.csv`);
    const m=document.getElementById('yrcMsg');if(m)m.textContent=`✅ 已輸出 Relay CSV｜交易 ${out.length}｜唯一 Counterparty ${unique.size}`;
  }catch(e){alert('Relay CSV 匯出失敗：'+(e?.message||e));}
}
function ui(){
  if(document.getElementById('yrcExport'))return;
  const anchor=document.getElementById('yuanRecipientExchange')||document.getElementById('yuanFirstLayerCard');
  if(!anchor)return setTimeout(ui,300);
  const box=document.createElement('div');box.id='yuanRelayCsvExport';box.className='card';
  box.innerHTML=`<h2>📤 Relay → Console 調閱匯出</h2><p class="sub">直接從 Relay 第一層資料輸出 Counterparty CSV，不做交易所猜測。這份 CSV 專門交給 OKLink Console Scanner 調閱。</p><button id="yrcExport">下載 Relay 待 Console 調閱 CSV</button><div id="yrcMsg" class="progress" style="margin-top:10px">等待操作。</div>`;
  anchor.parentNode.insertBefore(box,anchor.nextSibling);
  document.getElementById('yrcExport').onclick=exportRelayCsv;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
window.__YUAN_RELAY_CSV__={exportRelayCsv};
})();