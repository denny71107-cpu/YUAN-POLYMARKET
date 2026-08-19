(()=>{
'use strict';
const nativeJ=window.j;
async function fetchJson(path){const r=await fetch(path,{cache:'no-store'});const text=await r.text();let data=null;try{data=JSON.parse(text)}catch{}if(!r.ok){const detail=data?.detail||data?.error||text.slice(0,180);throw Error(`HTTP ${r.status}${detail?`｜${detail}`:''}`);}if(data===null)throw Error('API 回傳非 JSON');return data;}
function eventSlug(url){try{const u=new URL(url,location.href);const m=u.pathname.match(/\/events\/slug\/([^/?#]+)/);return m?decodeURIComponent(m[1]):'';}catch{return '';}}
async function proxyJ(url){
  if(url.includes('gamma-api.polymarket.com/events/slug/')){
    const slug=eventSlug(url);
    if(!slug)throw Error('無法解析市場 slug');
    try{return await fetchJson(`/api/polymarket?type=event&slug=${encodeURIComponent(slug)}`);}catch(e){
      console.warn('[Polymarket proxy] event API failed, trying direct:',slug,e.message);
      const r=await fetch(`https://gamma-api.polymarket.com/events/slug/${encodeURIComponent(slug)}?_=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)throw Error(`市場讀取失敗 HTTP ${r.status}`);
      const text=await r.text();try{return JSON.parse(text)}catch{throw Error('市場 API 回傳非 JSON');}
    }
  }
  if(url.includes('data-api.polymarket.com/trades')){
    const u=new URL(url),market=u.searchParams.get('market')||'',offset=u.searchParams.get('offset')||'0';
    return fetchJson(`/api/polymarket?type=trades&market=${encodeURIComponent(market)}&offset=${encodeURIComponent(offset)}`);
  }
  if(url.includes('gamma-api.polymarket.com/public-search')){
    const u=new URL(url),q=u.searchParams.get('q')||'';
    return fetchJson(`/api/polymarket?type=search&q=${encodeURIComponent(q)}`);
  }
  if(typeof nativeJ==='function')return nativeJ(url);
  const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return r.json();
}
window.j=proxyJ;
setTimeout(()=>{if(typeof window.loadMarkets==='function')window.loadMarkets();},150);
})();