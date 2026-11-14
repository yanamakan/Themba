'use strict';
const express=require('express');
const {quoteLoan,activitySignals,inflationTarget,validateGuarantor}=require('./finance');
const {validateSafeIntent}=require('./chain');
module.exports=function createRouter(){
 const router=express.Router(); router.use(express.json({limit:'8kb'}));
 router.get('/health',(_req,res)=>res.json({status:'ok',mode:'simulation',transfersEnabled:false,insuranceEnabled:false}));
 const endpoints={'/loan/quote':quoteLoan,'/activity/summary':activitySignals,'/savings/inflation':inflationTarget,'/guarantor/precheck':validateGuarantor,'/safe/preflight':validateSafeIntent};
 for(const [route,fn] of Object.entries(endpoints)) router.post(route,(req,res)=>{try{if(!req.body||Array.isArray(req.body)||typeof req.body!=='object')throw new Error('Object payload required');res.set('Cache-Control','no-store');res.json({data:fn(req.body),simulation:true});}catch(error){res.status(400).json({error:{code:'INVALID_INPUT',message:error.message}});}});
 router.all('*',(_req,res)=>res.status(404).json({error:{code:'NOT_FOUND',message:'Demo API endpoint not found'}}));
 return router;
};
