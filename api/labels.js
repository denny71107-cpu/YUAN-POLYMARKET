const SEED = {
  '0x477b8d5ef7c2c42db84deb555419cd817c336b6f': { exchange:'MaiCoin', region:'台灣', tags:'MaiCoin. DepositAndWithdrawAndGasfee_2', source:'seed' },
  '0x7a83f06d30c8fc063dcb632b2540a9cc4835709a': { exchange:'BitoPro', region:'台灣', tags:'BitoPro. Withdraw_1', source:'seed' },
  '0xb1ecc5c8bbb3f977d2be80491373fbea9ad62d5b': { exchange:'BitoPro', region:'台灣', tags:'BitoPro. User', source:'seed' },
  '0x0853ea40b121f9135d7e0c07fae35d59aedb4d0b': { exchange:'Kraken', region:'海外', tags:'Kraken. DepositAndWithdraw_6', source:'seed' },
  '0xba2987a1a6b8662b8fa04c8512f7fbec346af336': { exchange:'OKX', region:'海外', tags:'OKX. Hot Wallet_189', source:'seed' },
  '0x343d752bb710c5575e417edb3f9fa06241a4749a': { exchange:'OKX', region:'海外', tags:'OKX. Hot Wallet_145', source:'seed' },
  '0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245': { exchange:'Binance', region:'海外', tags:'Binance. DepositAndWithdraw_3', source:'seed' },
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': { exchange:'Binance', region:'海外', tags:'Binance', source:'seed' },
  '0xee7ae85f2fe2239e27d9c1e23fffe168d63b4055': { exchange:'Binance', region:'海外', tags:'Binance. Hot Wallet_1', source:'seed' },
  '0xcb39c5b0db9c5b6bd1d9273dccc2f98f532a8bc6': { exchange:'Coinbase', region:'海外', tags:'Coinbase. DepositAndWithdraw_13', source:'seed' },
  '0x4d8336bda6c11bd2a805c291ec719baedd10acb9': { exchange:'Coinbase', region:'海外', tags:'Coinbase. Deposit_9', source:'seed' },
  '0x0d0707963952f2fba59dd06f2b425ace40b492fe': { exchange:'Gate', region:'海外', tags:'Gate.io. DepositAndWithdraw_1', source:'seed' },
  '0x51e3d44172868acc60d68ca99591ce4230bc75e0': { exchange:'MEXC', region:'海外', tags:'MEXC. DepositAndWithdraw_1', source:'seed' },
  '0xf89d7b9c864f589bbf53a82105107622b35eaa40': { exchange:'Bybit', region:'海外', tags:'Bybit. DepositAndWithdraw_1', source:'seed' }
};

const CHAIN_NAME = {
  1:'ethereum', 10:'optimism', 56:'bsc', 137:'polygon', 8453:'base', 42161:'arbitrum', 43114:'avalanche'
};

function normExchange(text='') {
  const s = String(text).toLowerCase();
  if (s.includes('maicoin') || s.includes('max exchange')) return 'MaiCoin';
  if (s.includes('bitopro')) return 'BitoPro';
  if (s.includes('binance')) return 'Binance';
  if (s.includes('coinbase')) return 'Coinbase';
  if (s.includes('okx')) return 'OKX';
  if (s.includes('bybit')) return 'Bybit';
  if (s.includes('kraken')) return 'Kraken';
  if (s.includes('gate.io') || /\bgate\b/.test(s)) return 'Gate';
  if (s.includes('mexc')) return 'MEXC';
  if (s.includes('kucoin')) return 'KuCoin';
  if (s.includes('bitget')) return 'Bitget';
  if (s.includes('crypto.com')) return 'Crypto.com';
  return '';
}

function regionFor(exchange) {
  return ['MaiCoin','BitoPro'].includes(exchange) ? '台灣' : (exchange ? '海外' : '');
}

async function walletLabels(address, chainId) {
  const key = process.env.WALLET_LABELS_API_KEY;
  if (!key) return null;
  const chain = CHAIN_NAME[Number(chainId)] || 'ethereum';
  const url = `https://api.walletlabels.xyz/api/${encodeURIComponent(chain)}/label/${encodeURIComponent(address)}?apikey=${encodeURIComponent(key)}&limit=20`;
  const r = await fetch(url, { headers:{'accept':'application/json'}, cache:'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  const rows = Array.isArray(j?.data) ? j.data : [];
  for (const x of rows) {
    const blob = [x.address_name,x.label_type,x.label_subtype,x.label].filter(Boolean).join(' | ');
    const ex = normExchange(blob);
    if (ex || String(x.label_type||'').toLowerCase()==='exchange') {
      return { exchange:ex || x.address_name || x.label || 'Exchange', region:regionFor(ex), tags:blob, source:'walletlabels' };
    }
  }
  return null;
}

async function etherscan(address, chainId) {
  const key = process.env.ETHERSCAN_API_KEY;
  if (!key) return null;
  const u = new URL('https://api.etherscan.io/v2/api');
  u.searchParams.set('chainid', String(chainId || 1));
  u.searchParams.set('module','nametag');
  u.searchParams.set('action','getaddresstag');
  u.searchParams.set('address',address);
  u.searchParams.set('apikey',key);
  const r = await fetch(u, { headers:{'accept':'application/json'}, cache:'no-store' });
  if (!r.ok) return null;
  const j = await r.json();
  const rows = Array.isArray(j?.result) ? j.result : [];
  for (const x of rows) {
    const blob = [x.nametag, ...(Array.isArray(x.labels)?x.labels:[]), x.shortdescription].filter(Boolean).join(' | ');
    const ex = normExchange(blob);
    if (ex || (Array.isArray(x.labels_slug) && x.labels_slug.includes('exchange'))) {
      return { exchange:ex || x.nametag || 'Exchange', region:regionFor(ex), tags:blob, source:'etherscan' };
    }
  }
  return null;
}

export default async function handler(req,res) {
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const address = String(req.query?.address || '').trim().toLowerCase();
  const chainId = Number(req.query?.chainId || 1);
  if (!/^0x[a-f0-9]{40}$/.test(address)) return res.status(400).json({error:'Invalid address'});

  res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
  if (SEED[address]) return res.status(200).json({found:true, label:{address,...SEED[address]}, providers:{walletlabels:Boolean(process.env.WALLET_LABELS_API_KEY), etherscan:Boolean(process.env.ETHERSCAN_API_KEY)}});

  try {
    let label = await walletLabels(address, chainId);
    if (!label) label = await etherscan(address, chainId);
    return res.status(200).json({found:Boolean(label), label:label?{address,...label}:null, providers:{walletlabels:Boolean(process.env.WALLET_LABELS_API_KEY), etherscan:Boolean(process.env.ETHERSCAN_API_KEY)}});
  } catch (e) {
    return res.status(200).json({found:false,label:null,error:e?.message||String(e),providers:{walletlabels:Boolean(process.env.WALLET_LABELS_API_KEY), etherscan:Boolean(process.env.ETHERSCAN_API_KEY)}});
  }
}
