(() => {
  'use strict';
  if (window.__YUAN_RELAY_PROXY__) return;

  const nativeFetch = window.fetch.bind(window);
  window.__YUAN_RELAY_PROXY__ = true;

  window.fetch = async (input, init = {}) => {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    if (!rawUrl || !rawUrl.includes('api.relay.link/requests/v2')) {
      return nativeFetch(input, init);
    }

    const source = new URL(rawUrl, window.location.href);
    const wallet = (source.searchParams.get('depositAddress') || '').trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
      throw new Error('Relay 查詢缺少有效 depositAddress');
    }

    const target = new URL('/api/relay', window.location.origin);
    target.searchParams.set('wallet', wallet);
    target.searchParams.set('limit', source.searchParams.get('limit') || '20');
    target.searchParams.set('includeChildRequests', source.searchParams.get('includeChildRequests') || 'true');

    return nativeFetch(target.toString(), {
      ...init,
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin'
    });
  };
})();
