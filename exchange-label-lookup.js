(() => {
  'use strict';
  const LS_LABELS='YUAN_POLY_EXCHANGE_LABELS_V2';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const load=()=>{try{return JSON.parse(localStorage.getItem(LS_LABELS)||'{}');}catch{return{};}};
  const save=x=>localStorage.setItem(LS_LABELS,JSON.stringify(x));
  const chainIdFromName=name=>({Ethereum:1,Optimism:10,'BNB Chain':56,Polygon:137,Base:8453,Arbitrum:42161,Avalanche:43114})[String(name||'').trim()]||1;

  async function lookup(address,chainId){
    const r=await fetch(`/api/labels?address=${encodeURIComponent(address)}&chainId=${encodeURIComponent(chainId)}&_=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)return null;
    return r.json();
  }

  function paint(cell,lab){
    cell.textContent=`${lab.exchange||'未知'}${lab.region?' / '+lab.region:''}`;
    cell.style.color='#166534';
    cell.style.cursor='pointer';
    cell.title=`${lab.source?'來源：'+lab.source+'｜':''}點一下可修改交易所標籤`;
  }

  function enableManual(cell,address,labels){
    cell.style.cursor='pointer';
    cell.title='點一下手動指定交易所；儲存後此裝置會永久記住';
    cell.onclick=()=>{
      const old=labels[address]?.exchange||'';
      const exchange=prompt('輸入交易所名稱（例如 MaiCoin、BitoPro、Binance、OKX、Coinbase）',old);
      if(exchange===null)return;
      const name=exchange.trim(); if(!name)return;
      const tw=/^(maicoin|max|bitopro)$/i.test(name);
      labels[address]={exchange:name,region:tw?'台灣':'海外',tags:'人工確認',source:'manual'};
      save(labels); paint(cell,labels[address]);
      document.querySelectorAll(`[data-yuan-address="${address}"]`).forEach(x=>paint(x,labels[address]));
    };
  }

  async function run(){
    const box=document.getElementById('yeResolvedTxBox');
    if(!box||box.dataset.labelsRunning==='1')return;
    const table=box.querySelector('table'); if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')]; if(!rows.length)return;
    box.dataset.labelsRunning='1';
    const labels=load();
    let found=0,checked=0,publicProvider=false,externalProvider=false;
    for(const tr of rows){
      const td=tr.querySelectorAll('td'); if(td.length<9)continue;
      const chainId=chainIdFromName(td[1].textContent);
      const cp=(td[7].getAttribute('title')||td[7].textContent||'').trim().toLowerCase();
      const labelCell=td[8];
      if(!/^0x[a-f0-9]{40}$/.test(cp))continue;
      labelCell.dataset.yuanAddress=cp;
      if(labels[cp]){paint(labelCell,labels[cp]);found++;enableManual(labelCell,cp,labels);continue;}
      labelCell.textContent='自動辨識中…'; labelCell.style.color='#64748b';
      try{
        const j=await lookup(cp,chainId); checked++;
        publicProvider=publicProvider||Boolean(j?.providers?.explorer||j?.providers?.seed);
        externalProvider=externalProvider||Boolean(j?.providers?.walletlabels||j?.providers?.etherscan);
        if(j?.found&&j?.label){
          labels[cp]={exchange:j.label.exchange||'未知',region:j.label.region||'',tags:j.label.tags||'',source:j.label.source||'api'}; save(labels);
          paint(labelCell,labels[cp]); labelCell.title=`來源：${j.label.source||'未知'}${j.label.tags?'｜'+j.label.tags:''}｜點一下可修改`; found++;
        } else {
          labelCell.textContent='待標記（點我）'; labelCell.style.color='#b45309';
        }
      }catch{labelCell.textContent='待標記（點我）';labelCell.style.color='#b45309';}
      enableManual(labelCell,cp,labels);
      await sleep(120);
    }
    const head=box.firstElementChild;
    if(head){
      const mode=externalProvider?'公開標籤＋外部 API':(publicProvider?'公開區塊鏈瀏覽器＋人工地址庫':'人工地址庫');
      const suffix=`｜自動辨識 ${checked} 個地址｜命中 ${found} 筆｜來源：${mode}`;
      head.textContent=head.textContent.replace(/｜自動(?:標記|辨識).*$/,'')+suffix;
    }
    box.dataset.labelsRunning='0';
  }

  const obs=new MutationObserver(()=>setTimeout(run,80));
  function boot(){const box=document.getElementById('yeResolvedTxBox');if(box){obs.observe(box,{childList:true,subtree:true});run();}else setTimeout(boot,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
