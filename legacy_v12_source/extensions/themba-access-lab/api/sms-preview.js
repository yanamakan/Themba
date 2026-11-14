/* Read-only SMS preview. This does not send SMS or receive real phone messages. */
const gateway=require('../lib/gateway.js');
module.exports=async function(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required'});}
  const data=req.body||{};
  const body=typeof data==='string'?(()=>{try{return JSON.parse(data)}catch{return {}}})():data;
  const reply=gateway.smsPreview(body.command,body.lang);
  res.setHeader('Cache-Control','no-store');
  return res.status(200).json({reply,sent:false,verified:false,environment:'simulation',provider:'none'});
};
