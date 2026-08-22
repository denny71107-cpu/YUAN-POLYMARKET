(()=>{'use strict';
const oldFetch=window.fetch.bind(window);
window.fetch=(input,init)=>{try{const u=typeof input==='string'?input:input?.url||'';if(u.includes('/api/exchange-history?')){const nu=u.replace('/api/exchange-history?','/api/exchange-history-v10?');return oldFetch(nu,init)}}catch{}return oldFetch(input,init)};
})();