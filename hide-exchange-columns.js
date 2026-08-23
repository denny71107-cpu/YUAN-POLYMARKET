(()=>{'use strict';
const STYLE_ID='yuan-hide-exchange-columns';

function addStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
/* 暫時隱藏不使用的交易欄位：Chain、幣種、金額、時間、交易所地址、TxHash */
#yuanRecipientExchange .mini th:nth-child(5),
#yuanRecipientExchange .mini td:nth-child(5),
#yuanRecipientExchange .mini th:nth-child(6),
#yuanRecipientExchange .mini td:nth-child(6),
#yuanRecipientExchange .mini th:nth-child(7),
#yuanRecipientExchange .mini td:nth-child(7),
#yuanRecipientExchange .mini th:nth-child(8),
#yuanRecipientExchange .mini td:nth-child(8),
#yuanRecipientExchange .mini th:nth-child(9),
#yuanRecipientExchange .mini td:nth-child(9),
#yuanRecipientExchange .mini th:nth-child(10),
#yuanRecipientExchange .mini td:nth-child(10){display:none!important;}
`;
  document.head.appendChild(style);
}

function hideCards(){
  const hideTitles=[
    '資料與備份',
    '交易所辨識測試',
    'Console 已調閱資料庫',
    '雙向對手方／交易所調閱中心',
    'Relay 雙向資金第一層追查'
  ];

  for(const h of document.querySelectorAll('h1,h2,h3')){
    const title=(h.textContent||'').replace(/[\s\uFEFF]/g,'').trim();
    if(hideTitles.some(x=>title.includes(x.replace(/[\s\uFEFF]/g,'')))){
      const card=h.closest('.card');
      if(card) card.style.display='none';
    }
  }
}

function apply(){
  addStyle();
  hideCards();
}

apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
