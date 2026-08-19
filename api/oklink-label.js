const CHAIN={1:{slug:'ethereum',short:'ETH'},10:{slug:'optimism',short:'OP'},56:{slug:'bsc',short:'BSC'},137:{slug:'polygon',short:'POLYGON'},8453:{slug:'base',short:'BASE'},42161:{slug:'arbitrum',short:'ARBITRUM'},43114:{slug:'avalanche-c',short:'AVAXC'}};
const EXCHANGES=[['BitoPro',/\bbitopro\b/i],['MaiCoin',/\bmaicoin\b/i],['MAX',/\bmax\s*(exchange|ex)?\b/i],['Binance',/\bbinance\b/i],['OKX',/\bokx\b/i],['Coinbase',/\bcoinbase\b/i],['Bybit',/\bbybit\b/i],['Kraken',/\bkraken\b/i],['Gate.io',/\bgate\.io\b|\bgateio\b/i],['MEXC',/\bmexc\b/i],['Crypto.com',/\bcrypto\.com\b/i],['KuCoin',/\bkucoin\b/i],['HTX',/\bhtx\b|\bhuobi\b/i],['Bitget',/\bbitget\b/i]];
const PROTOCOLS=[['Uniswap',/\buniswap\b/i],['Relay',/\brelay\b/i],['1inch',/\b1inch\b/i],['PancakeSwap',/\bpancakeswap\b/i],['SushiSwap',/\bsushiswap\b/i],['Curve',/\bcurve\b/i],['Aave',/\baave\b/i]];
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const ex=s=>{for(const [n,r] of EXCHANGES)if(r.test(clean(s)))return n;return''};
const proto=s=>{for(const [n,r] of PROTOCOLS)if(r.test(clean(s)))return n;return''};
function isLabelKey(k){return /^(label|tag|entity|entityname|addresslabel|addressname|identity|identityname|nametag|address_tag)$/i.test(String(k||''))}
function collect(obj,out=[],depth=0){if(depth>10||obj==null)return out;if(Array.isArray(obj)){for(const v of obj.slice(0,1000))collect(v,out,depth+1);return out}if(typeof obj!=='object')return out;for(const [k,v] of Object.entries(obj)){if(typeof v==='string'&&isLabelKey(k)){const s=clean(v);if(s&&s.length<=160)out.push(s)}else if(v&&typeof v==='object')collect(v,out,depth+1)}return out}
function classify(labels){/* Protocol labels win over exchange words from unrelated metadata. */for(const l of labels){const p=proto(l);if(p)return{found:true,exchange:'',label:l,entityType:'protocol',entity:p}}for(const l of labels){const e=ex(l);if(e)return{found:true,exchange:e,label:l,entityType:'exchange'}}return{found:false,exchange:'',label:'',entityType:''}}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const address=clean(req.query?.address).toLowerCase(),chainId=Number(req.query?.chainId||137);if(!/^0x[a-f0-9]{40}$/.test(address))return res.status(400).json({error:'Invalid address'});
 const c=CHAIN[chainId]||CHAIN[137],url=`https://www.oklink.com/${c.slug}/address/${address}`,key=process.env.OKLINK_API_KEY;
 /* Do not classify from OKLink HTML. The page contains global OKX branding and caused false OKX hits. */
 if(!key)return res.status(200).json({found:false,address,chainId,source:'OKLink',configured:false,url,reason:'OKLINK_API_KEY not configured'});
 try{
  const endpoints=['https://www.oklink.com/api/v5/explorer/address/address-summary','https://www.oklink.com/api/v5/explorer/address/transaction-list'];let all=[];
  for(const ep of endpoints){const u=new URL(ep);u.searchParams.set('chainShortName',c.short);u.searchParams.set('address',address);if(ep.includes('transaction-list')){u.searchParams.set('limit','20');u.searchParams.set('page','1')}const r=await fetch(u,{headers:{'Ok-Access-Key':key},cache:'no-store'});const j=await r.json();all.push(...collect(j));}
  all=[...new Set(all)];const hit=classify(all);return res.status(200).json({...hit,address,chainId,source:'OKLink API',url,labels:all.slice(0,20)});
 }catch(e){return res.status(200).json({found:false,address,chainId,source:'OKLink API',configured:true,url,error:String(e?.message||e)});}
}