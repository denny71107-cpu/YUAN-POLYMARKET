const TARGET='0x36339b5080a2d4be4bc8b5a48638f7326e093ada';
const WATCH={
'0x75e89d5979e4f6fba9f97c104c2f0afb3f1dcb88':'MEXC: Hot Wallet 1',
'0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43':'Coinbase: Hot Wallet 5',
'0x45300136662dd4e58fc0df61e6290dffd992b785':'KuCoin: Hot Wallet 5',
'0x46340b20830761efd32832a74d7169b29feb9758':'Crypto.com: Hot Wallet 2'
};
async function page(action,p){const u=new URL('https://api.routescan.io/v2/network/mainnet/evm/1/etherscan/api');Object.entries({module:'account',action,address:TARGET,page:String(p),offset:'1000',sort:'desc'}).forEach(([k,v])=>u.searchParams.set(k,v));const r=await fetch(u,{cache:'no-store'});if(!r.ok)return[];const j=await r.json();return Array.isArray(j?.result)?j.result:[]}
async function tag(a){const u=new URL('https://api.routescan.io/v2/network/mainnet/evm/1/etherscan/api');u.searchParams.set('module','nametag');u.searchParams.set('action','getaddresstag');u.searchParams.set('address',a);try{const r=await fetch(u,{cache:'no-store'});const text=await r.text();let json;try{json=JSON.parse(text)}catch{}return{status:r.status,result:json?.result??null,raw:json?undefined:text.slice(0,500)}}catch(e){return{error:e?.message||String(e)}}}
export default async function handler(req,res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'GET only'});try{const found={};for(const [a,name] of Object.entries(WATCH))found[a]={name,transactions:[],nametag:null};for(const action of ['tokentx','txlist']){for(let p=1;p<=10;p++){const xs=await page(action,p);for(const x of xs){const from=String(x.from||'').toLowerCase(),to=String(x.to||'').toLowerCase(),cp=from===TARGET?to:to===TARGET?from:'';if(found[cp])found[cp].transactions.push({action,page:p,hash:x.hash||'',from,to,timeStamp:x.timeStamp||'',tokenSymbol:x.tokenSymbol||''})}if(xs.length<1000)break}}
for(const a of Object.keys(found))found[a].nametag=await tag(a);return res.status(200).json({version:'exchange-debug-v1',target:TARGET,chainId:1,watch:found})}catch(e){return res.status(500).json({error:e?.message||String(e),version:'exchange-debug-v1'})}}
