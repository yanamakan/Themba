/* Test server, no external services or credentials. */
const http=require('node:http'), fs=require('node:fs'),path=require('node:path');
const gateway=require('./lib/gateway.js');const base=__dirname;
const server=http.createServer(async(req,res)=>{
  if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){res.setHeader('Content-Type','text/html;charset=utf-8');return fs.createReadStream(path.join(base,'index.html')).pipe(res);}
  if(req.url==='/api/health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({version:6,mode:'sandbox-only',repositoryIntegrated:false,personalFinanceApiEnabled:false,paymentsEnabled:false}));}
  if(req.url==='/api/ussd'&&req.method==='POST'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.statusCode=413;return res.end('Too large');}}
    const data=Object.fromEntries(new URLSearchParams(body));res.setHeader('Content-Type','text/plain;charset=utf-8');return res.end(gateway.handle(data));
  }
  if(req.url==='/api/sms-preview'&&req.method==='POST'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.statusCode=413;return res.end('Too large');}}
    let obj={};try{obj=JSON.parse(body)}catch{}res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({reply:gateway.smsPreview(obj.command,obj.lang),sent:false}));
  }
  res.statusCode=404;res.end('Not found');
});
if(require.main===module)server.listen(Number(process.env.PORT)||8078,'127.0.0.1',()=>console.log('Demo http://127.0.0.1:'+(process.env.PORT||8078)));
module.exports=server;
