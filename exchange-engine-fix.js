(() => {
  'use strict';
  const LS_RELAY = 'YUAN_POLY_RELAY_CACHE_V2';
  const DEFAULT_WALLET = '0xf83ec0e37ac9eece71c064507270e9001a734663';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS_RELAY) || '{}'); } catch { return {}; } };
  const save = x => localStorage.setItem(LS_RELAY, JSON.stringify(x));
  const validWallet = w => /^0x[a-f0-9]{40}$/.test(String(w || '').trim().toLowerCase());
  const lower = v => String(v || '').toLowerCase();

  function purgeFailed() {
    const cache = load();
    let n = 0;
    for (const k of Object.keys(cache)) {
      if (cache[k] && cache[k].error) { delete cache[k]; n++; }
    }
    if (n) save(cache);
    return n;
  }

  function collectKnownAddresses(value, labels, out = [], depth = 0) {
    if (depth > 8 || value == null) return out;
    if (typeof value === 'string') {
      for (const a of (value.match(/0x[a-fA-F0-9]{40}/g) || [])) {
        const al = a.toLowerCase();
        if (labels[al]) out.push(al);
      }
      return out;
    }
    if (Array.isArray(value)) {
      value.slice(0, 500).forEach(x => collectKnownAddresses(x, labels, out, depth + 1));
      return out;
    }
    if (typeof value === 'object') {
      for (const v of Object.values(value).slice(0, 500)) collectKnownAddresses(v, labels, out, depth + 1);
    }
    return out;
  }

  function requestArray(data) {
    if (Array.isArray(data?.requests)) return data.requests;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }

  function labelsFromStorage() {
    try { return JSON.parse(localStorage.getItem('YUAN_POLY_EXCHANGE_LABELS_V2') || '{}'); }
    catch { return {}; }
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
      test.title = '直接經 Vercel /api/relay 測試指定 Wallet';
      test.onclick = async () => {
        const wallet = prompt('輸入要測試的 Polymarket Wallet：', DEFAULT_WALLET);
        if (!wallet) return;
        const w = wallet.trim().toLowerCase();
        if (!validWallet(w)) return alert('Wallet 格式不正確。');

        const p = document.getElementById('yeProgress');
        if (p) p.textContent = `正在透過 Vercel 查 Relay：${w}…`;
        test.disabled = true;

        try {
          const url = `/api/relay?wallet=${encodeURIComponent(w)}&limit=50&includeChildRequests=true&_=${Date.now()}`;
          const r = await fetch(url, { method: 'GET', cache: 'no-store' });
          const text = await r.text();
          let data;
          try { data = JSON.parse(text); } catch { throw new Error(`後端回傳非 JSON（HTTP ${r.status}）：${text.slice(0, 300)}`); }
          if (!r.ok) throw new Error(`Vercel /api/relay HTTP ${r.status}: ${data.detail || data.error || text.slice(0, 300)}`);

          const requests = requestArray(data);
          const labels = labelsFromStorage();
          const records = [];
          let hits = 0;

          for (const req of requests) {
            const rid = req?.id || req?.requestId || req?.data?.id || '';
            const time = req?.updatedAt || req?.createdAt || req?.data?.updatedAt || '';
            const known = [...new Set(collectKnownAddresses(req, labels))].filter(a => a !== w);
            if (known.length) {
              for (const address of known) {
                const lab = labels[address];
                records.push({
                  relay: rid,
                  exchange: { exchange: lab.exchange || '未知', region: lab.region || '', tags: lab.tags || '', address },
                  direction: 'Relay → 對手',
                  amount: req?.amount || req?.data?.amount || '',
                  time,
                  updatedAt: time
                });
                hits++;
              }
            } else {
              records.push({ relay: rid, exchange: null, exchangeAddress: '', direction: '', amount: req?.amount || req?.data?.amount || '', time, updatedAt: time });
            }
          }

          const cache = load();
          cache[w] = { wallet: w, records, requests: requests.length, updatedAt: new Date().toISOString() };
          save(cache);
          window.__YUAN_CURRENT_ROWS__ = [{ 'Proxy Wallet': w, '帳號名稱': w }];
          if (typeof window.__YUAN_EXCHANGE_RENDER__ === 'function') window.__YUAN_EXCHANGE_RENDER__();
          if (p) p.textContent = `完成：Relay 回傳 ${requests.length} 筆 Request｜命中 ${hits} 筆已知交易所｜Wallet ${w}`;
        } catch (e) {
          console.error('YUAN direct Relay test error', e);
          if (p) p.textContent = `測試失敗：${e?.message || e}`;
          alert(`測試失敗\n${e?.message || e}`);
        } finally {
          test.disabled = false;
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
