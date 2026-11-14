/* Africa's Talking sandbox-compatible inbound USSD adapter.
 * Use only with demonstration data. Production endpoint must verify identity, rate limit,
 * protect callback authenticity, verify settled payments and enforce group permissions.
 */
const gateway=require('../lib/gateway.js');
module.exports = async function handler(req,res) {
  if(req.method!=='POST') {res.setHeader('Allow','POST');return res.status(405).send('POST required');}
  const contentType=String(req.headers['content-type']||'');
  if(!/application\/(x-www-form-urlencoded|json)/i.test(contentType))return res.status(415).send('Unsupported content type');
  let body=req.body||{};
  if(typeof body==='string'){
    if(body.length>2048)return res.status(413).send('Too large');
    try {body=contentType.includes('json')?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));}
    catch {return res.status(400).send('Invalid body');}
  }
  if(!body || typeof body!=='object')return res.status(400).send('Invalid body');
  const output=gateway.handle({text:body.text}); // Deliberately no identity context on this public endpoint
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  return res.status(200).send(output);
};
