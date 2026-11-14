'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const base=path.resolve(__dirname,'..');const auth=fs.readFileSync(path.join(base,'scripts/auth.js'),'utf8');
const snippet=auth.match(/^[ \t]*let redeemingInvite = null;[\s\S]*?^[ \t]*\}\r?\n\r?\n[ \t]*\/\/ Already authenticated/m);
assert.ok(snippet,'Invitations should have an idempotent async redemption helper');
function fixture(outcome){const store=new Map([['pending_invite','code-123']]);const calls=[],toasts=[];
  const context={sessionStorage:{getItem:k=>store.get(k)||null,removeItem:k=>store.delete(k)},sb:{rpc:async(name,args)=>{calls.push({name,args});return outcome}},toast:(...a)=>toasts.push(a)};
  vm.createContext(context);vm.runInContext(snippet[0].replace(/\n\s*\/\/ Already authenticated$/,'')+'\nthis.redeem=redeemPendingInvite;',context);
  return {context,store,calls,toasts};}
test('existing account accepts invite without signing up again',async()=>{const f=fixture({error:null,data:true});assert.equal(await f.context.redeem(),true);assert.equal(f.store.has('pending_invite'),false);assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'accept_invite');assert.equal(f.calls[0].args.p_token,'code-123');});
test('failed invite is preserved for retry',async()=>{const f=fixture({error:{message:'Expired'}});assert.equal(await f.context.redeem(),false);assert.equal(f.store.get('pending_invite'),'code-123');assert.match(f.toasts[0][0],/could not be accepted/);});
test('negative result without SQL error must not clear invitation',async()=>{const f=fixture({data:{ok:false},error:null});assert.equal(await f.context.redeem(),false);assert.equal(f.store.get('pending_invite'),'code-123');});
test('parallel attempts share one request',async()=>{const f=fixture({data:true,error:null});const [a,b]=await Promise.all([f.context.redeem(),f.context.redeem()]);assert.equal(a,true);assert.equal(b,true);assert.equal(f.calls.length,1);});
test('login redeems with current account, not via a second signup',()=>{assert.match(auth,/signInWithPassword/);assert.match(auth,/await redeemPendingInvite\(\)/);assert.doesNotMatch(auth,/join_stokvel_with_code/);});
test('invite form emails via the backend and keeps the private-link fallback on the authenticated RPC',()=>{const live=fs.readFileSync(path.join(base,'scripts/live-data.js'),'utf8');const client=fs.readFileSync(path.join(base,'scripts/supabase-client.js'),'utf8');assert.match(live,/api\.sendInvitation/);assert.match(client,/rpc\("invite_member"/);assert.match(client,/new URL\("login\.html"/);});
test('dashboard invitation modal blocks stale duplicate handler',()=>{const html=fs.readFileSync(path.join(base,'dashboards/members-dashboard.html'),'utf8');assert.match(html,/event\.stopImmediatePropagation\(\)/);assert.match(html,/\}, true\);/);assert.doesNotMatch(html,/fetch\('\/api\/send-invite'/);});
test('unauthenticated email endpoint is disabled by default',()=>{const server=fs.readFileSync(path.join(base,'src/server.js'),'utf8');assert.match(server,/return res\.status\(503\)/);});

test('signed-in users redeem from either login or legacy signup links without registration', async () => {
  const code=auth.match(/  if \(sb && \(page === 'login'[\s\S]*?\n  }\n\n  async function realSubmit/)[0].replace(/\n\n  async function realSubmit$/,'');
  for (const page of ['login','signup']) {
    const calls=[];
    const context={page,sb:{auth:{getSession:async()=>({data:{session:{user:{id:'existing-user'}}}})}},sessionStorage:{getItem:()=> 'invite'},redeemPendingInvite:async()=>calls.push('redeem'),buildSession:async u=>u,goToDashboard:u=>calls.push(u.id),console};
    vm.createContext(context);vm.runInContext(code,context);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls,['redeem','existing-user']);
  }
});
