'use strict';
// Local-only integration sandbox HTTP API. Do not expose this to the internet.
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const {createEngine,DomainError}=require('./engine.js');
function createSandboxServer({dbFile=':memory:',host='127.0.0.1',port=0,root=path.resolve(__dirname,'..')}={}){
 const engine=createEngine(dbFile);
 const noCache={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
 const reply=(res,status,value,contentType='application/json; charset=utf-8')=>{const data=contentType.includes('json')?JSON.stringify(value):value;res.writeHead(status,{'Content-Type':contentType,...noCache});res.end(data);};
 const server=http.createServer(async(req,res)=>{
  try {
   const target=new URL(req.url,'http://localhost');const url=target.pathname;const method=req.method;
   if((method==='GET') && (url==='/'||url==='/sandbox.html'||url==='/index.html')){
      const file=path.join(root,url==='/sandbox.html'?'sandbox/sandbox.html':'index.html');
      return reply(res,200,fs.readFileSync(file,'utf8'),'text/html; charset=utf-8');
   }
   if(method==='GET'&&url==='/sandbox-api/health')return reply(res,200,{mode:'local-simulation',realMoney:false,database:'local-sqlite',authorization:'test-account-bearer',telecom:false,blockchain:false});
   if(!url.startsWith('/sandbox-api/'))return reply(res,404,{error:{code:'NOT_FOUND'}});
   if(method!=='POST'&&method!=='GET')return reply(res,405,{error:{code:'METHOD_NOT_ALLOWED'}});
   const allowedOrigin=req.headers.origin;const localHost=req.headers.host||'';
   if(method!=='GET'&&allowedOrigin){let u;try{u=new URL(allowedOrigin)}catch{};if(!u||u.host!==localHost)return reply(res,403,{error:{code:'ORIGIN_DENIED'}});}
   let body={};if(method==='POST'){
      if(!String(req.headers['content-type']||'').startsWith('application/json'))return reply(res,415,{error:{code:'JSON_REQUIRED'}});
      let size=0,parts=[];for await(const part of req){size+=part.length;if(size>16384)return reply(res,413,{error:{code:'BODY_TOO_LARGE'}});parts.push(part);}
      try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return reply(res,400,{error:{code:'INVALID_JSON'}});}
      if(!body||typeof body!=='object'||Array.isArray(body))return reply(res,400,{error:{code:'INVALID_BODY'}});
   }
   if(method==='POST'&&url==='/sandbox-api/register')return reply(res,201,engine.createUser(body.handle,body.password,body.lang));
   if(method==='POST'&&url==='/sandbox-api/login')return reply(res,200,engine.login(body.handle,body.password));
   const authorization=String(req.headers.authorization||'');const user=engine.authenticate(authorization.startsWith('Bearer ')?authorization.slice(7):null);
   if(method==='GET'&&url==='/sandbox-api/me')return reply(res,200,user);
   if(method==='POST'&&url==='/sandbox-api/logout'){engine.signout(authorization.slice(7));return reply(res,200,{ok:true});}
   if(method==='GET'&&url==='/sandbox-api/circles')return reply(res,200,engine.listCircles(user.id));
   if(method==='GET'&&url==='/sandbox-api/invites')return reply(res,200,engine.listInvites(user.id));
   if(method==='POST'&&url==='/sandbox-api/circles')return reply(res,201,engine.createCircle(user.id,body));
   const seg=url.split('/').filter(Boolean); // sandbox-api/circles/:circleId/...
   if(seg[1]!=='circles'||!seg[2])return reply(res,404,{error:{code:'NOT_FOUND'}});
   const circleId=seg[2],op=seg[3];
   if(method==='GET'&&seg.length===3)return reply(res,200,engine.summary(user.id,circleId));
   if(method==='POST'&&op==='invite')return reply(res,201,engine.invite(user.id,circleId,body));
   if(method==='POST'&&op==='join')return reply(res,200,engine.join(user.id,circleId));
   if(method==='POST'&&op==='contributions'&&seg.length===4)return reply(res,201,engine.report(user.id,circleId));
   if(method==='POST'&&op==='contributions'&&seg.length===6&&seg[5]==='reconcile')return reply(res,200,engine.reconcile(user.id,circleId,seg[4],body.reference));
   if(method==='POST'&&op==='payouts'&&seg.length===4)return reply(res,201,engine.requestPayout(user.id,circleId));
   if(method==='POST'&&op==='payouts'&&seg.length===6&&seg[5]==='vote')return reply(res,200,engine.vote(user.id,circleId,seg[4],body.decision));
   if(method==='POST'&&op==='payouts'&&seg.length===6&&seg[5]==='simulate-finalize')return reply(res,200,engine.simulateFinalize(user.id,circleId,seg[4]));
   if(method==='POST'&&op==='disputes'&&seg.length===4)return reply(res,201,engine.createDispute(user.id,circleId,body.topic,body.reason));
   if(method==='POST'&&op==='disputes'&&seg.length===6&&seg[5]==='resolve')return reply(res,200,engine.resolveDispute(user.id,circleId,seg[4],body.resolution));
   if(method==='GET'&&op==='verify-ledger')return reply(res,200,engine.verifyLedger(user.id,circleId));
   return reply(res,404,{error:{code:'NOT_FOUND'}});
  }catch(e){const code=e instanceof DomainError?e.code:'SERVER_ERROR';const status=e instanceof DomainError?e.status:500;return reply(res,status,{error:{code,message:e instanceof DomainError?e.message:'Unexpected sandbox error'}});}
 });
 return {server,engine,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>resolve(server.address()));}),close:()=>new Promise(resolve=>server.close(()=>{engine.close();resolve();}))};
}
if(require.main===module){const app=createSandboxServer({dbFile:process.env.THEMBA_DEMO_DB||path.join(__dirname,'local-review.sqlite'),port:Number(process.env.PORT||8091)});app.listen().then(a=>console.log(`Themba LOCAL integration sandbox: http://${a.address}:${a.port}/sandbox.html\nNot for public hosting. No real money.`));}
module.exports={createSandboxServer};
