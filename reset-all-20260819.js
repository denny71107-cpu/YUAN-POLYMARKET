(()=>{'use strict';
const FLAG='YUAN_FULL_RESET_20260819_V1';
if(localStorage.getItem(FLAG)==='1')return;
const dbs=['YUAN_POLY_CASE_DB_V1','YUAN_FIRST_LAYER_DB_V1','YUAN_FIRST_LAYER_DB_V2'];
const keys=['YUAN_POLY_RELAY_CACHE_V2','YUAN_POLY_EXCHANGE_LABELS_V2','YUAN_POLY_EXCHANGE_FLOW_CACHE_V1','POLY_RELAY_TRANSFERS','POLY_COUNTERPARTIES','POLY_COUNTERPARTIES_V1','EXCHANGE_RELAY_MATCHES','OKLINK_TAG_SCAN_V3','OKLINK_EXCHANGE_SCAN_V2','OKLINK_EXCHANGE_RESULTS_V2','KEELUNG_RELAY_REQUESTS','KEELUNG_OKLINK_TAGS_V1'];
for(const k of keys)try{localStorage.removeItem(k)}catch{}
for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i)||'';if(/^(YUAN_|KEELUNG_|POLY_|OKLINK_|EXCHANGE_)/.test(k)&&k!==FLAG){try{localStorage.removeItem(k)}catch{}}}
Promise.allSettled(dbs.map(name=>new Promise(resolve=>{try{const r=indexedDB.deleteDatabase(name);r.onsuccess=r.onerror=r.onblocked=()=>resolve();}catch{resolve();}}))).then(()=>{try{sessionStorage.clear()}catch{};try{localStorage.setItem(FLAG,'1')}catch{};console.info('YUAN: full local data reset completed');location.reload();});
})();