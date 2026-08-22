(()=>{'use strict';
const unwanted=[
'22 縣市 + 全國政黨市場｜單一市場成交與帳號／錢包追查。',
'完整備份會包含目前所有 YUAN IndexedDB 資料庫與 YUAN 本機儲存資料，包括 Relay Recipient、交易所反查快取及已調閱紀錄。',
'同時保留入金與出金：IN 追資金來源，OUT 追資金去向；不再因 Recipient 是 Polymarket Wallet 而刪除入金。',
'只追第一層。每個地址的交易所歷史會保存在本機；之後不同縣市、Wallet 或 IN/OUT 再遇到同一地址，直接沿用快取，不重打 API。待調閱與已調閱狀態互相獨立。'
];
function clean(){
  for(const id of ['yreTargetDiag','yflTargetDiag'])document.getElementById(id)?.remove();
  for(const el of document.querySelectorAll('p,.sub,.progress')){
    const t=(el.textContent||'').trim();
    if(unwanted.some(x=>t.includes(x))||t.includes('0x36339')||t.includes('第一層 DB 診斷'))el.remove();
  }
  for(const d of document.querySelectorAll('details')){
    const s=(d.querySelector('summary')?.textContent||'').trim();
    if(s.includes('進階／除錯工具')||s.includes('進階/除錯工具'))d.remove();
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});
})();