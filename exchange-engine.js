(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const LS_LABELS = 'YUAN_POLY_EXCHANGE_LABELS_V2';
  const RELAY_LIMIT = 20;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const lower = v => String(v || '').toLowerCase();
  const short = v => !v ? '—' : (v.length > 18 ? v.slice(0,8) + '…' + v.slice(-6) : v);
  const profile = w => `https://polymarket.com/zh-hant/profile/${encodeURIComponent(w)}`;
  const okAddr = a => `https://www.oklink.com/polygon/address/${encodeURIComponent(a)}`;
  const polyAddr = a => `https://polygonscan.com/address/${encodeURIComponent(a)}`;

  const SEED = {
    '0x477b8d5ef7c2c42db84deb555419cd817c336b6f': ['MaiCoin','台灣','MaiCoin. DepositAndWithdrawAndGasfee_2'],
    '0x7a83f06d30c8fc063dcb632b2540a9cc4835709a': ['BitoPro','台灣','BitoPro. Withdraw_1'],
    '0xb1ecc5c8bbb3f977d2be80491373fbea9ad62d5b': ['BitoPro','台灣','BitoPro. User'],
    '0x0853ea40b121f9135d7e0c07fae35d59aedb4d0b': ['Kraken','海外','Kraken. DepositAndWithdraw_6'],
    '0xba2987a1a6b8662b8fa04c8512f7fbec346af336': ['OKX','海外','OKX. Hot Wallet_189'],
    '0x343d752bb710c5575e417edb3f9fa06241a4749a': ['OKX','海外','OKX. Hot Wallet_145'],
    '0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245': ['Binance','海外','Binance. DepositAndWithdraw_3'],
    '0x8decf963ccb75b42b06f2b3b36bbdbe517a900a6': ['OKX','海外','OKX. User'],
    '0x290275e3db66394c52272398959845170e4dcb88': ['Binance','海外','Binance. Withdraw_2'],
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': ['Binance','海外','Binance'],
    '0xee7ae85f2fe2239e27d9c1e23fffe168d63b4055': ['Binance','海外','Binance. Hot Wallet_1'],
    '0xcb39c5b0db9c5b6bd1d9273dccc2f98f532a8bc6': ['Coinbase','海外','Coinbase. DepositAndWithdraw_13'],
    '0x4d8336bda6c11bd2a805c291ec719baedd10acb9': ['Coinbase','海外','Coinbase. Deposit_9'],
    '0x0d0707963952f2fba59dd06f2b425ace40b492fe': ['Gate','海外','Gate.io. DepositAndWithdraw_1'],
    '0x505e71695e9bc45943c58adec1650577bca68fd9': ['Binance','海外','Binance. Withdraw_3'],
    '0x51e3d44172868acc60d68ca99591ce4230bc75e0': ['MEXC','海外','MEXC. DepositAndWithdraw_1'],
    '0xf89d7b9c864f589bbf53a82105107622b35eaa40': ['Bybit','海外','Bybit. DepositAndWithdraw_1'],
    '0x1347378b1d0eb69d3462e09b3dfa2fe28ebe74ec': ['Bybit','海外','Bybit. Deposit_2'],
    '0xa85c29b94f8a22a7268facee89ef4eca051be2ce': ['Bybit','海外','Bybit. Deposit_3'],
    '0xf977814e90da44bfa03b6295a0616a897441acec': ['Binance','海外','Binance. Cold Wallet_7'],
    '0x6044157e34cd9fdc452b73b54c90a1c68514b6f6': ['OKX','海外','OKX. User'],
    '0xe86f3aaa57f63b2afeca68178182a91bc3909962': ['Coinbase','海外','Coinbase. DepositAndWithdraw_2'],
    '0x760dce7ea6e8ba224bffbeb8a7ff4dd1ef122bff': ['Coinbase','海外','Coinbase. DepositAndWithdraw_1'],
    '0x14af92363379f3548958f9de1fb2e6e5df74476e': ['Coinbase','海外','Coinbase. Withdraw_2'],
    '0x06959153b974d0d5fdfd87d561db6d8d4fa0bb0b': ['OKX','海外','OKX. DepositAndWithdraw_3'],
    '0x6449590a40e83b8056221d2e1bf7e2027570b468': ['Binance','海外','Binance. User'],
    '0x3eb9845b9c8f835ad130456f8dab6aef79af5272': ['Coinbase','海外','Coinbase. Deposit_6'],
    '0xc9aaa6ca0e05b87d53a3e51edbc44b406eeaf299': ['Coinbase','海外','Coinbase. DepositAndWithdraw_12'],
    '0x0a3b8600ce5b67f887f45f9a4a8d014ae00166d6': ['Binance','海外','Binance. User'],
    '0xb300000b72deaeb607a12d5f54773d1c19c7028d': ['Binance','海外','Binance Wallet'],
    '0x3a64da9ecf32d2bc178043f230b0f7080015864b': ['OKX','海外','OKX. User'],
    '0xfd915e2085b4d77b5dfccd941c73d72ed7c958bc': ['OKX','海外','OKX. User'],
    '0x2a410f11a6f520398447bf423dcedd25dfd3a568': ['Coinbase','海外','Coinbase. Deposit_2'],
    '0x90af60205d5c36e5745442f6ef0ffeda754f77bc': ['OKX','海外','OKX. User'],
    '0x916a9581f34f42c0062ab7a9b11aa9f2d2da7e09': ['Binance','海外','Binance. User']
  };

  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } }
  let labels = load(LS_LABELS, {});
  for (const [a,v] of Object.entries(SEED)) if (!labels[a]) labels[a] = {exchange:v[0], region:v[1], tags:v[2], source:'verified label seed'};
  localStorage.setItem(LS_LABELS, JSON.stringify(labels));
  let cache = load(LS_RELAY, {});

  function relayEndpoint(wallet) { return `https://api.relay.link/requests/v2?depositAddress=${encodeURIComponent(wallet)}&sortBy=updatedAt&sortDirection=desc&limit=${RELAY_LIMIT}`; }
  async function getJson(url) {
    const direct = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
    const routes = [direct, `https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`, `https://corsproxy.io/?url=${encodeURIComponent(direct)}`];
    let last;
    for (const u of routes) {
      try { const r = await fetch(u, {cache:'no-store'}); if (!r.ok) throw Error('HTTP ' + r.status); const t=(await r.text()).trim(); if (!t || t.startsWith('<')) throw Error('API returned HTML'); return JSON.parse(t); } catch(e) { last=e; }
    }
    throw last || Error('API unavailable');
  }
  function addresses(value, out=new Set(), depth=0) {
    if (depth>8 || value==null) return out;
    if (typeof value === 'string') { (value.match(/0x[a-fA-F0-9]{40}/g)||[]).forEach(a=>out.add(a.toLowerCase())); return out; }
    if (Array.isArray(value)) { value.slice(0,500).forEach(x=>addresses(x,out,depth+1)); return out; }
    if (typeof value === 'object') for (const [k,v] of Object.entries(value).slice(0,500)) {
      if (/address|wallet|from|to|deposit|recipient|sender|receiver|source|destination/i.test(k)) addresses(v,out,depth+1);
      else if (depth<4 && typeof v==='object') addresses(v,out,depth+1);
    }
    return out;
  }
  function requestArray(data) { if (Array.isArray(data?.requests)) return data.requests; if (Array.isArray(data?.data)) return data.data; if (Array.isArray(data)) return data; return []; }
  function labelFor(a) { return labels[lower(a)] || null; }
  function currentWallets() { if (!Array.isArray(window.__YUAN_CURRENT_ROWS__)) return []; return [...new Set(window.__YUAN_CURRENT_ROWS__.map(r=>lower(r['Proxy Wallet'])).filter(a=>/^0x[a-f0-9]{40}$/.test(a)))]; }
  function accountFor(w) { const r=(window.__YUAN_CURRENT_ROWS__||[]).find(x=>lower(x['Proxy Wallet'])===lower(w)); return r?.['帳號名稱'] || r?.['暱稱'] || short(w); }
  function syncRows() { window.__YUAN_CURRENT_ROWS__ = typeof currentRows !== 'undefined' ? currentRows : []; }

  function injectUI() {
    if (document.getElementById('yuanExchangeEngine')) return;
    const card=document.createElement('div'); card.className='card'; card.id='yuanExchangeEngine';
    card.innerHTML=`<h2>🧭 金流／交易所增量反查</h2><p class="sub">固定流程：Polymarket Proxy Wallet → Relay → 對手地址 → 已知交易所標籤。每個 Wallet 只查一次並保存在本機；新資料只掃新增 Wallet。</p><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:10px 0"><div class="stat"><span>已抓取 Wallet</span><b id="yeWallet">0</b></div><div class="stat"><span>已查 Relay</span><b id="yeRelay">0</b></div><div class="stat"><span>交易所命中</span><b id="yeHit">0</b></div><div class="stat"><span>待標記</span><b id="yeUnknown">0</b></div><div class="stat"><span>新增待查</span><b id="yeNew">0</b></div></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><button id="yeScan">只查新的 Wallet</button><button id="yeShow" class="secondary">顯示結果</button><button id="yeClear" class="danger">清除 Relay 快取</button></div><div id="yeProgress" class="progress">尚未執行。</div><div style="margin-top:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px;font-size:12px;color:#92400e">未知地址不猜交易所。可點 OKLink／PolygonScan 查證；若取得新的標籤，可在下方匯入，網站會永久記住。</div><div style="overflow:auto;max-height:520px;border:1px solid #d8e0e8;border-radius:9px;margin-top:12px"><table class="mini" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th>Polymarket 帳號</th><th>Wallet</th><th>Relay</th><th>交易所</th><th>交易所地址</th><th>方向</th><th>金額</th><th>時間</th><th>狀態</th><th>連結</th></tr></thead><tbody id="yeTable"><tr><td colspan="10">尚未反查</td></tr></tbody></table></div><details style="margin-top:12px"><summary>匯入新的交易所標籤</summary><p style="font-size:12px;color:#657287">JSON：[{"address":"0x...","exchange":"BitoPro","region":"台灣","tags":"BitoPro. User"}]；或 CSV：address,exchange,region,tags</p><textarea id="yeImport" rows="5" style="width:100%;margin-top:8px" placeholder='[{"address":"0x...","exchange":"BitoPro","region":"台灣","tags":"BitoPro. User"}]'></textarea><button id="yeImportBtn" style="margin-top:8px">匯入／更新標籤</button></details>`;
    const cards=[...document.querySelectorAll('.card')]; const trade=cards.find(c=>c.querySelector('#tradeTable')); (trade?.parentNode||document.querySelector('.wrap')).insertBefore(card,trade||null);
    document.getElementById('yeScan').onclick=scan;
    document.getElementById('yeShow').onclick=render;
    document.getElementById('yeClear').onclick=()=>{if(confirm('清除所有 Relay 快取？下次會重新查詢已查過的 Wallet。')){localStorage.removeItem(LS_RELAY);cache={};render();}};
    document.getElementById('yeImportBtn').onclick=importLabels;
    addStyle(); render();
  }
  function addStyle(){if(document.getElementById('yeStyle'))return;const s=document.createElement('style');s.id='yeStyle';s.textContent='.stat{background:#f8fafc;border:1px solid #d8e0e8;border-radius:12px;padding:12px}.stat b{display:block;font-size:21px;margin-top:4px}.mini th,.mini td{padding:8px 9px;border-bottom:1px solid #d8e0e8;text-align:left;white-space:nowrap}.mini th{background:#edf2f7;position:sticky;top:0}.wallet{font-family:Consolas,monospace;color:#075eaa;text-decoration:none}.ok{color:#166534;font-weight:700}.wait{color:#b45309;font-weight:700}.small{font-size:12px;color:#657287}';document.head.appendChild(s);}
  function rows(){const out=[];for(const c of Object.values(cache)) for(const r of (c.records||[])) {const ex=r.exchange;out.push({wallet:c.wallet,account:accountFor(c.wallet),relay:r.relay||r.request?.id||'',exchange:ex?.exchange||'待標記',exchangeAddress:ex?.address||'',direction:r.direction||'',amount:r.amount||'',time:r.time||r.updatedAt||'',status:ex?'命中':'待標記'});}return out;}
  function render(){syncRows();const ws=Object.keys(cache),rs=ws.reduce((n,w)=>n+(cache[w].records||[]).length,0),rr=rows(),hits=rr.filter(r=>r.exchange!=='待標記').length,unknown=rr.length-hits,neww=currentWallets().filter(w=>!cache[w]).length;document.getElementById('yeWallet').textContent=ws.length;document.getElementById('yeRelay').textContent=rs;document.getElementById('yeHit').textContent=hits;document.getElementById('yeUnknown').textContent=unknown;document.getElementById('yeNew').textContent=neww;const tb=document.getElementById('yeTable');tb.innerHTML='';rr.slice(0,1000).forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td><a class="linkish" target="_blank" href="${profile(r.wallet)}">${escapeHtml(r.account)}</a></td><td><a class="wallet" target="_blank" href="${profile(r.wallet)}">${escapeHtml(short(r.wallet))}</a></td><td class="wallet">${escapeHtml(short(r.relay))}</td><td class="${r.exchange==='待標記'?'wait':'ok'}">${escapeHtml(r.exchange)}</td><td class="wallet">${escapeHtml(short(r.exchangeAddress))}</td><td>${escapeHtml(r.direction)}</td><td>${escapeHtml(r.amount)}</td><td>${escapeHtml(r.time)}</td><td>${escapeHtml(r.status)}</td><td>${r.exchangeAddress?`<a class="linkish" target="_blank" href="${okAddr(r.exchangeAddress)}">OKLink</a> <a class="linkish" target="_blank" href="${polyAddr(r.exchangeAddress)}">PolygonScan</a>`:'待標記'}</td>`;tb.appendChild(tr)});if(!rr.length)tb.innerHTML='<tr><td colspan="10">目前沒有反查結果</td></tr>';}
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function extract(wallet,data){return requestArray(data).map(req=>{const ads=[...addresses(req)].filter(a=>a!==lower(wallet));let ex=null;for(const a of ads){const l=labelFor(a);if(l){ex={address:a,...l};break;}}return{request:req,addresses:ads,exchange:ex,relay:req.id||req.requestId||req.relayRequestId||'',direction:req.direction||req.route?.direction||'',amount:req.amount||req.originAmount||req.destinationAmount||'',time:req.updatedAt||req.createdAt||req.updated_at||req.created_at||''};});}
  async function scan(){syncRows();const wallets=currentWallets(),todo=wallets.filter(w=>!cache[w]),p=document.getElementById('yeProgress');document.getElementById('yeNew').textContent=todo.length;if(!todo.length){p.textContent='沒有新的 Wallet；相同 Wallet 不會重查。';render();return;}let ok=0,err=0;for(let i=0;i<todo.length;i++){const w=todo[i];p.textContent=`增量反查 ${i+1}/${todo.length}｜${w}`;try{const data=await getJson(relayEndpoint(w));const rec=extract(w,data);rec.forEach(r=>{if(r.exchange)ok++;});cache[w]={wallet:w,checkedAt:new Date().toISOString(),records:rec};localStorage.setItem(LS_RELAY,JSON.stringify(cache));}catch(e){err++;cache[w]={wallet:w,checkedAt:new Date().toISOString(),records:[],error:e.message};localStorage.setItem(LS_RELAY,JSON.stringify(cache));}await sleep(350);}p.textContent=`完成：新增 ${todo.length} Wallet｜交易所命中 ${ok}｜錯誤 ${err}。下次不重查相同 Wallet。`;render();}
  function importLabels(){const raw=document.getElementById('yeImport').value.trim();if(!raw)return alert('請貼上 JSON 或 CSV');try{let arr;if(raw.startsWith('['))arr=JSON.parse(raw);else{const lines=raw.split(/\r?\n/).filter(Boolean),h=lines.shift().split(',').map(x=>x.trim());arr=lines.map(line=>{const p=line.split(',');const o={};h.forEach((k,i)=>o[k]=p[i]||'');return o;});}for(const x of arr){const a=lower(x.address||x.Address||x['交易所地址']);if(/^0x[a-f0-9]{40}$/.test(a))labels[a]={exchange:x.exchange||x.Exchange||x['交易所']||'未知',region:x.region||x.Region||x['地區']||'',tags:x.tags||x.Tags||x['Tags']||'',source:'user import'};}localStorage.setItem(LS_LABELS,JSON.stringify(labels));render();alert(`已匯入 ${arr.length} 筆標籤`);}catch(e){alert('格式錯誤：'+e.message);}}

  function hook(){syncRows();const originalFetch=window.fetchTrades;if(typeof originalFetch==='function'&&!originalFetch.__yuanWrapped){const wrapped=async function(...args){const r=await originalFetch.apply(this,args);syncRows();const auto=document.getElementById('autoExchange');if(!auto||auto.checked)await scan();return r;};wrapped.__yuanWrapped=true;window.fetchTrades=wrapped;}const originalGlobal=window.globalSearch;if(typeof originalGlobal==='function'&&!originalGlobal.__yuanWrapped){const wrapped=async function(...args){const r=await originalGlobal.apply(this,args);syncRows();const auto=document.getElementById('autoExchange');if(!auto||auto.checked)await scan();return r;};wrapped.__yuanWrapped=true;window.globalSearch=wrapped;}render();}
  function boot(){injectUI();hook();setTimeout(hook,1000);setTimeout(hook,3000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
