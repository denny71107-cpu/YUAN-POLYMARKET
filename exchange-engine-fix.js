(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_RELAY) || '{}'); } catch { return {}; } };
  const save = x => localStorage.setItem(LS_RELAY, JSON.stringify(x));
  const isErrorEntry = x => !!(x && x.error && (!Array.isArray(x.records) || x.records.length === 0));

  function purgeFailed() {
    const cache = load();
    const failed = Object.keys(cache).filter(k => isErrorEntry(cache[k]));
    if (failed.length) {
      for (const k of failed) delete cache[k];
      save(cache);
    }
    return failed.length;
  }

  function install() {
    const btn = document.getElementById('yeScan');
    if (!btn || btn.dataset.fixInstalled === '1') return false;
    btn.dataset.fixInstalled = '1';

    const original = btn.onclick;
    btn.onclick = async () => {
      const removed = purgeFailed();
      if (removed) {
        const p = document.getElementById('yeProgress');
        if (p) p.textContent = `已解除 ${removed} 個失敗 Wallet，準備重新查詢…`;
      }
      if (typeof original === 'function') await original.call(btn);
      // scan() may have recorded failures in the old engine. Remove those entries
      // so they remain retryable on the next run instead of being treated as done.
      purgeFailed();
      const p = document.getElementById('yeProgress');
      if (p && /完成：/.test(p.textContent || '')) p.textContent += '｜失敗 Wallet 已保留為待重試。';
      if (typeof window.__YUAN_EXCHANGE_RENDER__ === 'function') window.__YUAN_EXCHANGE_RENDER__();
    };

    // Add a targeted test button so a single Wallet can be retried without rescanning all data.
    const wrap = btn.parentElement;
    if (wrap && !document.getElementById('yeTestWallet')) {
      const test = document.createElement('button');
      test.id = 'yeTestWallet';
      test.className = 'secondary';
      test.textContent = '測試指定 Wallet';
      test.title = '先清除該 Wallet 的失敗快取，再執行增量反查';
      test.onclick = async () => {
        const wallet = prompt('輸入要測試的 Polymarket Wallet：', '0x67948bEb458a078bA926709e42FF4c8C269FEC48');
        if (!wallet) return;
        const w = wallet.trim().toLowerCase();
        if (!/^0x[a-f0-9]{40}$/.test(w)) return alert('Wallet 格式不正確。');
        const cache = load();
        delete cache[w];
        save(cache);
        const rows = Array.isArray(window.__YUAN_CURRENT_ROWS__) ? window.__YUAN_CURRENT_ROWS__ : [];
        const exists = rows.some(r => String(r['Proxy Wallet'] || '').toLowerCase() === w);
        if (!exists) {
          alert('這個 Wallet 不在目前載入的成交資料中，因此目前頁面無法觸發查詢。請先載入包含此 Wallet 的成交資料。');
          return;
        }
        const p = document.getElementById('yeProgress');
        if (p) p.textContent = `準備測試 ${wallet}…`;
        btn.click();
      };
      wrap.appendChild(test);
    }

    // Expose a safe renderer hook without touching the engine's private functions.
    const originalShow = document.getElementById('yeShow')?.onclick;
    window.__YUAN_EXCHANGE_RENDER__ = () => {
      if (typeof originalShow === 'function') originalShow.call(document.getElementById('yeShow'));
    };
    return true;
  }

  function boot() {
    purgeFailed();
    if (!install()) setTimeout(install, 500);
    setTimeout(install, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
