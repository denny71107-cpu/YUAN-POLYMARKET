const RPC={1:'https://cloudflare-eth.com',10:'https://mainnet.optimism.io',56:'https://bsc-dataseed.binance.org',137:'https://polygon-rpc.com',8453:'https://mainnet.base.org',42161:'https://arb1.arbitrum.io/rpc',43114:'https://api.avax.network/ext/bc/C/rpc'};
const isAddr=x=>/^0x[a-f0-9]{40}$/i.test(String(x||''));
function cors(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Cache-Control','no-store');}
function rowsFrom(data){if(Array.isArray(data?.requests))return data.requests;if(Array.isArray(data?.data))return data.data;if(Array.isArray(data))return data;return[];}
const low=x=>String(x||'').trim().toLowerCase();
function findAddress(obj,keys){for(const k of keys){const v=obj?.[k];if(isAddr(v))return low(v)}return'';}
function findValue(obj,keys){for(const k of keys){const v=obj?.[k];if(v!==undefined&&v!==null&&String(v)!=='')return v}return'';}
function requestSummary(s){
 const data=s?.data||{},inTx=s?.inTx||{},outTx=s?.outTx||{},origin=s?.origin||{},dest=s?.destination||{};
 const sender=findAddress(s,['sender','user','from'])||findAddress(data,['sender','user','from'])||findAddress(inTx,['from','sender']);
 const recipient=findAddress(s,['recipient','receiver','to'])||findAddress(data,['recipient','receiver','to','destinationAddress'])||findAddress(dest,['recipient','receiver','to','address'])||findAddress(outTx,['to','recipient']);
 return{requestId:String(s?.id||s?.requestId||''),status:String(s?.status||''),sender,recipient,originChainId:Number(s?.originChainId||origin?.chainId||0),destinationChainId:Number(s?.destinationChainId||dest?.chainId||0),inTxHashes:s?.inTxHashes||[],outTxHashes:s?.txHashes||s?.outTxHashes||[],inputToken:findValue(data,['inputToken','currencyIn','tokenIn'])||findValue(origin,['token','currency']),inputAmount:findValue(data,['inputAmount','amountIn','amount']),outputToken:findValue(data,['outputToken','currencyOut','tokenOut'])||findValue(dest,['token','currency']),outputAmount:findValue(data,['outputAmount','amountOut']),updatedAt:s?.updatedAt||'',raw:s};
}
export default async function handler(req,res){cors(res);if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});if(!process.env.RELAY_API_KEY)return res.status(500).json({error:'RELAY_API_KEY is not configured'});const headers={Accept:'application/json','x-api-key':process.env.RELAY_API_KEY};
try{
 const requestId=String(req.query?.requestId||'').trim();
 if(requestId){const sr=await fetch(`https://api.relay.link/intents/status/v3?requestId=${encodeURIComponent(requestId)}`,{headers,cache:'no-store'});const text=await sr.text();if(!sr.ok)return res.status(sr.status).json({error:`Relay status HTTP ${sr.status}`,detail:text.slice(0,600)});let s={};try{s=JSON.parse(text)}catch{return res.status(502).json({error:'Relay status returned non-JSON'});}const q=requestSummary(s);return res.status(200).json(q);}
 const wallet=low(req.query?.wallet);if(!/^0x[a-f0-9]{40}$/.test(wallet))return res.status(400).json({error:'Invalid wallet'});
 const all=[],seen=new Set();let continuation='',pages=0;do{const q=new URLSearchParams({user:wallet,limit:'50',sortBy:'updatedAt',sortDirection:'desc'});if(continuation)q.set('continuation',continuation);const r=await fetch(`https://api.relay.link/requests/v2?${q}`,{headers,cache:'no-store'});const text=await r.text();if(!r.ok)return res.status(r.status).json({error:`Relay HTTP ${r.status}`,detail:text.slice(0,600)});let d={};try{d=JSON.parse(text)}catch{return res.status(502).json({error:'Relay returned non-JSON'});}for(const row of rowsFrom(d)){const id=String(row?.id||row?.requestId||row?.data?.id||'');if(id&&!seen.has(id)){seen.add(id);const z=requestSummary(row);z.id=id;all.push(z);}}continuation=String(d?.continuation||'');pages++;if(pages>=20)break;}while(continuation);
 return res.status(200).json({wallet,requests:all,count:all.length,pages,truncated:Boolean(continuation)});
}catch(e){return res.status(502).json({error:'Relay request unavailable',detail:String(e?.message||e)});}}
