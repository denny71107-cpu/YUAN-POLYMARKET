(()=>{'use strict';
const STYLE_ID='yuan-hide-exchange-columns';
function apply(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
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
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();
