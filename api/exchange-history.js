const KNOWN={
'0x477b8d5ef7c2c42db84deb555419cd817c336b6f':{exchange:'MaiCoin',region:'台灣'},
'0x7a83f06d30c8fc063dcb632b2540a9cc4835709a':{exchange:'BitoPro',region:'台灣'},
'0xb1ecc5c8bbb3f977d2be80491373fbea9ad62d5b':{exchange:'BitoPro',region:'台灣'},
'0x0853ea40b121f9135d7e0c07fae35d59aedb4d0b':{exchange:'Kraken',region:'海外'},
'0xba2987a1a6b8662b8fa04c8512f7fbec346af336':{exchange:'OKX',region:'海外'},
'0x343d752bb710c5575e417edb3f9fa06241a4749a':{exchange:'OKX',region:'海外'},
'0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245':{exchange:'Binance',region:'海外'},
'0xdfd5293d8e347dfe59e90efd55b2956a1343963d':{exchange:'Binance',region:'海外'},
'0xee7ae85f2fe2239e27d9c1e23fffe168d63b4055':{exchange:'Binance',region:'海外'},
'0xcb39c5b0db9c5b6bd1d9273dccc2f98f532a8bc6':{exchange:'Coinbase',region:'海外'},
'0x4d8336bda6c11bd2a805c291ec719baedd10acb9':{exchange:'Coinbase',region:'海外'},
'0x0d0707963952f2fba59dd06f2b425ace40b492fe':{exchange:'Gate',region:'海外'},
'0x51e3d44172868acc60d68ca99591ce4230bc75e0':{exchange:'MEXC',region:'海外'},
'0xf89d7b9c864f589bbf53a82105107622b35eaa40':{exchange:'Bybit',region:'海外'}
};
const CHAINS=[1,10,56,137,8453,42161,43114];
function normName(s=''){s=String(s).toLowerCase();if(s.includes('maicoin')||s.includes('max exchange'))return['MaiCoin','台灣'];if(s.includes('bitopro'))return['BitoPro','台灣'];for(const [needle,name] of [['binance','Binance'],['okx','OKX'],['coinbase','Coinbase'],['bybit','Bybit'],['kraken','Kraken'],['gate.io','Gate'],['mexc','MEXC'],['kucoin','KuCoin'],['bitget','Bitget'],['crypto.com','Crypto.com'],['huobi','HTX'],['htx','HTX'],['bitfinex','Bitfinex'],['upbit','Upbit']])if(s.includes(needle))return[name,'海外'];return null;}
async function tokenTx(address,chainId){const u=new URL(`https://api.routescan.io/v2/network/mainnet/evm/${chainId}/etherscan/api`);for(const [k,v] of Object.entries({module:'account',action:'tokentx',address,page:'1',offset:'100',sort:'desc'}))u.searchParams.set(k,v);const h={accept:'application/json'};if(process.env.ROUTESCAN_API_KEY)h.apikey=process.env.ROUTESCAN_API_KEY;const r=await fetch(u,{headers:h,cache:'no-store'});if(!r.ok)return[];const j=await r.json();return Array.isArray(j?.result)?j.result:[];}
async function routeNames(addresses){const out={};for(let i=0;i<addresses.length;i+=20){const batch=addresses.slice(i,i+20),u=new URL('https://api.routescan.io/v2/network/mainnet/evm/all/addresses');batch.forEach(a=>u.searchParams.append('ids',a));u.searchParams.set('limit','100');const h={accept:'application/json'};if(process.env.ROUTESCAN_API_KEY)h.apikey=process.env.ROUTESCAN_API_KEY;try{const r=await fetch(u,{headers:h,cache:'no-store'});if(!r.ok)continue;const j=await r.json();for(const x of(j?.items||[])){const a=String(x.address||'').toLowerCase(),n=normName(x.name||'');if(a&&n)out[a]={exchange:n[0],region:n[1],source:'routescan-name'};}}catch{}}
return out;}
export default async function handler(req,res){if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const address=String(req.query?.address||'').toLowerCase();if(!/^0x[a-f0-9]{40}$/.test(address))return res.status(400).json({error:'Invalid address'});try{const pages=await Promise.all(CHAINS.map(async chainId=>({chainId,rows:await tokenTx(address,chainId)}))),all=[];for(const p of pages)for(const x of p.rows){const from=String(x.from||'').toLowerCase(),to=String(x.to||'').toLowerCase(),cp=from===address?to:from;if(!/^0x[a-f0-9]{40}$/.test(cp)||cp===address)continue;all.push({chainId:p.chainId,from,to,counterparty:cp,txHash:x.hash||'',timestamp:x.timeStamp?new Date(Number(x.timeStamp)*1000).toISOString():'',tokenSymbol:x.tokenSymbol||'',tokenName:x.tokenName||'',tokenDecimals:Number(x.tokenDecimal||0),value:String(x.value||'0')});}
const cps=[...new Set(all.map(x=>x.counterparty))].slice(0,100),names=await routeNames(cps),hits=[];for(const x of all){const lab=KNOWN[x.counterparty]||names[x.counterparty];if(!lab)continue;let amount=x.value;if(/^\d+$/.test(amount)&&x.tokenDecimals>=0){try{const d=BigInt(10)**BigInt(x.tokenDecimals),v=BigInt(amount);amount=`${v/d}${x.tokenDecimals?'.'+String(v%d).padStart(x.tokenDecimals,'0').replace(/0+$/,''):''}`.replace(/\.$/,'');}catch{}}hits.push({...x,direction:x.from===address?'實際帳戶 → 交易所':'交易所 → 實際帳戶',amount,exchange:lab.exchange,region:lab.region,source:lab.source||'known-reservoir'});}
return res.status(200).json({address,scannedChains:CHAINS,transfersScanned:all.length,uniqueCounterparties:cps.length,hits:hits.slice(0,100),source:'Routescan indexed ERC-20 history + exchange reservoir labels'});}catch(e){return res.status(502).json({error:'History scan failed',detail:e?.message||String(e)});}}
