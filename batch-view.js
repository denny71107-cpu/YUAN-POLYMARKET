(()=>{'use strict';
let lastSig='';
const lower=v=>String(v||'').trim().toLowerCase();
function wallets(){try{const rows=Array.isArray(window.__YUAN_CURRENT_ROWS__)?window.__YUAN_CURRENT_ROWS__:[];return [...new Set(rows.map(r=>lower(r['Proxy Wallet'])).filter(x=>/^0x[a-f0-9]{40}$/.test(x)))];}catch{return[]}}
function sig(){return wallets().sort().join('|')}
function apply(){const table=document.getElementById('yeTable');if(!table)return;const set=new Set(wallets());if(!set.size)return;[...table.querySelectorAll('tbody tr')].forEach(tr=>{const cells=tr.querySelectorAll('td');if(cells.length<2)return;const a=lower(cells[1].getAttribute('title')||cells[1].textContent);const match=[...set].some(w=>a.includes(w)||cells[1].innerHTML.toLowerCase().includes(w));tr.style.display=match?'':'none';});const p=document.getElementById('yeProgress');if(p&&!p.dataset.batchNote){p.dataset.batchNote='1';p.insertAdjacentHTML('afterend','<div id="yuanBatchNote" style="margin-top:6px;font-size:12px;color:#166534;font-weight:700">目前只顯示本次最新匯入／搜尋的 Wallet；舊批次仍保留在快取，不會混入本次畫面。</div>')}}
function watch(){const s=sig();if(s&&s!==lastSig){lastSig=s;setTimeout(apply,200)}apply();setTimeout(watch,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();