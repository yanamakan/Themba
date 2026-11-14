"use strict";
const {getStatus,verifySepoliaReceipt,createRPC,validHash}=require('../lib/chain-proof.js');
module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex');
  if(req.method!=='GET')return res.status(405).json({error:'METHOD_NOT_ALLOWED'});
  const hash=req.query?.hash||new URL(req.url,'http://localhost').searchParams.get('hash');
  if(!validHash(hash))return res.status(400).json({verified:false,error:'INVALID_HASH'});
  const status=getStatus(process.env);if(!status.verificationConfigured)return res.status(503).json({verified:false,error:'VERIFICATION_NOT_CONFIGURED',message:'Reviewed Sepolia RPC and approved vault address are required.'});
  try{const result=await verifySepoliaReceipt({hash,vault:process.env.THEMBA_SEPOLIA_VAULT_ADDRESS,rpcCall:createRPC(process.env.THEMBA_SEPOLIA_RPC_URL)});return res.status(200).json(result);}
  catch(e){return res.status(502).json({verified:false,error:e.code||'RPC_FAILED',message:'Unable to verify testnet receipt.'});}
};
