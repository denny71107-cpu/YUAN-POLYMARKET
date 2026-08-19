const CHAINS=[1,56,137,42161,8453,10];
const CHAIN_NAME={1:'Ethereum',56:'BNB Chain',137:'Polygon',42161:'Arbitrum',8453:'Base',10:'Optimism'};
const FALLBACK_LABELS={
'0x477b8d5ef7c2c42db84deb555419cd817c336b6f':{exchange:'MaiCoin',region:'台灣',tags:'MaiCoin. DepositAndWithdrawAndGasfee_2'},
'0x7a83f06d30c8fc063dcb632b2540a9cc4835709a':{exchange:'BitoPro',region:'台灣',tags:'BitoPro. Withdraw_1'},
'0xb1ecc5c8bbb3f977d2be80491373fbea9ad62d5b':{exchange:'BitoPro',region:'台灣',tags:'BitoPro. User'},
'0x0853ea40b121f9135d7e0c07fae35d59aedb4d0b':{exchange:'Kraken',region:'海外',tags:'Kraken. DepositAndWithdraw_6'},
'0xba2987a1a6b8662b8fa04c8512f7fbec346af336':{exchange:'OKX',region:'海外',tags:'OKX. Hot Wallet_189'},
'0x343d752bb710c5575e417edb3f9fa06241a4749a':{exchange:'OKX',region:'海外',tags:'OKX. Hot Wallet_145'},
'0xe7804c37c13166ff0b37f5ae0bb07a3aebb6e245':{exchange:'Binance',region:'海外',tags:'Binance. DepositAndWithdraw_3'},
'0x290275e3db66394c52272398959845170e4dcb88':{exchange:'Binance',region:'海外',tags:'Binance. Withdraw_2'},
'0xdfd5293d8e347dfe59e90efd55b2956a1343963d':{exchange:'Binance',region:'海外',tags:'Binance'},
'0xee7ae85f2fe2239e27d9c1e23fffe168d63b4055':{exchange:'Binance',region:'海外',tags:'Binance. Hot Wallet_1'},
'0xcb39c5b0db9c5b6bd1d9273dccc2f98f532a8bc6':{exchange:'Coinbase',region:'海外',tags:'Coinbase. DepositAndWithdraw_13'},
'0x4d8336bda6c11bd2a805c291ec719baedd10acb9':{exchange:'Coinbase',region:'海外',tags:'Coinbase. Deposit_9'},
'0x0d0707963952f2fba59dd06f2b425ace40b492fe':{exchange:'Gate',region:'海外',tags:'Gate.io. DepositAndWithdraw_1'},
'0x505e71695e9bc45943c58adec1650577bca68fd9':{exchange:'Binance',region:'海外',tags:'Binance. Withdraw_3'},
'0x51e3d44172868acc60d68ca99591ce4230bc75e0':{exchange:'MEXC',region:'海外',tags:'MEXC. DepositAndWithdraw_1'},
'0xf89d7b9c864f589bbf53a82105107622b35eaa40':{exchange:'Bybit',region:'海外',tags:'Bybit. DepositAndWithdraw_1'},
'0x1347378b1d0eb69d3462e09b3dfa2fe28ebe74ec':{exchange:'Bybit',region:'海外',tags:'Bybit. Deposit_2'},
'0xa85c29b94f8a22a7268facee89ef4eca051be2ce':{exchange:'Bybit',region:'海外',tags:'Bybit. Deposit_3'},
'0xf977814e90da44bfa03b6295a0616a897441acec':{exchange:'Binance',region:'海外',tags:'Binance. Cold Wallet_7'},
'0xe86f3aaa57f63b2afeca68178182a91bc3909962':{exchange:'Coinbase',region:'海外',tags:'Coinbase. DepositAndWithdraw_2'},
'0x760dce7ea6e8ba224bffbeb8a7ff4dd1ef122bff':{exchange:'Coinbase',region:'海外',tags:'Coinbase. DepositAndWithdraw_1'},
'0x14af92363379f3548958f9de1fb2e6e5df74476e':{exchange:'Coinbase',region:'海外',tags:'Coinbase. Withdraw_2'},
'0x06959153b974d0d5fdfd87d561db6d8d4fa0bb0b':{exchange:'OKX',region:'海外',tags:'OKX. DepositAndWithdraw_3'},
'0x3eb9845b9c8f835ad130456f8dab6aef79af5272':{exchange:'Coinbase',region:'海外',tags:'Coinbase. Deposit_6'},
'0xc9aaa6ca0e05b87d53a3e51edbc44b406eeaf299':{exchange:'Coinbase',region:'海外',tags:'Coinbase. DepositAndWithdraw_12'},
'0x2a410f11a6f520398447bf423dcedd25dfd3a568':{exchange:'Coinbase',region:'海外',tags:'Coinbase. Deposit_2'}
};
function valid(a){return /^0x[a-f0-9]{40}$/.test(a)}
function amount(x){const d=Math.max(0,Math.min(36,Number(x.tokenDecimal||0)));try{return Number(BigInt(x.value||'0'))/10**d}catch{return Number(x.value||0)/10**d}}
async function tokenTx(address,chainid,key){const u=new URL('https://api.etherscan.io/v2/api');u.searchParams.set('chainid',String(chainid));u.searchParams.set('module','account');u.searchParams.set('action','tokentx');u.searchParams.set('address',address);u.searchParams.set('page','1');u.searchParams.set('offset','1000');u.searchParams.set('sort','desc');u.searchParams.set('apikey',key);const r=await fetch(u,{cache:'no-store'});if(!r.ok)return[];const j=await r.json();return Array.isArray(j?.result)?j.result:[]}
export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.ETHERSCAN_API_KEY;
 if(!key)return res.status(200).json({configured:false,hits:[],message:'尚未設定 ETHERSCAN_API_KEY'});
 const address=String(req.body?.address||'').trim().toLowerCase(); if(!valid(address))return res.status(400).json({error:'Invalid address'});
 const incoming=req.body?.labels&&typeof req.body.labels==='object'?req.body.labels:{}; const labels={...FALLBACK_LABELS};
 for(const [a,v] of Object.entries(incoming)){const n=String(a).toLowerCase();if(valid(n)&&v&&v.exchange)labels[n]=v}
 const requested=Number(req.body?.chainId||0); const chains=requested?[requested]:CHAINS; const hits=[];let scanned=0;
 for(const chainId of chains){
   const rows=await tokenTx(address,chainId,key); scanned+=rows.length;
   for(const x of rows){const from=String(x.from||'').toLowerCase(),to=String(x.to||'').toLowerCase();const cp=from===address?to:(to===address?from:'');if(!cp||!labels[cp])continue;const lab=labels[cp];hits.push({chainId,chain:CHAIN_NAME[chainId]||String(chainId),exchange:lab.exchange,region:lab.region||'',tag:lab.tags||'',counterparty:cp,direction:from===address?'地址 → 交易所':'交易所 → 地址',token:x.tokenSymbol||x.tokenName||'',amount:amount(x),time:new Date(Number(x.timeStamp||0)*1000).toISOString(),txHash:x.hash||''});}
 }
 hits.sort((a,b)=>b.time.localeCompare(a.time));
 return res.status(200).json({configured:true,address,scanned,hits,count:hits.length,chains});
}
