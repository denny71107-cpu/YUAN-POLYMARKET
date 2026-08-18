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

  // The old engine calls Requests v2. Relay has deprecated v2, so transparently
  // route those calls to Requests v3 and authenticate with the user's local key.
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
      const wallet = old.searchParams.get('depositAddress') || old.searchParams.get('address') || '';
      const candidates = ['q', 'search'].map(param => {
        const u = new URL('https://api.relay.link/requests/v3');
        if (wallet) u.searchParams.set(param, wallet);
        u.searchParams.set('limit', old.searchParams.get('limit') || '20');
        return u.toString();
      });
      let last;
      for (const target of candidates) {
        try {
          const headers = new Headers(init.headers || {});
          headers.set('x-api-key', key.trim());
          headers.set('Accept', 'application/json');
          const r = await nativeFetch(target, {...init, headers, cache:'no-store'});
          if (r.ok) return r;
          const body = await r.text().catch(() => '');
          last = new Error(`Relay v3 HTTP ${r.status}: ${body.slice(0,240)}`);
          if (r.status === 401 || r.status === 403) break;
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
      test.title = '不要求該 Wallet 出現在目前成交表，直接測試 Relay';
      test.onclick = async () => {
        const wallet = prompt('輸入要測試的 Polymarket Wallet：', DEFAULT_WALLET);
        if (!wallet) return;
        const w = wallet.trim().toLowerCase();
        if (!validWallet(w)) return alert('Wallet 格式不正確。');
        if (!Array.isArray(window.__YUAN_CURRENT_ROWS__)) window.__YUAN_CURRENT_ROWS__ = [];
        if (!window.__YUAN_CURRENT_ROWS__.some(r => String(r['Proxy Wallet'] || '').toLowerCase() === w)) {
          window.__YUAN_CURRENT_ROWS__.push({'Proxy Wallet': w, '帳號名稱': w});
        }
        const cache = load();
        delete cache[w];
        save(cache);
        const p = document.getElementById('yeProgress');
        if (p) p.textContent = `準備測試 ${wallet}…`;
        btn.click();
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
