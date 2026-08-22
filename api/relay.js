const RPC = {
  1: 'https://cloudflare-eth.com',
  10: 'https://mainnet.optimism.io',
  56: 'https://bsc-dataseed.binance.org',
  137: 'https://polygon-rpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  43114: 'https://api.avax.network/ext/bc/C/rpc'
};
const TRANSFER_TOPIC='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const topicAddress=t=>/^0x[0-9a-fA-F]{64}$/.test(String(t||''))?'0x'+String(t).slice(-40).toLowerCase():'';

async function rpcCall(rpc,method,params){
  const r=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),cache:'no-store'});
  if(!r.ok)return null; const j=await r.json(); return j?.result??null;
}

async function getTx(chainId, hash) {
  const rpc=RPC[Number(chainId)]; if(!rpc||!hash)return null;
  try {
    const [tx,receipt]=await Promise.all([
      rpcCall(rpc,'eth_getTransactionByHash',[hash]),
      rpcCall(rpc,'eth_getTransactionReceipt',[hash])
    ]);
    if(!tx)return null;
    const transfers=[];
    for(const log of (receipt?.logs||[])){
      const topics=Array.isArray(log?.topics)?log.topics:[];
      if(String(topics[0]||'').toLowerCase()!==TRANSFER_TOPIC||topics.length<3)continue;
      const from=topicAddress(topics[1]),to=topicAddress(topics[2]);
      if(!from||!to)continue;
      transfers.push({token:String(log.address||'').toLowerCase(),from,to,value:String(log.data||'')});
    }
    return {hash:tx.hash||hash,chainId:Number(chainId),from:String(tx.from||'').toLowerCase(),to:String(tx.to||'').toLowerCase(),value:tx.value||'',input:tx.input||'',transfers};
  } catch { return null; }
}

function rowsFrom(data){if(Array.isArray(data?.requests))return data.requests;if(Array.isArray(data?.data))return data.data;if(Array.isArray(data))return data;return[];}
function chainFromTxs(row,side){const list=row?.data?.[side]||row?.[side]||[];return Number(list?.[0]?.chainId||0)||0;}
function txHashes(row,side){const list=row?.data?.[side]||row?.[side]||[];return Array.isArray(list)?list.map(x=>typeof x==='string'?x:(x?.txHash||x?.hash)).filter(Boolean):[];}
function routeChain(row,side){const r=row?.data?.route||{},p=r.actual?.[side]||r.quoted?.[side]||{};return Number(p?.inputCurrency?.currency?.chainId||p?.outputCurrency?.currency?.chainId||0)||0;}

export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const wallet=String(req.query?.wallet||'').trim().toLowerCase();
  if(!/^0x[a-f0-9]{40}$/.test(wallet))return res.status(400).json({error:'Invalid wallet address'});
  if(!process.env.RELAY_API_KEY)return res.status(500).json({error:'RELAY_API_KEY is not configured'});
  const limit=Math.min(Math.max(Number(req.query?.limit||50),1),50);
  const includeChildRequests=String(req.query?.includeChildRequests||'true')!=='false';
  const enrich=String(req.query?.enrich||'true')!=='false';
  const q=new URLSearchParams({term:wallet,sortBy:'updatedAt',sortDirection:'desc',limit:String(limit)}); if(includeChildRequests)q.set('includeChildRequests','true');
  try{
    const headers={Accept:'application/json','x-api-key':process.env.RELAY_API_KEY};
    const r=await fetch(`https://api.relay.link/requests/v3?${q}`,{method:'GET',headers,cache:'no-store'}),text=await r.text();
    if(!r.ok)return res.status(r.status).json({error:`Relay HTTP ${r.status}`,detail:text.slice(0,1000)});
    let data={}; try{data=text?JSON.parse(text):{};}catch{return res.status(502).json({error:'Relay returned non-JSON',detail:text.slice(0,500)});}
    const selected=rowsFrom(data).slice(0,limit);
    if(enrich&&selected.length){
      const enriched=await Promise.all(selected.map(async row=>{
        const id=String(row?.id||row?.requestId||row?.data?.id||''); if(!id)return row;
        try{
          const originChainId=chainFromTxs(row,'inTxs')||routeChain(row,'origin');
          const destinationChainId=chainFromTxs(row,'outTxs')||routeChain(row,'destination');
          const resolvedTxs=[];
          for(const h of txHashes(row,'inTxs').slice(0,4)){const tx=await getTx(originChainId,h);if(tx)resolvedTxs.push({...tx,side:'origin'});}
          for(const h of txHashes(row,'outTxs').slice(0,4)){const tx=await getTx(destinationChainId,h);if(tx)resolvedTxs.push({...tx,side:'destination'});}
          return {...row,originChainId,destinationChainId,resolvedTxs};
        }catch{return row;}
      }));
      selected.splice(0,selected.length,...enriched);
    }
    res.setHeader('Cache-Control','no-store, max-age=0'); res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(200).json({requests:selected,count:selected.length,queried:{term:wallet},apiVersion:'v3',enriched:Boolean(enrich),rpcChains:Object.keys(RPC).map(Number),transferLogs:true,continuation:data?.continuation||null,total:data?.total});
  }catch(error){return res.status(502).json({error:'Relay upstream unavailable',detail:error?.message||String(error)});}
}
