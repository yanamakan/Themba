const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../logic.js'), G=require('../lib/gateway.js');
const setup=(names=['Ada','Bola','Chioma','Dayo'])=>L.createConfiguredDemoState({name:'New Circle',members:names,contributionCents:35000,reserveContributionCents:1750});
const apply=(s,type,actor,rest={})=>L.applyAction(s,{type,actorId:actor,groupId:'demo-circle',...rest});
test('custom group starts empty and uses exactly user-configured contribution amounts',()=>{
 const s=setup();assert.equal(s.groups[0].rotationCents,0);assert.equal(s.groups[0].reserveCents,0);
 assert.equal(s.groups[0].contributionCents,35000);assert.equal(s.groups[0].reserveContributionCents,1750);
 assert.deepEqual(s.members.map(x=>x.name),['Ada','Bola','Chioma','Dayo']);
});
test('configured contributions calculate dynamic pot and reserve totals',()=>{
 let s=setup();s=apply(s,'SIMULATE_CONTRIBUTION','demo-person-1');assert.equal(s.groups[0].rotationCents,35000);assert.equal(s.groups[0].reserveCents,1750);
 s=apply(s,'SIMULATE_CONTRIBUTION','demo-person-2');assert.equal(s.groups[0].rotationCents,70000);assert.equal(s.groups[0].reserveCents,3500);
});
test('configured data rejects untrusted numbers or duplicate member names',()=>{
 assert.throws(()=>L.createConfiguredDemoState({name:'Group',members:['A','B','C'],contributionCents:300,reserveContributionCents:1}));
 assert.throws(()=>L.createConfiguredDemoState({name:'Group',members:['Ada','ADA','Chioma'],contributionCents:300,reserveContributionCents:1}));
 assert.throws(()=>L.createConfiguredDemoState({name:'Group',members:['Ada','Bola','Chioma'],contributionCents:1.5,reserveContributionCents:1}));
});
test('custom circle cannot request payout while insufficiently funded',()=>{
 const s=setup(); assert.throws(()=>apply(s,'CREATE_PAYOUT','demo-person-1'), e=>e.code==='INSUFFICIENT_ROTATION');
});
test('custom circle payout needs two independent signers, no self approval',()=>{
 let s=setup(['Ada','Bola','Chioma']);
 for(let i=1;i<=3;i++)s=apply(s,'SIMULATE_CONTRIBUTION','demo-person-'+i);
 s=apply(s,'CREATE_PAYOUT','demo-person-1');const id=s.payouts[0].id;
 assert.throws(()=>apply(s,'APPROVE_PAYOUT','demo-person-1',{requestId:id}),e=>e.code==='SELF_APPROVAL');
 s=apply(s,'APPROVE_PAYOUT','demo-person-2',{requestId:id});assert.equal(s.payouts[0].status,'pending');
 s=apply(s,'APPROVE_PAYOUT','demo-person-3',{requestId:id});assert.equal(s.payouts[0].status,'authorized_demo');
 s=apply(s,'SIMULATE_SETTLEMENT','demo-person-2',{requestId:id});assert.equal(s.groups[0].rotationCents,0);
 assert.equal(s.groups[0].reserveCents,5250);
});
test('browser demo USSD derives amounts from state not gateway literals',()=>{
 let s=setup();s=apply(s,'SIMULATE_CONTRIBUTION','demo-person-1');
 const view=G.demoSnapshot(s,'demo-circle','demo-person-1');
 assert.match(G.handle({text:'1'},view),/R\s?350/);assert.match(G.handle({text:'4'},view),/R\s?17/);
 assert.match(G.handle({text:'3'},view),/Ada/);
 s=apply(s,'SIMULATE_CONTRIBUTION','demo-person-2');const nextView=G.demoSnapshot(s,'demo-circle','demo-person-1');
 assert.notEqual(G.handle({text:'1'},view),G.handle({text:'1'},nextView));
});
test('public gateway and SMS do not disclose any group amounts or names',()=>{
 const u=G.handle({text:'1'}),m=G.smsPreview('BAL');
 assert.doesNotMatch(u,/R\s*\d|Ada|Bola|Thabo/);
 assert.doesNotMatch(m,/R\s*\d|Ada|Bola|Thabo/);
 assert.match(u,/secure application/i);
});
test('cannot use a forged snapshot from the HTTP request body',()=>{
 const attack={text:'1',rotationCents:100000000,mode:'local-demo',nextRecipient:'admin'};
 assert.doesNotMatch(G.handle(attack),/R\s*\d|admin/);
});
test('gateway refuses snapshots for strangers',()=>{
 assert.throws(()=>G.demoSnapshot(setup(),'demo-circle','stranger'));
});
test('staged payout percentage is configurable and does not move funds',()=>{
 const s=setup();const a=L.payoutPolicyPreview(s,'demo-circle','staged',20),b=L.payoutPolicyPreview(s,'demo-circle','staged',80);
 assert.equal(a.amountCents,b.amountCents);assert.equal(a.immediateCents*4,b.immediateCents);
 assert.equal(s.groups[0].rotationCents,0);
 assert.throws(()=>L.payoutPolicyPreview(s,'demo-circle','staged',101),e=>e.code==='PERCENT');
});
test('all 12 language options remain supported on safe public menus',()=>{
 for(let i=1;i<=12;i++){const path=i<=7?'0*'+i:'0*8*'+(i-7);assert.match(G.handle({text:path}),/^CON /)}
});
