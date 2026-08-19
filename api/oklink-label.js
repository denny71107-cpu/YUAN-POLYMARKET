const CHAIN={1:{slug:'ethereum',short:'ETH'},10:{slug:'optimism',short:'OP'},56:{slug:'bsc',short:'BSC'},137:{slug:'polygon',short:'POLYGON'},8453:{slug:'base',short:'BASE'},42161:{slug:'arbitrum',short:'ARBITRUM'},43114:{slug:'avalanche-c',short:'AVAXC'}};
const EXCHANGES=[
 ['BitoPro',/\bbitopro\b/i],['MaiCoin',/\bmaicoin\b/i],['MAX',/\bmax\s*(exchange|ex)?\b/i],['Binance',/\bbinance\b/i],['OKX',/\bokx\b/i],['Coinbase',/\bcoinbase\b/i],['Bybit',/\bbybit\b/i],['Kraken',/\bkraken\b/i],['Gate.io',/\bgate\.io\b|\bgateio\b/i],['MEXC',/\bmexc\b/i],['Crypto.com',/\bcrypto\.com\b/i],['KuCoin',/\bkucoin\b/i],['HTX',/\bhtx\b|\bhuobi\b/i],['Bitget',/\bbitget\b/i]
];
function clean(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&amp;|&#39;|&quot;/g,' ').replace(/\s+/g,' ')}
function findExchange(text){for(const [name,re] of EXCHANGES)if(re.test(text))return name;return''}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const address=String(req.query?.address||'').trim().toLowerCase(),chainId=Number(req.query?.chainId||137);
 if(!/^0x[a-f0-9]{40}$/.test(address))return res.status(400).json({error:'Invalid address'});
 const c=CHAIN[chainId]||CHAIN[137];
 const urls=[`https://www.oklink.com/${c.slug}/address/${address}`,`https://www.oklink.com/zh-hant/${c.slug}/address/${address}`];
 let detail='',status=0;
 for(const url of urls){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','accept-language':'zh-TW,zh;q=0.9,en;q=0.8'},cache:'no-store'});status=r.status;if(!r.ok)continue;const html=await r.text();const text=clean(html);detail=text.slice(0,50000);const exchange=findExchange(detail);if(exchange)return res.status(200).json({found:true,exchange,address,chainId,source:'OKLink 公開地址頁',url});}catch{}}
 const key=process.env.OKLINK_API_KEY;
 if(key){try{const u=new URL('https://www.oklink.com/api/v5/explorer/address/transaction-list');u.searchParams.set('chainShortName',c.short);u.searchParams.set('address',address);u.searchParams.set('limit','20');u.searchParams.set('page','1');const r=await fetch(u,{headers:{'Ok-Access-Key':key},cache:'no-store'});const j=await r.json();const text=JSON.stringify(j);const exchange=findExchange(text);if(exchange)return res.status(200).json({found:true,exchange,address,chainId,source:'OKLink API',apiCode:j?.code||'',url:urls[0]});}catch{}}
 return res.status(200).json({found:false,address,chainId,source:'OKLink',httpStatus:status,configured:Boolean(key),url:urls[0]});
}