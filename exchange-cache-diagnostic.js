(()=>{'use strict';
const TARGET='0x36339b5080a2d4be4bc8b5a48638f7326e093ada';
const ADDR='YUAN_EXCHANGE_ADDRESS_HISTORY_V1',CACHE='YUAN_COUNTERPARTY_EXCHANGE_SCAN_V6';
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return{}}};
const names=x=>[...new Set((x||[]).map(h=>h.exchange).filter(Boolean))].sort().join(', ')||'—';
function run(){const card=document.getElementById('yuanRecipientExchange'),api=window.__YUAN_RECIPIENT_EXCHANGE__;if(!card||!api)return setTimeout(run,400);let box=document.getElementById('yreTargetDiag');if(!box){box=document.createElement('div');box.id='yreTargetDiag';box.className='progress';box.style.cssText='margin-top:10px;padding:10px;white-space:normal;line-height:1.7';const det=card.querySelector('details');(det||card).insertAdjacentElement(det?'beforebegin':'beforeend',box)}const ah=load(ADDR)[TARGET]||{},cs=Object.values(load(CACHE)).filter(c=>String(c.address||'').toLowerCase()===TARGET),rawHits=ah.hits||[],cacheHits=cs.reduce((n,c)=>n+(c.hits||[]).length,0),finalRows=(api.rows?.()||[]).filter(r=>String(r.firstLayerAddress||'').toLowerCase().includes(TARGET));box.innerHTML=`<b>🔬 0x36339…093ada 診斷</b>｜地址快取 hits <b>${rawHits.length}</b>（${names(rawHits)}）｜IN/OUT cache ${cs.length} 組 / hits合計 <b>${cacheHits}</b>｜rows() 最終保留 <b>${finalRows.length}</b>（${names(finalRows)}）`;}
setInterval(run,1500);run();
})();