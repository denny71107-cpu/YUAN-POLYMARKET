(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const LS_KEY = 'YUAN_RELAY_API_KEY_LOCAL';
  const DEFAULT_WALLET = '0x67948bEb458a078bA926709e42FF4c8C269FEC48';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_RELAY) || '{}'); } catch { return {}; } };
  const save = x => localStorage.setItem(LS_RELAY, JSON.stringify(x));
  const isErrorEntry = x => !!(x && x.error);
  const validWallet = w => /^0x[a-f0-9]{40}$/.test(String(w || '').trim().toLowerCase());

  function purgeFailed() {
    const cache = load();
    let n = 0;
    for (const k of Object.keys(cache)) {
      if (isErrorEntry(cache[k])) { delete cache[k]; n++; }
    }
    if (n) save(cache);
    return n;
  }

  function getKey() {
    let key = (localStorage.getItem(LS_KEY) || '').trim();
    if (!key) {
      key = (prompt('請貼上你的 Relay API Key（只保存在本機，不會寫入 GitHub）：') || '').trim();
      if (!key) throw new Error('缺少 Relay API Key');
      localStorage.setItem(LS_KEY, key);
    }
    return key;
  }

  function installV3Fetch() {
    if (window.__YUAN_RELAY_V3_FETCH__ === true) return;
    const nativeFetch = window.fetch.bind(window);
    window.__YUAN_RELAY_V3_FETCH__ = true;
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (!url || !url.includes('api.relay.link/requests/v2')) return nativeFetch(input, init);

      const old = new URL(url);
      const wallet = (old.searchParams.get('depositAddress') || '').trim();
      if (!validWallet(wallet)) throw new Error('Relay 查詢缺少有效 depositAddress');

      const target = new URL('https://api.relay.link/requests/v3');
      target.searchParams.set('depositAddress', wallet);
      target.searchParams.set('limit', old.searchParams.get('limit') || '20');
      target.searchParams.set('sortBy', old.searchParams.get('sortBy') || 'updatedAt');
      target.searchParams.set('sortDirection', old.searchParams.get('sortDirection') || 'desc');

      const headers = new Headers(init.headers || {});
      headers.set('x-api-key', getKey());
      headers.set('Accept', 'application/json');

      // Use Relay directly so the required x-api-key header reaches Relay.
      // Public CORS proxies cannot reliably forward this authentication header.
      const r = await nativeFetch(target.toString(), { ...init, headers, cache: 'no-store', credentials: 'omit' });
      const text = await r.text();
      if (!r.ok) {
        let detail = text;
        try { detail = JSON.stringify(JSON.parse(text)); } catch {}
        throw new Error(`Relay v3 HTTP ${r.status}${detail ? `：${detail.slice(0,180)}` : ''}`);
      }
      if (!text.trim()) throw new Error('Relay v3 回傳空白');
      return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  }

  function install() {
    installV3Fetch();
    const btn = document.getElementById('yeScan');
    if (!btn || btn.dataset.fixInstalled === '1') return false;
    btn.dataset.fixInstalled = '1';
    purgeFailed();

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
      test.title = '直接測試指定 Wallet 的 Relay v3 depositAddress 查詢';
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
        try { await btn.onclick(); }
        finally { window.__YUAN_CURRENT_ROWS__ = oldRows; }
      };
      wrap.appendChild(test);
    }

    const originalShow = document.getElementById('yeShow')?.onclick;
    window.__YUAN_EXCHANGE_RENDER__ = () => { if (typeof originalShow === 'function') originalShow.call(document.getElementById('yeShow')); };
    return true;
  }

  function boot() {
    installV3Fetch();
    purgeFailed();
    if (!install()) setTimeout(install, 500);
    setTimeout(install, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
