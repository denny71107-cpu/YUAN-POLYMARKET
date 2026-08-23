/* YUAN Relay Exchange Console Loader
 * 用法：Chrome DevTools → Sources → Snippets → New snippet → 貼上並儲存。
 * 之後每次打開網站，只要在 Console 執行這個 Snippet，就會載入交易所反查工具。
 * 資料快取／已調閱狀態仍保存在瀏覽器 localStorage / IndexedDB，不會因關閉瀏覽器消失。
 */
(()=>{
  'use strict';
  const SCRIPT='https://denny71107-cpu.github.io/YUAN-POLYMARKET/recipient-exchange-scan.js?v=console-1';
  const frame=document.querySelector('#app');
  const win=frame?.contentWindow||window;
  const doc=frame?.contentDocument||document;
  if(win.__YUAN_RELAY_EXCHANGE_CONSOLE_LOADED__){
    console.log('YUAN Relay 交易所反查程式已載入。');
    return;
  }
  win.__YUAN_RELAY_EXCHANGE_CONSOLE_LOADED__=true;
  const s=doc.createElement('script');
  s.src=SCRIPT;
  s.onload=()=>console.log('✅ YUAN Relay 交易所反查程式已載入；請使用頁面上的「追查新增雙向對手方」。');
  s.onerror=e=>console.error('❌ 載入交易所反查程式失敗',e);
  doc.body.appendChild(s);
})();
