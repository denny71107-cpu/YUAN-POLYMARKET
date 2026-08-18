export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = String(req.query?.wallet || '').trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100);
  const includeChildRequests = String(req.query?.includeChildRequests || 'true') !== 'false';

  const url = new URL('https://api.relay.link/requests/v2');
  url.searchParams.set('depositAddress', wallet);
  url.searchParams.set('sortBy', 'updatedAt');
  url.searchParams.set('sortDirection', 'desc');
  url.searchParams.set('limit', String(limit));
  if (includeChildRequests) url.searchParams.set('includeChildRequests', 'true');

  try {
    const headers = { Accept: 'application/json' };
    // If a Relay API key is configured later, use it server-side without exposing it to the browser.
    if (process.env.RELAY_API_KEY) headers['x-api-key'] = process.env.RELAY_API_KEY;

    const r = await fetch(url.toString(), {
      method: 'GET',
      headers,
      cache: 'no-store'
    });
    const text = await r.text();

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (!r.ok) {
      let detail = text;
      try { detail = JSON.stringify(JSON.parse(text)); } catch {}
      return res.status(r.status).send(JSON.stringify({
        error: `Relay HTTP ${r.status}`,
        detail: detail.slice(0, 1000)
      }));
    }

    return res.status(200).send(text || JSON.stringify({ requests: [] }));
  } catch (error) {
    return res.status(502).json({
      error: 'Relay upstream unavailable',
      detail: error?.message || String(error)
    });
  }
}
