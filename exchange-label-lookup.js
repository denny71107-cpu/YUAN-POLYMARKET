(() => {
  'use strict';
  const LS_LABELS='YUAN_POLY_EXCHANGE_LABELS_V2';
  const LS_FLOW='YUAN_POLY_EXCHANGE_FLOW_CACHE_V1';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const load=()=>{try{return JSON.parse(localStorage.getItem(LS_LABELS)||'{}');}catch{return{};}};
  const save=x=>localStorage.setItem(LS_LABELS,JSON.stringify(x));
  const loadFlow=()=>{try{return JSON.parse(localStorage.getItem(LS_FLOW)||'{}');}catch{return{};}};
  const saveFlow=x=>localStorage.setItem(LS_FLOW,JSON.stringify(x));
  const chainIdFromName=name=>({Ethereum:1,Optimism:10,'BNB Chain':56,Polygon:137,Base:8453,Arbitrum:42161,Avalanche:43114})[String(name||'').trim()]||1;

  async function lookup(address,chainId){const r=await fetch(`/api/labels?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(chainId)}&_=${Date.now()}`,{cache:'no-store'});if(!r.ok)return null;return r.json();}
  async function flowLookup(address,labels){const r=await fetch('/api/exchange-flow-search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,chainId:0,labels}),cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j?.error||'flow search failed');return j;}

  function paintDirect(cell,lab){cell.textContent=`${lab.exchange||'未知'}${lab.region?' / '+lab.region:''}`;cell.style.color='#166534';cell.style.cursor='pointer';cell.title=`${lab.source?'來源：'+lab.source+'｜':''}此地址本身為已知交易所標籤`;}
  function paintFlow(cell,hit){const names=[...new Set((hit.exchanges||[]).filter(Boolean))];cell.textContent=names.length?names.join('、'):'未發現交易所往來';cell.style.color=names.length?'#0f766e':'#64748b';cell.style.cursor='default';cell.title=names.length?`資金往來命中：${names.join('、')}｜直接交易所地址命中 ${hit.hitCount||0} 筆`:'目前掃描範圍內未命中已知交易所水庫地址';}

  function enableManual(cell,address,labels){cell.style.cursor='pointer';cell.onclick=()=>{const old=labels[address]?.exchange||'';const exchange=prompt('輸入交易所名稱（例如 MaiCoin、BitoPro、Binance、OKX、Coinbase）',old);if(exchange===null)return;const name=exchange.trim();if(!name)return;const tw=/^(maicoin|max|bitopro)$/i.test(name);labels[address]={exchange:name,region:tw?'台灣':'海外',tags:'人工確認',source:'manual'};save(labels);paintDirect(cell,labels[address]);};}

  async function run(){
    const box=document.getElementById('yeResolvedTxBox');if(!box||box.dataset.labelsRunning==='1')return;
    const table=box.querySelector('table');if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')];if(!rows.length)return;
    box.dataset.labelsRunning='1';
    const labels=load(),flowCache=loadFlow();
    let directFound=0,flowFound=0,checked=0,scanned=0;
    for(const tr of rows){
      const td=tr.querySelectorAll('td');if(td.length<9)continue;
      const chainId=chainIdFromName(td[1].textContent);
      const cp=(td[7].querySelector('[data-copy]')?.dataset.copy||td[7].getAttribute('title')||td[7].textContent||'').trim().toLowerCase();
      const labelCell=td[8];if(!/^0x[a-f0-9]{40}$/.test(cp))continue;
      labelCell.dataset.yuanAddress=cp;
      if(labels[cp]){paintDirect(labelCell,labels[cp]);directFound++;enableManual(labelCell,cp,labels);continue;}
      labelCell.textContent='查交易所往來中…';labelCell.style.color='#64748b';
      try{
        const j=await lookup(cp,chainId);checked++;
        if(j?.found&&j?.label){labels[cp]={exchange:j.label.exchange||'未知',region:j.label.region||'',tags:j.label.tags||'',source:j.label.source||'api'};save(labels);paintDirect(labelCell,labels[cp]);directFound++;enableManual(labelCell,cp,labels);continue;}
        const cached=flowCache[cp];
        if(cached&&Date.now()-Number(cached.at||0)<6*60*60*1000){paintFlow(labelCell,cached);if(cached.exchanges?.length)flowFound++;continue;}
        const f=await flowLookup(cp,labels);scanned+=Number(f?.scanned||0);
        const exchanges=[...new Set((f?.hits||[]).map(x=>x.exchange).filter(Boolean))];
        const entry={at:Date.now(),exchanges,hitCount:Number(f?.count||0),hits:(f?.hits||[]).slice(0,20)};
        flowCache[cp]=entry;saveFlow(flowCache);paintFlow(labelCell,entry);if(exchanges.length)flowFound++;
      }catch(e){labelCell.textContent='查詢失敗';labelCell.style.color='#b45309';labelCell.title=e?.message||String(e);}
      await sleep(150);
    }
    const head=box.firstElementChild;if(head){const suffix=`｜地址標籤 ${directFound} 筆｜有交易所資金往來 ${flowFound} 個地址${scanned?`｜掃描 ${scanned} 筆 Token Transfer`:''}`;head.textContent=head.textContent.replace(/｜自動(?:標記|辨識).*$/,'').replace(/｜地址標籤.*$/,'')+suffix;}
    box.dataset.labelsRunning='0';
  }

  const obs=new MutationObserver(()=>setTimeout(run,100));
  function boot(){const box=document.getElementById('yeResolvedTxBox');if(box){obs.observe(box,{childList:true,subtree:true});run();}else setTimeout(boot,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
