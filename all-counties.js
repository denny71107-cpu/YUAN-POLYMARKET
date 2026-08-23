(function(){
  'use strict';
  const ALL='__ALL_COUNTIES__';
  let installed=false;
  function install(){
    if(installed) return true;
    const sel=document.getElementById('eventSelect');
    if(!sel || !Array.isArray(window.EVENTS) || typeof window.fetchTrades!=='function') return false;
    installed=true;
    const originalFetchTrades=window.fetchTrades;
    const originalChange=sel.onchange;
    const oldValue=sel.value;
    sel.innerHTML='';
    sel.add(new Option('全部縣市',ALL));
    window.EVENTS.forEach(([name,slug])=>sel.add(new Option(name,slug)));
    if(oldValue && oldValue!==ALL && [...sel.options].some(o=>o.value===oldValue)) sel.value=oldValue;
    else sel.value=ALL;

    async function runAllCounties(){
      const counties=window.EVENTS.slice(0,22);
      const out=[];
      currentRows=[];
      marketSelect.disabled=true;
      marketLoading.textContent='全部縣市：準備抓取 22 個縣市…';
      try{
        for(let i=0;i<counties.length;i++){
          const [region,slug]=counties[i];
          marketLoading.textContent=`全部縣市：${i+1}/22 ${region}`;
          const markets=await loadEventMarkets(slug);
          for(let j=0;j<markets.length;j++){
            marketLoading.textContent=`全部縣市：${i+1}/22 ${region}｜市場 ${j+1}/${markets.length}`;
            out.push(...await fetchMarketTrades(region,markets[j]));
          }
        }
        currentRows=dedupeRows(out.filter(keepDate)).sort((a,b)=>b['台灣時間'].localeCompare(a['台灣時間']));
        populateTradeFilters();
        renderTrades();
        marketLoading.textContent=`全部縣市完成：22 個縣市｜共 ${currentRows.length} 筆（已排除全國－政黨勝出）`;
      }catch(e){
        marketLoading.textContent='全部縣市抓取失敗：'+(e?.message||e);
        alert('全部縣市抓取失敗：'+(e?.message||e));
      }finally{ marketSelect.disabled=false; }
    }

    window.fetchTrades=async function(){
      if(sel.value===ALL) return runAllCounties();
      return originalFetchTrades.apply(this,arguments);
    };

    sel.onchange=async function(){
      if(sel.value===ALL){
        currentRows=[];
        marketSelect.innerHTML='<option value="all">全部縣市</option>';
        marketSelect.disabled=true;
        marketLoading.textContent='已選擇全部縣市（排除全國－政黨勝出）';
        tradeTable.innerHTML='<tr><td colspan="11">尚未抓取</td></tr>';
        summary.textContent='尚未抓取。';
        return;
      }
      marketSelect.disabled=false;
      if(typeof originalChange==='function') return originalChange.call(this);
      if(typeof loadMarkets==='function') return loadMarkets();
    };
    sel.dispatchEvent(new Event('change'));
    return true;
  }
  const timer=setInterval(()=>{ if(install()) clearInterval(timer); },100);
  setTimeout(()=>clearInterval(timer),20000);
})();