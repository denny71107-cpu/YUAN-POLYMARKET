export default async function handler(req,res){
  try{
    const type=String(req.query.type||'');
    let url='';
    if(type==='event'){
      const slug=String(req.query.slug||'').trim();
      if(!/^[a-z0-9-]+$/i.test(slug)) return res.status(400).json({error:'invalid slug'});
      url=`https://gamma-api.polymarket.com/events/slug/${encodeURIComponent(slug)}`;
    }else if(type==='trades'){
      const market=String(req.query.market||'').trim();
      const offset=Math.max(0,Number(req.query.offset||0)||0);
      if(!market) return res.status(400).json({error:'missing market'});
      url=`https://data-api.polymarket.com/trades?market=${encodeURIComponent(market)}&limit=10000&offset=${offset}`;
    }else if(type==='search'){
      const q=String(req.query.q||'').trim();
      if(!q) return res.status(400).json({error:'missing q'});
      url=`https://gamma-api.polymarket.com/public-search?q=${encodeURIComponent(q)}&search_profiles=true&limit_per_type=20`;
    }else return res.status(400).json({error:'invalid type'});
    const r=await fetch(url,{headers:{'accept':'application/json','user-agent':'Mozilla/5.0 YUAN-Polymarket/1.0'},cache:'no-store'});
    const text=await r.text();
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if(!r.ok) return res.status(r.status).send(JSON.stringify({error:`Polymarket HTTP ${r.status}`,detail:text.slice(0,500)}));
    try{JSON.parse(text);}catch{return res.status(502).json({error:'Polymarket returned non-JSON',detail:text.slice(0,500)});}
    return res.status(200).send(text);
  }catch(e){return res.status(500).json({error:String(e?.message||e)});}
}