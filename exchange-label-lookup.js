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
      if(labels[cp]){
        const lab=labels[cp]; labelCell.textContent=`${lab.exchange||'未知'}${lab.region?' / '+lab.region:''}`; labelCell.style.color='#166534'; found++; continue;
      }
      labelCell.textContent='自動辨識中…'; labelCell.style.color='#64748b';
      try{
        const j=await lookup(cp,chainId); checked++;
        publicProvider=publicProvider||Boolean(j?.providers?.explorer||j?.providers?.seed);
        externalProvider=externalProvider||Boolean(j?.providers?.walletlabels||j?.providers?.etherscan);
        if(j?.found&&j?.label){
          labels[cp]={exchange:j.label.exchange||'未知',region:j.label.region||'',tags:j.label.tags||'',source:j.label.source||'api'}; save(labels);
          labelCell.textContent=`${labels[cp].exchange}${labels[cp].region?' / '+labels[cp].region:''}`; labelCell.style.color='#166534'; labelCell.title=`來源：${j.label.source||'未知'}${j.label.tags?'｜'+j.label.tags:''}`; found++;
        } else {
          labelCell.textContent='待標記'; labelCell.style.color='#b45309';
        }
      }catch{labelCell.textContent='待標記';labelCell.style.color='#b45309';}
      await sleep(120);
    }
    const head=box.firstElementChild;
    if(head){
      const mode=externalProvider?'公開標籤＋外部 API':(publicProvider?'公開區塊鏈瀏覽器':'僅本機標籤');
      const suffix=`｜自動辨識 ${checked} 個地址｜命中 ${found} 筆｜來源：${mode}`;
      head.textContent=head.textContent.replace(/｜自動(?:標記|辨識).*$/,'')+suffix;
    }
    box.dataset.labelsRunning='0';
  }

  const obs=new MutationObserver(()=>setTimeout(run,80));
  function boot(){const box=document.getElementById('yeResolvedTxBox');if(box){obs.observe(box,{childList:true,subtree:true});run();}else setTimeout(boot,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
