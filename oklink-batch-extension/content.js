const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function findTab(){return [...document.querySelectorAll('button,[role="tab"],a')].find(e=>/代幣轉賬|Token transfers|Token Transfer/i.test(e.innerText||''))}
function bodyLines(){return (document.body.innerText||'').split(/\n+/).map(x=>x.trim()).filter(Boolean)}
function collect(){const lines=bodyLines();const tags=lines.filter(x=>/BitoPro|Binance|Coinbase|Kraken|OKX|Bybit|Gate\.io|MEXC|KuCoin|Bitget|Bitopro/i.test(x));const txId=(document.body.innerText.match(/0x[a-fA-F0-9]{64}/)||[''])[0];const address=(location.pathname.match(/0x[a-fA-F0-9]{40}/i)||[''])[0].toLowerCase();return {address,matchedAddress:address,text:tags.join('\n'),txId}}
let scanned=false;
async function scan(){if(scanned)return;scanned=true;let tab=findTab();if(tab&&!/token-transfer/i.test(location.pathname)){tab.click();await sleep(2500)}await sleep(1500);const p=collect();chrome.runtime.sendMessage({type:'OKLINK_RESULT',payload:p})}
chrome.runtime.onMessage.addListener(m=>{if(m.type==='SCAN')scan()});
setTimeout(()=>{chrome.runtime.sendMessage({type:'CONTENT_READY',tabId:chrome.runtime.id}).catch(()=>{})},1000);