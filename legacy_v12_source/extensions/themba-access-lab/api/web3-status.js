"use strict";
const {getStatus}=require('../lib/chain-proof.js');
module.exports=(req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
  if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  res.status(200).json(getStatus(process.env));
};
