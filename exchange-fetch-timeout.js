(()=>{'use strict';
if(window.__YUAN_EXCHANGE_FETCH_TIMEOUT__)return;window.__YUAN_EXCHANGE_FETCH_TIMEOUT__=true;
const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  const url=typeof input==='string'?input:String(input?.url||'');
  if(!url.includes('/api/exchange-history?'))return nativeFetch(input,init);
  const timeoutMs=90000;
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`交易所反查逾時（${timeoutMs/1000} 秒）`)),timeoutMs)});
  return Promise.race([nativeFetch(input,init),timeout]).finally(()=>clearTimeout(timer));
};
})();