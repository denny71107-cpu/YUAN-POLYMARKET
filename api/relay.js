const RPC = {
  1: 'https://cloudflare-eth.com',
  10: 'https://mainnet.optimism.io',
  56: 'https://bsc-dataseed.binance.org',
  137: 'https://polygon-rpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  43114: 'https://api.avax.network/ext/bc/C/rpc'
};

async function getTx(chainId, hash) {
  const rpc = RPC[Number(chainId)];
  if (!rpc || !hash) return null;
  try {
    const r = await fetch(rpc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionByHash', params: [hash] }),
      cache: 'no-store'
    });
    if (!r.ok) return null;
    const j = await r.json();
    const tx = j?.result;
    if (!tx) return null;
    return {
      hash: tx.hash || hash,
      chainId: Number(chainId),
      from: tx.from || '',
      to: tx.to || '',
      value: tx.value || '',
      input: tx.input || ''
    };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = String(req.query?.wallet || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) return res.status(400).json({ error: 'Invalid wallet address' });

  const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 50);
  const includeChildRequests = String(req.query?.includeChildRequests || 'true') !== 'false';
  const enrich = String(req.query?.enrich || 'true') !== 'false';

  const base = new URLSearchParams({ sortBy: 'updatedAt', sortDirection: 'desc', limit: String(limit) });
  if (includeChildRequests) base.set('includeChildRequests', 'true');

  const endpoints = [
    `https://api.relay.link/requests/v2?${new URLSearchParams({ ...Object.fromEntries(base), user: wallet })}`,
    `https://api.relay.link/requests/v2?${new URLSearchParams({ ...Object.fromEntries(base), depositAddress: wallet })}`
  ];

  try {
    const headers = { Accept: 'application/json' };
    if (process.env.RELAY_API_KEY) headers['x-api-key'] = process.env.RELAY_API_KEY;

    const all = [];
    const seen = new Set();
    for (const url of endpoints) {
      const r = await fetch(url, { method: 'GET', headers, cache: 'no-store' });
      const text = await r.text();
      if (!r.ok) return res.status(r.status).json({ error: `Relay HTTP ${r.status}`, detail: text.slice(0, 1000) });
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { return res.status(502).json({ error: 'Relay returned non-JSON', detail: text.slice(0, 500) }); }

      let rows = [];
      if (Array.isArray(data)) rows = data;
      else if (Array.isArray(data.requests)) rows = data.requests;
      else if (data.requests && typeof data.requests === 'object') rows = [data.requests];
      else if (Array.isArray(data.data)) rows = data.data;
      else if (data.id || data.requestId) rows = [data];

      for (const row of rows) {
        const id = String(row?.id || row?.requestId || row?.data?.id || '');
        const key = id || JSON.stringify(row);
        if (!seen.has(key)) { seen.add(key); all.push(row); }
      }
    }

    all.sort((a, b) => String(b?.updatedAt || b?.createdAt || '').localeCompare(String(a?.updatedAt || a?.createdAt || '')));
    const selected = all.slice(0, limit);

    if (enrich && selected.length) {
      const enriched = await Promise.all(selected.map(async row => {
        const id = String(row?.id || row?.requestId || row?.data?.id || '');
        if (!id) return row;
        try {
          const sr = await fetch(`https://api.relay.link/intents/status/v3?requestId=${encodeURIComponent(id)}`, { method: 'GET', headers, cache: 'no-store' });
          if (!sr.ok) return row;
          const statusData = await sr.json();
          const resolvedTxs = [];
          for (const h of (statusData?.inTxHashes || []).slice(0, 4)) {
            const tx = await getTx(statusData?.originChainId, h);
            if (tx) resolvedTxs.push({ ...tx, side: 'origin' });
          }
          for (const h of (statusData?.txHashes || []).slice(0, 4)) {
            const tx = await getTx(statusData?.destinationChainId, h);
            if (tx) resolvedTxs.push({ ...tx, side: 'destination' });
          }
          return { ...row, executionStatus: statusData, resolvedTxs };
        } catch {
          return row;
        }
      }));
      selected.splice(0, selected.length, ...enriched);
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      requests: selected,
      count: selected.length,
      queried: { user: wallet, depositAddress: wallet },
      enriched: Boolean(enrich),
      rpcChains: Object.keys(RPC).map(Number)
    });
  } catch (error) {
    return res.status(502).json({ error: 'Relay upstream unavailable', detail: error?.message || String(error) });
  }
}
