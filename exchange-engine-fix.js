(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const DEFAULT_WALLET = '0xf83ec0e37ac9eece71c064507270e9001a734663';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_RELAY) || '{}'); } catch { return {}; } };
  const save = x => localStorage.setItem(LS_RELAY, JSON.stringify(x));
  const validWallet = w => /^0x[a-f0-9]{40}$/.test(String(w || '').trim().toLowerCase());
  const short = v => !v ? '—' : (v.length > 20 ? v.slice(0,10) + '…' + v.slice(-8) : v);

  function purgeFailed() { const cache=load(); let n=0; for(const k of Object.keys(cache)){if(cache[k]&&cache[k].error){delete cache[k];n++;}} if(n)save(cache); return n; }
  function collectKnownAddresses(value, labels, out=[], depth=0){ if(depth>8||value==null)return out; if(typeof value==='string'){for(const a of(value.match(/0x[a-fA-F0-9]{40}/g)||[])){const al=a.toLowerCase();if(labels[al])out.push(al);}return out;} if(Array.isArray(value)){value.slice(0,500).forEach(x=>collectKnownAddresses(x,labels,out,depth+1));return out;} if(typeof value==='object'){for(const v of Object.values(value).slice(0,500))collectKnownAddresses(v,labels,out,depth+1);} return out; }
  function requestArray(data){if(Array.isArray(data?.requests))return data.requests;if(Array.isArray(data?.data))return data.data;if(Array.isArray(data))return data;return[];}
  function labelsFromStorage(){try{return JSON.parse(localStorage.getItem('YUAN_POLY_EXCHANGE_LABELS_V2')||'{}');}catch{return{};}}
  function ensureTxPanel(){let box=document.getElementById('yeResolvedTxBox');if(box)return box;const anchor=document.getElementById('yeProgress');if(!anchor)return null;box=document.createElement('div');box.id='yeResolvedTxBox';box.style.cssText='margin-top:10px;overflow:auto;max-height:430px;border:1px solid #d8e0e8;border-radius:9px;background:#fff';box.innerHTML='<div style="padding:10px;color:#657287;font-size:12px">鏈上交易明細尚未載入。</div>';anchor.insertAdjacentElement('afterend',box);return box;}
  function chainExplorer(chainId,hash){const base=({1:'https://etherscan.io/tx/',10:'https://optimistic.etherscan.io/tx/',56:'https://bscscan.com/tx/',137:'https://polygonscan.com/tx/',8453:'https://basescan.org/tx/',42161:'https://arbiscan.io/tx/',43114:'https://snowtrace.io/tx/'})[Number(chainId)];return base&&hash?base+encodeURIComponent(hash):'';}
  function chainName(id){return({1:'Ethereum',10:'Optimism',56:'BNB Chain',137:'Polygon',8453:'Base',42161:'Arbitrum',43114:'Avalanche'})[Number(id)]||String(id||'—');}

  function renderResolved(requests,labels,wallet){
    const box=ensureTxPanel(); if(!box)return{txCount:0,knownCount:0};
    const unique=new Map();
    for(const req of requests){
      const rid=req?.id||req?.requestId||req?.data?.id||'';
      for(const tx of(Array.isArray(req?.resolvedTxs)?req.resolvedTxs:[])){
        const hash=String(tx?.hash||'').toLowerCase(); const chainId=tx?.chainId||''; const from=String(tx?.from||'').toLowerCase(); const to=String(tx?.to||'').toLowerCase();
        const key=`${chainId}:${hash||rid}:${from}:${to}`;
        if(!unique.has(key))unique.set(key,{rid,hash:tx?.hash||'',chainId,side:tx?.side||'',from,to});
      }
    }
    const rows=[]; let knownCount=0;
    for(const r of unique.values()){
      const fromLab=labels[r.from]||null,toLab=labels[r.to]||null;
      let cp='',lab=null,direction='';
      if(fromLab&&!toLab){cp=r.from;lab=fromLab;direction='交易所 → Relay';}
      else if(toLab&&!fromLab){cp=r.to;lab=toLab;direction='Relay → 交易所';}
      else if(fromLab&&toLab){cp=r.to;lab=toLab;direction='交易所間';}
      else if(r.from===wallet){cp=r.to;direction='Wallet → 對手';}
      else if(r.to===wallet){cp=r.from;direction='對手 → Wallet';}
      else { cp=r.side==='destination'?r.to:r.from; direction=r.side==='destination'?'Relay → 對手':'對手 → Relay'; }
      if(lab)knownCount++;
      rows.push({...r,cp,lab,direction});
    }
    if(!rows.length){box.innerHTML='<div style="padding:10px;color:#b45309;font-size:12px">Relay Request 有資料，但目前後端尚未解析出鏈上 TxHash / from / to。</div>';return{txCount:0,knownCount:0};}
    const html=rows.map(r=>{const url=chainExplorer(r.chainId,r.hash);const label=r.lab?`${r.lab.exchange||'未知'}${r.lab.region?' / '+r.lab.region:''}`:'待標記';return `<tr><td>${short(r.rid)}</td><td>${chainName(r.chainId)}</td><td>${r.side||'—'}</td><td>${url?`<a target="_blank" href="${url}">${short(r.hash)}</a>`:short(r.hash)}</td><td title="${r.from}">${short(r.from)}</td><td title="${r.to}">${short(r.to)}</td><td>${r.direction}</td><td title="${r.cp}">${short(r.cp)}</td><td style="font-weight:700;color:${r.lab?'#166534':'#b45309'}">${label}</td></tr>`;}).join('');
    box.innerHTML=`<div style="padding:9px 10px;font-weight:700">Relay 鏈上交易明細：${rows.length} 筆（同 Tx 已去重）｜已知交易所 ${knownCount} 筆</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#edf2f7"><th>Relay</th><th>Chain</th><th>Side</th><th>TxHash</th><th>From</th><th>To</th><th>資金方向</th><th>對手地址</th><th>交易所標籤</th></tr></thead><tbody>${html}</tbody></table>`;
    box.querySelectorAll('th,td').forEach(el=>{el.style.padding='7px 8px';el.style.borderBottom='1px solid #e5e7eb';el.style.whiteSpace='nowrap';el.style.textAlign='left';});
    return{txCount:rows.length,knownCount};
  }

  async function testWallet(wallet,testButton){
    const w=String(wallet||'').trim().toLowerCase();if(!validWallet(w))throw new Error('Wallet 格式不正確。');const p=document.getElementById('yeProgress');if(p)p.textContent=`正在透過 Vercel 查 Relay 並解析鏈上交易：${w}…`;if(testButton)testButton.disabled=true;
    try{const url=`/api/relay?wallet=${encodeURIComponent(w)}&limit=50&includeChildRequests=true&enrich=true&_=${Date.now()}`;const r=await fetch(url,{method:'GET',cache:'no-store'});const text=await r.text();let data;try{data=JSON.parse(text);}catch{throw new Error(`後端回傳非 JSON（HTTP ${r.status}）：${text.slice(0,300)}`);}if(!r.ok)throw new Error(`Vercel /api/relay HTTP ${r.status}: ${data.detail||data.error||text.slice(0,300)}`);
      const requests=requestArray(data),labels=labelsFromStorage(),records=[];let hits=0;for(const req of requests){const rid=req?.id||req?.requestId||req?.data?.id||'',time=req?.updatedAt||req?.createdAt||req?.data?.updatedAt||'',known=[...new Set(collectKnownAddresses(req,labels))].filter(a=>a!==w);if(known.length){for(const address of known){const lab=labels[address];records.push({relay:rid,exchange:{exchange:lab.exchange||'未知',region:lab.region||'',tags:lab.tags||'',address},direction:'Relay → 對手',amount:req?.amount||req?.data?.amount||'',time,updatedAt:time});hits++;}}else records.push({relay:rid,exchange:null,exchangeAddress:'',direction:'',amount:req?.amount||req?.data?.amount||'',time,updatedAt:time});}
      const detail=renderResolved(requests,labels,w);const cache=load();cache[w]={wallet:w,records,requests:requests.length,updatedAt:new Date().toISOString()};save(cache);window.__YUAN_CURRENT_ROWS__=[{'Proxy Wallet':w,'帳號名稱':w}];if(typeof window.__YUAN_EXCHANGE_RENDER__==='function')window.__YUAN_EXCHANGE_RENDER__();if(p)p.textContent=`完成：Relay ${requests.length} 筆 Request｜解析 ${detail.txCount} 筆去重鏈上交易｜交易所標籤 ${detail.knownCount} 筆｜Wallet ${w}`;return{requests:requests.length,hits,...detail};
    }catch(e){console.error('YUAN direct Relay test error',e);if(p)p.textContent=`測試失敗：${e?.message||e}`;alert(`測試失敗\n${e?.message||e}`);throw e;}finally{if(testButton)testButton.disabled=false;}}

  function install(){purgeFailed();const btn=document.getElementById('yeScan');if(!btn||btn.dataset.fixInstalled==='1')return false;btn.dataset.fixInstalled='1';ensureTxPanel();const original=btn.onclick;btn.onclick=async()=>{const removed=purgeFailed(),p=document.getElementById('yeProgress');if(removed&&p)p.textContent=`已解除 ${removed} 個失敗 Wallet，準備重新查詢…`;try{if(typeof original==='function')await original.call(btn);}catch(e){if(p)p.textContent=`查詢失敗：${e?.message||e}`;console.error('YUAN Relay scan error',e);}purgeFailed();if(typeof window.__YUAN_EXCHANGE_RENDER__==='function')window.__YUAN_EXCHANGE_RENDER__();};const wrap=btn.parentElement;if(wrap&&!document.getElementById('yeTestWallet')){const test=document.createElement('button');test.id='yeTestWallet';test.className='secondary';test.textContent='測試指定 Wallet';test.title=`直接經 Vercel /api/relay 測試 ${DEFAULT_WALLET}`;test.onclick=()=>testWallet(DEFAULT_WALLET,test).catch(()=>{});wrap.appendChild(test);}const originalShow=document.getElementById('yeShow')?.onclick;window.__YUAN_EXCHANGE_RENDER__=()=>{if(typeof originalShow==='function')originalShow.call(document.getElementById('yeShow'));};return true;}
  function boot(){if(!install())setTimeout(install,500);setTimeout(install,1500);}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();