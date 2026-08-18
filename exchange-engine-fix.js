(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const DEFAULT_WALLET = '0x67948bEb458a078bA926709e42FF4c8C269FEC48';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_RELAY) || '{}'); } catch { return {}; } };
  const save = x => localStorage.setItem(LS_RELAY, JSON.stringify(x));
  const validWallet = w => /^0x[a-f0-9]{40}$/.test(String(w || '').trim().toLowerCase());

  function purgeFailed() {
    const cache = load();
    let n = 0;
    for (const k of Object.keys(cache)) {
      if (cache[k] && cache[k].error) { delete cache[k]; n++; }
    }
    if (n) save(cache);
    return n;
  }

  function install() {
    purgeFailed();
    const btn = document.getElementById('yeScan');
    if (!btn || btn.dataset.fixInstalled === '1') return false;
    btn.dataset.fixInstalled = '1';

    const original = btn.onclick;
    btn.onclick = async () => {
      const removed = purgeFailed();
      const p = document.getElementById('yeProgress');
      if (removed && p) p.textContent = `已解除 ${removed} 個失敗 Wallet，準備重新查詢…`;
      try {
        if (typeof original === 'function') await original.call(btn);
      } catch (e) {
        if (p) p.textContent = `查詢失敗：${e?.message || e}`;
        console.error('YUAN Relay scan error', e);
      }
      purgeFailed();
      if (typeof window.__YUAN_EXCHANGE_RENDER__ === 'function') window.__YUAN_EXCHANGE_RENDER__();
    };

    const wrap = btn.parentElement;
    if (wrap && !document.getElementById('yeTestWallet')) {
      const test = document.createElement('button');
      test.id = 'yeTestWallet';
      test.className = 'secondary';
      test.textContent = '測試指定 Wallet';
      test.title = '直接測試指定 Wallet，經 Vercel 後端查 Relay';
      test.onclick = async () => {
        const wallet = prompt('輸入要測試的 Polymarket Wallet：', DEFAULT_WALLET);
        if (!wallet) return;
        const w = wallet.trim().toLowerCase();
        if (!validWallet(w)) return alert('Wallet 格式不正確。');
        const p = document.getElementById('yeProgress');
        if (p) p.textContent = `準備測試 ${wallet}…`;
        const oldRows = window.__YUAN_CURRENT_ROWS__;
        window.__YUAN_CURRENT_ROWS__ = [{ 'Proxy Wallet': w, '帳號名稱': w }];
        const cache = load();
        delete cache[w];
        save(cache);
        try {
          await btn.onclick();
        } finally {
          window.__YUAN_CURRENT_ROWS__ = oldRows;
        }
      };
      wrap.appendChild(test);
    }

    const originalShow = document.getElementById('yeShow')?.onclick;
    window.__YUAN_EXCHANGE_RENDER__ = () => {
      if (typeof originalShow === 'function') originalShow.call(document.getElementById('yeShow'));
    };
    return true;
  }

  function boot() {
    if (!install()) setTimeout(install, 500);
    setTimeout(install, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
