(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const LS_KEY = 'YUAN_RELAY_API_KEY_LOCAL';
  const DEFAULT_WALLET = '0x67948bEb458a078bA926709e42FF4c8C269FEC48';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_RELAY) || '{}'); } catch { return {}; } };
  const save = x => localStorage.setItem(LS_RELAY, JSON.stringify(x));
  const isErrorEntry = x => !!(x && x.error && (!Array.isArray(x.records) || x.records.length === 0));
  const validWallet = w => /^0x[a-f0-9]{40}$/.test(String(w || '').trim().toLowerCase());

  function purgeFailed() {
    const cache = load();
    const failed = Object.keys(cache).filter(k => isErrorEntry(cache[k]));
    for (const k of failed) delete cache[k];
    if (failed.length) save(cache);
    return failed.length;
  }

  // Relay's current Get Requests API is v3. The wallet-specific filter is
  // depositAddress (not q/search). v3 requires x-api-key authentication.
  function installV3Fetch() {
    if (window.__YUAN_RELAY_V3_FETCH__ === true) return;
    const nativeFetch = window.fetch.bind(window);
    window.__YUAN_RELAY_V3_FETCH__ = true;
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input?.url;
      if (!url || !url.includes('api.relay.link/requests/v2')) return nativeFetch(input, init);

      let key = localStorage.getItem(LS_KEY) || '';
      if (!key) {
        key = prompt('請貼上你的 Relay API Key（只保存在本機，不會寫入 GitHub）：');
        if (!key) throw new Error('缺少 Relay API Key');
        localStorage.setItem(LS_KEY, key.trim());
      }

      const old = new URL(url);
      const wallet = old.searchParams.get('depositAddress') || '';
      if (!wallet) throw new Error('Relay 查詢缺少 depositAddress');

      const target = new URL('https://api.relay.link/requests/v3');
      target.searchParams.set('depositAddress', wallet);
      target.searchParams.set('limit', old.searchParams.get('limit') || '20');
      target.searchParams.set('sortBy', old.searchParams.get('sortBy') || 'updatedAt');
      target.searchParams.set('sortDirection', old.searchParams.get('sortDirection') || 'desc');

      const headers = new Headers(init.headers || {});
      headers.set('x-api-key', key.trim());
      headers.set('Accept', 'application/json');

      // GitHub Pages CSP blocks direct api.relay.link requests in this app,
      // so use the same public CORS proxy fallback already used by the engine.
      const urls = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(target.toString())}`,
        `https://corsproxy.io/?url=${encodeURIComponent(target.toString())}`
      ];
      let last;
      for (const u of urls) {
        try {
          const r = await nativeFetch(u, { ...init, headers, cache: 'no-store' });
          if (!r.ok) throw new Error(`Relay v3 HTTP ${r.status}`);
          const text = (await r.text()).trim();
          if (!text || text.startsWith('<')) throw new Error('Relay API returned HTML');
          JSON.parse(text);
          return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e) { last = e; }
      }
      throw last || new Error('Relay Requests v3 查詢失敗');
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
      try { if (typeof original === 'function') await original.call(btn); }
      catch (e) { if (p) p.textContent = `查詢失敗：${e?.message || e}`; console.error('YUAN Relay scan error', e); }
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
        // Limit the current scan context to the requested wallet for this test.
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
    installV3Fetch(); purgeFailed();
    if (!install()) setTimeout(install, 500);
    setTimeout(install, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
