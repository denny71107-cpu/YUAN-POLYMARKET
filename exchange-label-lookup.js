(() => {
  'use strict';
  const LS_LABELS='YUAN_POLY_EXCHANGE_LABELS_V2';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const load=()=>{try{return JSON.parse(localStorage.getItem(LS_LABELS)||'{}');}catch{return{};}};
  const save=x=>localStorage.setItem(LS_LABELS,JSON.stringify(x));
  const chainIdFromName=name=>({Ethereum:1,Optimism:10,'BNB Chain':56,Polygon:137,Base:8453,Arbitrum:42161,Avalanche:43114})[String(name||'').trim()]||137;
  async function oklinkLookup(address,chainId){const r=await fetch(`/api/oklink-label?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(chainId)}&_=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return r.json();}
  async function fallbackLookup(address,chainId){const r=await fetch(`/api/labels?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(chainId)}&_=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return r.json();}
  function paint(cell,lab){cell.textContent=`${lab.exchange||'未知'}${lab.region?' / '+lab.region:''}`;cell.style.color='#166534';cell.style.fontWeight='700';cell.title=`來源：${lab.source||'未知'}${lab.tags?'｜'+lab.tags:''}`;}
  function paintProtocol(cell,ok){cell.textContent=`${ok.entity||ok.label||'DeFi'} / 非交易所`;cell.style.color='#7c3aed';cell.style.fontWeight='700';cell.title=`OKLink 標籤：${ok.label||ok.entity||'protocol'}｜此地址屬協議/DeFi，不列為交易所`;}
  function paintNone(cell,url){cell.textContent='OKLink 未發現交易所';cell.style.color='#64748b';cell.style.fontWeight='400';cell.title='OKLink 目前沒有辨識到明確交易所名稱';if(url){cell.style.cursor='pointer';cell.onclick=()=>window.open(url,'_blank');}}
  function trustedLocal(lab){return lab&&(/manual|verified label seed|人工確認/i.test(String(lab.source||''))||/人工確認/i.test(String(lab.tags||'')));}
  let running=false,lastSignature='';
  async function run(force=false){
    const box=document.getElementById('yeResolvedTxBox');if(!box||running)return;
    const table=box.querySelector('table');if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')];if(!rows.length)return;
    const sig=rows.map(tr=>{const td=tr.querySelectorAll('td');return td[7]?.querySelector('[data-copy]')?.dataset.copy||''}).join('|');
    if(!force&&sig===lastSignature&&rows.every(tr=>!/待 OKLink 驗證|送 OKLink 查詢中/.test(tr.querySelectorAll('td')[8]?.textContent||'')))return;
    running=true;box.dataset.labelsRunning='1';lastSignature=sig;
    const labels=load();let okHit=0,protocolHit=0,fallbackHit=0,checked=0;
    try{
      for(let i=0;i<rows.length;i++){
        const tr=rows[i],td=tr.querySelectorAll('td');if(td.length<9)continue;
        const chainId=chainIdFromName(td[2].textContent); // new table: Chain is column 3
        const cp=(td[7].querySelector('[data-copy]')?.dataset.copy||td[7].getAttribute('title')||td[7].textContent||'').trim().toLowerCase();
        const cell=td[8];if(!/^0x[a-f0-9]{40}$/.test(cp))continue;
        cell.dataset.yuanAddress=cp;cell.textContent=`送 OKLink ${checked+1}/${rows.length}…`;cell.style.color='#64748b';cell.onclick=null;
        try{
          const ok=await oklinkLookup(cp,chainId);checked++;
          if(ok?.found&&ok?.entityType==='protocol'){paintProtocol(cell,ok);protocolHit++;}
          else if(ok?.found&&ok?.exchange){const tw=/^(maicoin|max|bitopro)$/i.test(ok.exchange);const lab={exchange:ok.exchange,region:tw?'台灣':'海外',tags:ok.label||'OKLink 明確交易所名稱',source:ok.source||'OKLink API'};labels[cp]=lab;save(labels);paint(cell,lab);okHit++;}
          else {let fb=null;if(trustedLocal(labels[cp]))fb={found:true,label:labels[cp]};else fb=await fallbackLookup(cp,chainId);if(fb?.found&&fb?.label){const lab={exchange:fb.label.exchange||'未知',region:fb.label.region||'',tags:fb.label.tags||'',source:fb.label.source||'已知地址庫'};labels[cp]=lab;save(labels);paint(cell,lab);fallbackHit++;}else paintNone(cell,ok?.url);}
        }catch(e){cell.textContent='OKLink 查詢失敗';cell.style.color='#b45309';cell.title=e?.message||String(e);checked++;}
        const prog=document.getElementById('yeProgress');if(prog)prog.textContent=`OKLink 驗證中 ${checked}/${rows.length}｜交易所 ${okHit}｜DeFi ${protocolHit}`;
        await sleep(120);
      }
      const head=box.firstElementChild;if(head)head.textContent=head.textContent.replace(/｜OKLink 查.*$/,'').replace(/｜準備逐筆送 OKLink 驗證$/,'')+`｜OKLink 查 ${checked} 個地址｜交易所 ${okHit} 筆｜DeFi/協議 ${protocolHit} 筆${fallbackHit?`｜可信地址庫 ${fallbackHit} 筆`:''}`;
      const prog=document.getElementById('yeProgress');if(prog)prog.textContent=`全部完成：Relay + OKLink｜驗證 ${checked} 筆｜交易所 ${okHit}｜DeFi ${protocolHit}`;
      if(typeof window.__YUAN_EXCHANGE_RENDER__==='function')window.__YUAN_EXCHANGE_RENDER__();
    } finally {running=false;box.dataset.labelsRunning='0';}
  }
  window.__YUAN_RUN_OKLINK__=()=>run(true);
  const obs=new MutationObserver(()=>setTimeout(()=>run(false),100));
  function attach(){const box=document.getElementById('yeResolvedTxBox');if(box){obs.observe(box,{childList:true,subtree:true});box.addEventListener('yuan-ready',()=>run(true));run(false);return true}return false;}
  function boot(){if(!attach())setTimeout(boot,300);setInterval(()=>{const box=document.getElementById('yeResolvedTxBox');if(box&&!running&&/待 OKLink 驗證/.test(box.textContent))run(true)},1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();