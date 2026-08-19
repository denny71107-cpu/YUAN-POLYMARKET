(() => {
'use strict';
const LS='YUAN_POLY_EXCHANGE_LABELS_V2';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const load=()=>{try{return JSON.parse(localStorage.getItem(LS)||'{}')}catch{return{}}},save=x=>localStorage.setItem(LS,JSON.stringify(x));
const chainIdFromName=n=>({Ethereum:1,Optimism:10,'BNB Chain':56,Polygon:137,Base:8453,Arbitrum:42161,Avalanche:43114})[String(n||'').trim()]||137;
async function lookup(address,chainId){const r=await fetch(`/api/labels?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(chainId)}&_=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw Error(`labels HTTP ${r.status}`);return r.json();}
function paintExchange(cell,lab){cell.textContent=`${lab.exchange||'Exchange'}${lab.region?' / '+lab.region:''}`;cell.style.color='#166534';cell.style.fontWeight='700';cell.title=`Tags: ${lab.tags||lab.exchange||''}｜來源：${lab.source||'label-source'}`;}
function paintProtocol(cell,lab){cell.textContent=`${lab.entity||lab.tags||'DeFi'} / 非交易所`;cell.style.color='#7c3aed';cell.style.fontWeight='700';cell.title=`Tags: ${lab.tags||lab.entity||''}｜來源：${lab.source||'label-source'}`;}
function paintNone(cell,providers){cell.textContent='未辨識';cell.style.color='#64748b';cell.style.fontWeight='400';cell.title=`已查：Seed${providers?.explorer?'、Explorer':''}${providers?.walletlabels?'、WalletLabels':''}${providers?.etherscan?'、Etherscan':''}`;}
let running=false,lastSig='';
async function run(force=false){
 const box=document.getElementById('yeResolvedTxBox');if(!box||running)return;
 const rows=[...box.querySelectorAll('tbody tr')];if(!rows.length)return;
 const sig=rows.map(tr=>tr.querySelectorAll('td')[7]?.querySelector('[data-copy]')?.dataset.copy||'').join('|');
 if(!force&&sig===lastSig&&rows.every(tr=>!/待 OKLink 驗證|送 OKLink|待標記|未辨識/.test(tr.querySelectorAll('td')[8]?.textContent||'')))return;
 running=true;lastSig=sig;box.dataset.labelsRunning='1';const cache=load();let checked=0,exHit=0,protocolHit=0;
 try{
  for(let i=0;i<rows.length;i++){
   const td=rows[i].querySelectorAll('td');if(td.length<9)continue;
   const chainId=chainIdFromName(td[2].textContent),cp=(td[7].querySelector('[data-copy]')?.dataset.copy||'').trim().toLowerCase(),cell=td[8];
   if(!/^0x[a-f0-9]{40}$/.test(cp))continue;
   cell.textContent=`多來源辨識 ${checked+1}/${rows.length}…`;cell.style.color='#64748b';cell.onclick=null;
   try{
    const j=await lookup(cp,chainId);checked++;
    if(j?.found&&j?.label){const lab=j.label;if(lab.entityType==='protocol'||(!lab.exchange&&lab.entity)){paintProtocol(cell,lab);protocolHit++;}else if(lab.exchange){cache[cp]=lab;save(cache);paintExchange(cell,lab);exHit++;}else paintNone(cell,j.providers);}else paintNone(cell,j?.providers);
   }catch(e){checked++;cell.textContent='辨識失敗';cell.style.color='#b45309';cell.title=String(e?.message||e);}
   const p=document.getElementById('yeProgress');if(p)p.textContent=`多來源標籤辨識 ${checked}/${rows.length}｜交易所 ${exHit}｜DeFi/協議 ${protocolHit}`;
   await sleep(100);
  }
  const head=box.firstElementChild;if(head)head.textContent=head.textContent.replace(/｜(?:OKLink|多來源).*$/,'').replace(/｜準備逐筆送 OKLink 驗證$/,'')+`｜多來源查 ${checked} 個地址｜交易所 ${exHit}｜DeFi/協議 ${protocolHit}`;
  const p=document.getElementById('yeProgress');if(p)p.textContent=`全部完成：Relay + 多來源標籤｜驗證 ${checked} 筆｜交易所 ${exHit}｜DeFi/協議 ${protocolHit}`;
  if(typeof window.__YUAN_EXCHANGE_RENDER__==='function')window.__YUAN_EXCHANGE_RENDER__();
 }finally{running=false;box.dataset.labelsRunning='0';}
}
window.__YUAN_RUN_OKLINK__=()=>run(true);window.__YUAN_RUN_LABELS__=()=>run(true);
const obs=new MutationObserver(()=>setTimeout(()=>run(false),120));
function attach(){const box=document.getElementById('yeResolvedTxBox');if(!box)return false;obs.observe(box,{childList:true,subtree:true});box.addEventListener('yuan-ready',()=>run(true));run(false);return true;}
function boot(){if(!attach())setTimeout(boot,300);setInterval(()=>{const b=document.getElementById('yeResolvedTxBox');if(b&&!running&&/待 OKLink 驗證|待標記/.test(b.textContent))run(true)},1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();