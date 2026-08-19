const CHAIN={1:{slug:'ethereum',short:'ETH'},10:{slug:'optimism',short:'OP'},56:{slug:'bsc',short:'BSC'},137:{slug:'polygon',short:'POLYGON'},8453:{slug:'base',short:'BASE'},42161:{slug:'arbitrum',short:'ARBITRUM'},43114:{slug:'avalanche-c',short:'AVAXC'}};
const EXCHANGES=[
 ['BitoPro',/\bbitopro\b/i],['MaiCoin',/\bmaicoin\b/i],['MAX',/\bmax\s*(exchange|ex)?\b/i],['Binance',/\bbinance\b/i],['OKX',/\bokx\b/i],['Coinbase',/\bcoinbase\b/i],['Bybit',/\bbybit\b/i],['Kraken',/\bkraken\b/i],['Gate.io',/\bgate\.io\b|\bgateio\b/i],['MEXC',/\bmexc\b/i],['Crypto.com',/\bcrypto\.com\b/i],['KuCoin',/\bkucoin\b/i],['HTX',/\bhtx\b|\bhuobi\b/i],['Bitget',/\bbitget\b/i]
];
const PROTOCOLS=[['Uniswap',/\buniswap\b/i],['Relay',/\brelay\b/i],['1inch',/\b1inch\b/i],['PancakeSwap',/\bpancakeswap\b/i],['SushiSwap',/\bsushiswap\b/i],['Curve',/\bcurve\b/i],['Aave',/\baave\b/i]];
function clean(s){return String(s||'').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&amp;|&#39;|&quot;|&lt;|&gt;/g,' ').replace(/\\u0026/g,'&').replace(/\\u003c/gi,'<').replace(/\\u003e/gi,'>').replace(/\s+/g,' ').trim()}
function exchangeFromLabel(text){for(const [name,re] of EXCHANGES)if(re.test(String(text||'')))return name;return''}
function protocolFromLabel(text){for(const [name,re] of PROTOCOLS)if(re.test(String(text||'')))return name;return''}
function looksLikeEntityLabel(v){const s=clean(v);if(!s||s.length>160)return false;return /(?:user|wallet|deposit|withdraw|hot\s*wallet|cold\s*wallet|exchange|router|aggregator|contract|bridge|protocol)/i.test(s)||Boolean(exchangeFromLabel(s))||Boolean(protocolFromLabel(s))}
function collectStructuredLabels(obj,out=[],depth=0){if(depth>9||obj==null)return out;if(Array.isArray(obj)){for(const v of obj.slice(0,500))collectStructuredLabels(v,out,depth+1);return out}if(typeof obj!=='object')return out;for(const [k,v] of Object.entries(obj)){const key=String(k).toLowerCase();if(typeof v==='string'&&/(label|tag|entity|name|identity|addressname|addresslabel)/i.test(key)&&looksLikeEntityLabel(v))out.push(clean(v));else if(v&&typeof v==='object')collectStructuredLabels(v,out,depth+1)}return out}
function labelsFromHtml(html,address){const out=[];const raw=String(html||'');const patterns=[
 /"(?:label|tag|entityName|addressLabel|addressName|identity)"\s*:\s*"([^"]{1,160})"/gi,
 /(?:label|tag|entityName|addressLabel|addressName|identity)\\?"?\s*[:=]\s*\\?"([^"\\]{1,160})/gi
 ];
 for(const re of patterns){let m;while((m=re.exec(raw))&&out.length<100){const v=clean(m[1]);if(looksLikeEntityLabel(v))out.push(v)}}
 /* only inspect a small window around the queried address; never scan the entire OKLink page for brand words */
 const pos=raw.toLowerCase().indexOf(String(address||'').toLowerCase());if(pos>=0){const win=clean(raw.slice(Math.max(0,pos-1800),Math.min(raw.length,pos+2600)));const candidates=win.split(/[|·•;,，；]/).map(clean).filter(looksLikeEntityLabel);out.push(...candidates.slice(0,30))}
 return [...new Set(out)].filter(Boolean)
}
function classify(labels){for(const label of labels){const exchange=exchangeFromLabel(label);if(exchange)return{found:true,exchange,label,entityType:'exchange'}}for(const label of labels){const protocol=protocolFromLabel(label);if(protocol)return{found:true,exchange:'',label,entityType:'protocol',entity:protocol}}return{found:false,exchange:'',label:'',entityType:''}}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const address=String(req.query?.address||'').trim().toLowerCase(),chainId=Number(req.query?.chainId||137);
 if(!/^0x[a-f0-9]{40}$/.test(address))return res.status(400).json({error:'Invalid address'});
 const c=CHAIN[chainId]||CHAIN[137];
 const urls=[`https://www.oklink.com/${c.slug}/address/${address}`,`https://www.oklink.com/zh-hant/${c.slug}/address/${address}`];
 let status=0,lastLabels=[];
 for(const url of urls){try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','accept-language':'zh-TW,zh;q=0.9,en;q=0.8'},cache:'no-store'});status=r.status;if(!r.ok)continue;const html=await r.text();const labels=labelsFromHtml(html,address);lastLabels=labels;const hit=classify(labels);if(hit.found)return res.status(200).json({...hit,address,chainId,source:'OKLink 公開地址頁',url,labels:labels.slice(0,12)});}catch{}}
 const key=process.env.OKLINK_API_KEY;
 if(key){try{const u=new URL('https://www.oklink.com/api/v5/explorer/address/transaction-list');u.searchParams.set('chainShortName',c.short);u.searchParams.set('address',address);u.searchParams.set('limit','20');u.searchParams.set('page','1');const r=await fetch(u,{headers:{'Ok-Access-Key':key},cache:'no-store'});const j=await r.json();const labels=collectStructuredLabels(j);const hit=classify(labels);if(hit.found)return res.status(200).json({...hit,address,chainId,source:'OKLink API',apiCode:j?.code||'',url:urls[0],labels:labels.slice(0,12)});}catch{}}
 return res.status(200).json({found:false,address,chainId,source:'OKLink',httpStatus:status,configured:Boolean(key),url:urls[0],labels:lastLabels.slice(0,12)});
}