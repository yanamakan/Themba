'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const L=require('../logic.js');
const base=()=>L.createDemoState();const doIt=(s,type,actorId='thabo',groupId='khula',rest={})=>L.applyAction(s,{type,actorId,groupId,...rest});
const is=(code)=>e=>e.code===code;
test('12 official South African language/access options are visible, including SASL',()=>{
  assert.deepEqual(L.LOCALES,['en','af','zu','xh','nso','st','tn','ss','ve','ts','nr','sasl']);
  for(const code of L.LOCALES){const c=L.COPY[code];assert(c.language&&c.menu&&c.help&&c.pending&&c.voice,code+' translation fields');}
});
test('all 12 individual choices save without changing others',()=>{
  for(const code of L.LOCALES){let s=doIt(base(),'SET_LANGUAGE','thabo','khula',{lang:code});assert.equal(s.members[0].lang,code);assert.equal(s.members[1].lang,'zu');assert.ok(L.menuView(s,'khula','thabo',code,'1').includes(L.COPY[code].pending), 'disclaimer in '+code);}
});
test('SASL mode explicitly describes captions not fake signed translation',()=>{let s=doIt(base(),'SET_LANGUAGE','thabo','khula',{lang:'sasl'});assert.match(L.menuView(s,'khula','thabo',null,'HELP'),/signed-video/i);});
test('language SMS menu lists every language and is never silently clipped',()=>{const msg=L.smsReply(base(),'khula','thabo','LANG');assert.match(msg,/12 South African Sign Language/);assert.ok(msg.includes('10 '+L.COPY.ts.language));});
test('equal split distributes remaining cents deterministically',()=>assert.deepEqual(L.splitBill(100,['a','b','c']).map(x=>x.cents),[34,33,33]));
test('percent split preserves the exact sum',()=>{const shares=L.splitBill(101,['a','b','c'],'percentage',[34,33,33]);assert.equal(shares.reduce((n,x)=>n+x.cents,0),101);});
test('fixed shares require matching bill total',()=>assert.throws(()=>L.splitBill(100,['a','b'],'fixed',[30,60]),is('SHARES')));
test('percentage split must equal 100',()=>assert.throws(()=>L.splitBill(100,['a','b'],'percentage',[60,50]),is('SHARES')));
test('bill requires authorized member',()=>assert.throws(()=>doIt(base(),'CREATE_BILL','thabo','khula',{title:'Groceries',totalCents:1000,mode:'equal'}),is('NOT_SIGNER')));
test('bill creation and member share simulation do not touch rotation or reserve',()=>{
  let s=doIt(base(),'CREATE_BILL','lerato','khula',{title:'Groceries',totalCents:10001,mode:'equal'});
  assert.equal(s.bills[0].shares.reduce((n,x)=>n+x.cents,0),10001);
  s=doIt(s,'SIMULATE_BILL_SHARE','thabo','khula',{billId:s.bills[0].id});
  assert.equal(s.groups[0].rotationCents,250000);assert.equal(s.groups[0].reserveCents,25000);
  assert.equal(s.bills[0].shares[0].status,'simulated_settled');
  assert.throws(()=>doIt(s,'SIMULATE_BILL_SHARE','thabo','khula',{billId:s.bills[0].id}),is('DUPLICATE_SHARE'));
});
test('group bill cannot be paid from another group',()=>{const s=doIt(base(),'CREATE_BILL','lerato','khula',{title:'Groceries',totalCents:10000});assert.throws(()=>doIt(s,'SIMULATE_BILL_SHARE','lerato','ubuntu',{billId:s.bills[0].id}),is('BILL_NOT_FOUND'));});
test('loan review requires distinct signers and cannot self-approve',()=>{
  let s=doIt(base(),'REQUEST_LOAN','thabo','khula',{principalCents:12000});const id=s.loans[0].id;
  assert.throws(()=>doIt(s,'APPROVE_LOAN','thabo','khula',{loanId:id}),is('NOT_SIGNER'));
  s=doIt(s,'APPROVE_LOAN','lerato','khula',{loanId:id});assert.equal(s.loans[0].status,'pending');
  assert.throws(()=>doIt(s,'APPROVE_LOAN','lerato','khula',{loanId:id}),is('DUPLICATE_VOTE'));
  s=doIt(s,'APPROVE_LOAN','sipho','khula',{loanId:id});assert.equal(s.loans[0].status,'approved_records_only');
  assert.equal(s.loans[0].owedCents,0);assert.equal(s.groups[0].rotationCents,250000);
});
test('loan requester cannot approve even if in signer set',()=>{let s=doIt(base(),'REQUEST_LOAN','lerato','khula',{principalCents:2000});assert.throws(()=>doIt(s,'APPROVE_LOAN','lerato','khula',{loanId:s.loans[0].id}),is('SELF_APPROVAL'));});
test('loan requests cannot be sent for another group by outsider',()=>assert.throws(()=>doIt(base(),'REQUEST_LOAN','zola','khula',{principalCents:1234}),is('OUTSIDER')));
test('rules acknowledgements per cycle cannot be duplicated',()=>{let s=doIt(base(),'ACK_GROUP_RULES');assert.equal(s.acknowledgements.length,1);assert.throws(()=>doIt(s,'ACK_GROUP_RULES'),is('ALREADY_ACKNOWLEDGED'));});
test('dispute must have a reason and remain in group',()=>{
  assert.throws(()=>doIt(base(),'FILE_DISPUTE','thabo','khula',{subject:'general',reason:'short'}),is('REASON_REQUIRED'));
  let s=doIt(base(),'FILE_DISPUTE','thabo','khula',{subject:'cash',reason:'Reported cash not received'});
  const d=s.disputes[0];assert.equal(d.status,'open');
  assert.throws(()=>doIt(s,'RESOLVE_DISPUTE','lerato','ubuntu',{disputeId:d.id,decision:'Reviewed the record'}),is('DISPUTE_NOT_FOUND'));
  assert.throws(()=>doIt(s,'RESOLVE_DISPUTE','thabo','khula',{disputeId:d.id,decision:'Reviewed the record'}),is('NOT_INDEPENDENT'));
  s=doIt(s,'RESOLVE_DISPUTE','lerato','khula',{disputeId:d.id,decision:'Reviewed and corrected in next entry'});
  assert.equal(s.disputes[0].status,'resolved_demo');assert.equal(s.disputes[0].reason,'Reported cash not received');
});
test('payout demo settlement requires signer as well as two approvals',()=>{
  let s=doIt(base(),'CREATE_PAYOUT'),id=s.payouts[0].id;s=doIt(s,'APPROVE_PAYOUT','lerato','khula',{requestId:id});s=doIt(s,'APPROVE_PAYOUT','sipho','khula',{requestId:id});
  assert.throws(()=>doIt(s,'SIMULATE_SETTLEMENT','thabo','khula',{requestId:id}),is('NOT_SIGNER'));
  assert.equal(s.groups[0].reserveCents,25000);
});
test('blocked attempt audit is demo-only and does not alter financial balances',()=>{
  let s=base();s=L.recordBlockedDemoAttempt(s,{groupId:'khula',actorId:'thabo',code:'SELF_APPROVAL'});
  assert.equal(s.alerts.length,1);assert.equal(s.alerts[0].status,'DEMO_ONLY');assert.equal(s.groups[0].rotationCents,250000);assert.equal(s.groups[0].reserveCents,25000);
  assert.match(L.smsReply(s,'khula','thabo','ALERTS'),/1/);
  assert.throws(()=>L.recordBlockedDemoAttempt(s,{groupId:'khula',actorId:'thabo',code:'FIAT_TRANSFER_SUCCESS'}),is('ALERT_TYPE'));
});
test('payout policy simulator never changes funds or claims guaranteed protection',()=>{
  let s=base();const full=L.payoutPolicyPreview(s,'khula','full'),staged=L.payoutPolicyPreview(s,'khula','staged'),deferred=L.payoutPolicyPreview(s,'khula','save-first');
  assert.deepEqual([full.immediateCents,staged.immediateCents,staged.heldCents,deferred.immediateCents],[250000,150000,100000,0]);
  assert.match(staged.disclaimer,/illustration/i);assert.equal(s.groups[0].rotationCents,250000);
  assert.throws(()=>L.payoutPolicyPreview(s,'khula','guaranteed'),is('POLICY'));
});
