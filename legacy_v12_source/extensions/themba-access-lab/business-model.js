/* Themba business model: projections, NOT actual receipts or validated forecasts. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.ThembaBusiness=api})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';function ensure(n,min,max,k){if(!Number.isFinite(n)||n<min||n>max)throw Error(k+' must be between '+min+' and '+max);return n}
function project({groups=5000,paidPercent=20,plusShare=2/3,plusPrice=99,proPrice=249,costPaid=20,costFree=3,monthlyFixed=100000}={}){
 ensure(groups,0,1000000,'Groups');ensure(paidPercent,0,100,'Paying share');ensure(plusShare,0,1,'Plus share');for(const [k,v] of Object.entries({plusPrice,proPrice,costPaid,costFree,monthlyFixed}))ensure(v,0,1e9,k);
 const paid=Math.round(groups*paidPercent/100),free=groups-paid,plus=Math.round(paid*plusShare),pro=paid-plus;
 const mrr=plus*plusPrice+pro*proPrice,variable=paid*costPaid+free*costFree,monthlyResult=mrr-variable-monthlyFixed;
 const perActive=(paidPercent/100)*(plusShare*plusPrice+(1-plusShare)*proPrice-costPaid)-(1-paidPercent/100)*costFree;
 const breakEvenGroups=perActive>0?Math.ceil(monthlyFixed/perActive):null;
 return {groups,paid,free,plus,pro,mrr,variable,monthlyResult,annualizedRevenue:mrr*12,annualizedResult:monthlyResult*12,breakEvenGroups,perActive};
}return Object.freeze({project});});
