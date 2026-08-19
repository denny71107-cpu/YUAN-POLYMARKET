(()=>{
'use strict';
const nativeFetch=window.fetch.bind(window);
const TRANSFER_TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const RPC={
  1:['https://ethereum-rpc.publicnode.com','https://cloudflare-eth.com'],
  10:['https://optimism-rpc.publicnode.com','https://mainnet.optimism.io'],
  56:['https://bsc-rpc.publicnode.com','https://bsc-dataseed.binance.org'],
  137:['https://polygon-bor-rpc.publicnode.com','https://polygon-rpc.com'],
  8453:['https://base-rpc.publicnode.com','https://mainnet.base.org'],
  42161:['https://arbitrum-one-rpc.publicnode.com','https://arb1.arbitrum.io/rpc'],
  43114:['https://avalanche-c-chain-rpc.publicnode.com','https://api.avax.network/ext/bc/C/rpc']
};
const addr=t=>/^0x[0-9a-fA-F]{64}$/.test(String(t||''))?'0x'+String(t).slice(-40).toLowerCase():'';
const rowsFrom=d=>Array.isArray(d?.requests)?d.requests:Array.isArray(d?.data)?d.data:Array.isArray(d)?d:[];
async function fetchJson(url,opt={}){const r=await nativeFetch(url,{cache:'no-store',...opt});const text=await r.text();let j=null;try{j=JSON.parse(text)}catch{}if(!r.ok)throw Error(`${r.status} ${text.slice(0,180)}`);if(j===null)throw Error('non-JSON response');return j;}
async function rpc(chainId,method,params){for(const u of (RPC[Number(chainId)]||[])){try{const j=await fetchJson(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(j?.result!==undefined&&j?.result!==null)return j.result}catch(e){console.warn('[Relay first RPC]',chainId,u,e.message)}}return null;}
async function resolvedTx(chainId,hash){if(!RPC[Number(chainId)]||!/^0x[a-fA-F0-9]{64}$/.test(String(hash||'')))return null;const [tx,receipt]=await Promise.all([rpc(chainId,'eth_getTransactionByHash',[hash]),rpc(chainId,'eth_getTransactionReceipt',[hash])]);if(!tx)return null;const transfers=[];for(const log of(receipt?.logs||[])){const topics=Array.isArray(log?.topics)?log.topics:[];if(String(topics[0]||'').toLowerCase()!==TRANSFER_TOPIC||topics.length<3)continue;const from=addr(topics[1]),to=addr(topics[2]);if(!from||!to)continue;transfers.push({token:String(log.address||'').toLowerCase(),from,to,value:String(log.data||'')});}return{hash:String(tx.hash||hash).toLowerCase(),chainId:Number(chainId),transfers};}
async function listRequests(wallet){const all=[],seen=new Set();let continuation='',pages=0;do{const q=new URLSearchParams({user:wallet,limit:'50',sortDirection:'desc'});if(continuation)q.set('continuation',continuation);const d=await fetchJson(`https://api.relay.link/requests/v2?${q}`);for(const row of rowsFrom(d)){const id=String(row?.id||row?.requestId||row?.data?.id||'');if(id&&!seen.has(id)){seen.add(id);all.push({id,status:row?.status||'',createdAt:row?.createdAt||'',updatedAt:row?.updatedAt||''});}}continuation=String(d?.continuation||'');pages++;if(pages>=20)break;}while(continuation);return{wallet,requests:all,count:all.length,pages,truncated:Boolean(continuation)};}
async function oneRequest(wallet,requestId){const s=await fetchJson(`https://api.relay.link/intents/status/v3?requestId=${encodeURIComponent(requestId)}`);const originChainId=Number(s.originChainId||0),txs=[];for(const h of(s.inTxHashes||[])){const t=await resolvedTx(originChainId,h);if(t)txs.push(t);}const transfers=[];for(const t of txs){for(const tr of(t.transfers||[])){const a=tr.from===wallet,b=tr.to===wallet;if(wallet&&a!==b)transfers.push({chainId:t.chainId,txHash:t.hash,direction:a?'Proxy -> Counterparty':'Counterparty -> Proxy',tokenContract:tr.token,rawAmount:tr.value,counterparty:a?tr.to:tr.from});}}return{requestId,status:s.status||'',originChainId,destinationChainId:Number(s.destinationChainId||0),updatedAt:s.updatedAt||'',inTxHashes:s.inTxHashes||[],outTxHashes:s.txHashes||[],transfers};}
function response(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
window.fetch=async function(input,init){const raw=typeof input==='string'?input:input?.url||'';try{const u=new URL(raw,location.href);if(u.pathname.endsWith('/api/relay-first')){const wallet=String(u.searchParams.get('wallet')||'').trim().toLowerCase();if(!/^0x[a-f0-9]{40}$/.test(wallet))return response({error:'Invalid wallet'},400);const requestId=String(u.searchParams.get('requestId')||'').trim();try{return response(requestId?await oneRequest(wallet,requestId):await listRequests(wallet));}catch(e){return response({error:'Browser Relay first-layer unavailable',detail:String(e?.message||e)},502);}}
  }catch{}
  return nativeFetch(input,init);
};
console.info('YUAN: Relay first-layer browser adapter ready');
})();