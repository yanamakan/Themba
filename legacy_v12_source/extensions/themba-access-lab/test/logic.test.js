'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const L=require('../logic.js');
const base=()=>L.createDemoState();
const A=(s,type,actorId='thabo',groupId='khula',rest={})=>L.applyAction(s,{type,actorId,groupId,...rest});
const payout=s=>s.payouts[0];
function request(){return A(base(),'CREATE_PAYOUT');}
function approved(){let s=request();const id=payout(s).id;s=A(s,'APPROVE_PAYOUT','lerato','khula',{requestId:id});s=A(s,'APPROVE_PAYOUT','sipho','khula',{requestId:id});return s;}
function is(code){return e=>e.code===code;}
function afterCycleOne(){const s=approved();return A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:payout(s).id});}
test('seed model is clearly labelled as simulated',()=>{const s=base();assert.equal(s.version,6);assert.equal(s.groups[0].rotationCents,250000);assert.equal(s.groups[0].reserveCents,25000);assert.equal(s.contributions[0].status,'simulated_verified');});
test('risk projection calculates future unpaid and uncovered exposure',()=>{const r=L.riskSummary(base(),'khula');assert.deepEqual([r.futureRounds,r.potentialMissedCents,r.reserveCoverCents,r.uncoveredCents],[4,200000,25000,175000]);});
test('request only from scheduled recipient',()=>assert.throws(()=>A(base(),'CREATE_PAYOUT','lerato'),is('NOT_RECIPIENT')));
test('scheduled recipient creates exactly one pending request',()=>{const s=request();assert.equal(payout(s).status,'pending');assert.equal(payout(s).amountCents,250000);assert.equal(s.groups[0].rotationCents,250000);});
test('duplicate request for a cycle refused',()=>assert.throws(()=>A(request(),'CREATE_PAYOUT'),is('DUPLICATE_PAYOUT')));
test('outsider cannot create a payout in another group',()=>assert.throws(()=>A(base(),'CREATE_PAYOUT','zola'),is('OUTSIDER')));
test('recipient cannot approve own payout',()=>{let s=request();s.groups[0].signerIds.push('thabo');assert.throws(()=>A(s,'APPROVE_PAYOUT','thabo','khula',{requestId:payout(s).id}),is('SELF_APPROVAL'));});
test('unauthorized non-signer cannot vote',()=>{const s=request();assert.throws(()=>A(s,'APPROVE_PAYOUT','neo','khula',{requestId:payout(s).id}),is('NOT_SIGNER'));});
test('one approval is not enough',()=>{const s=request(),id=payout(s).id;const n=A(s,'APPROVE_PAYOUT','lerato','khula',{requestId:id});assert.equal(payout(n).status,'pending');assert.equal(n.groups[0].rotationCents,250000);});
test('two distinct non-requester approvals authorize, not transfer',()=>{const s=approved();assert.equal(payout(s).status,'authorized_demo');assert.deepEqual(payout(s).approvals,['lerato','sipho']);assert.equal(s.groups[0].rotationCents,250000);});
test('duplicate approval refused',()=>{const s=request(),id=payout(s).id;const one=A(s,'APPROVE_PAYOUT','lerato','khula',{requestId:id});assert.throws(()=>A(one,'APPROVE_PAYOUT','lerato','khula',{requestId:id}),is('DUPLICATE_VOTE'));});
test('approval in a different group refused',()=>{const s=request();assert.throws(()=>A(s,'APPROVE_PAYOUT','zola','ubuntu',{requestId:payout(s).id}),is('REQUEST_NOT_FOUND'));});
test('settlement without 2 approvals refused',()=>{const s=request();assert.throws(()=>A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:payout(s).id}),is('NOT_AUTHORIZED'));});
test('settlement deducts only rotation pot, never protection reserve',()=>{const s=approved(),id=payout(s).id;const n=A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:id});assert.equal(n.groups[0].rotationCents,0);assert.equal(n.groups[0].reserveCents,25000);assert.equal(n.groups[0].cycle,2);assert.equal(payout(n).status,'simulated_settled');});
test('settlement cannot be replayed',()=>{const s=approved(),id=payout(s).id;const n=A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:id});assert.throws(()=>A(n,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:id}),is('NOT_AUTHORIZED'));});
test('insufficient rotation pot refuses request',()=>{const s=base();s.groups[0].rotationCents=249999;assert.throws(()=>A(s,'CREATE_PAYOUT'),is('INSUFFICIENT_ROTATION'));});
test('insufficient rotation pot refuses settlement after authorization',()=>{const s=approved();s.groups[0].rotationCents=0;assert.throws(()=>A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:payout(s).id}),is('INSUFFICIENT_ROTATION'));});
test('rejection includes reason and blocks subsequent approval',()=>{const s=request(),id=payout(s).id;const n=A(s,'REJECT_PAYOUT','lerato','khula',{requestId:id,reason:'Need to check the contribution'});assert.equal(payout(n).status,'rejected');assert.throws(()=>A(n,'APPROVE_PAYOUT','sipho','khula',{requestId:id}),is('NOT_PENDING'));});
test('rejection without reason refused',()=>{const s=request();assert.throws(()=>A(s,'REJECT_PAYOUT','lerato','khula',{requestId:payout(s).id,reason:''}),is('REASON_REQUIRED'));});
test('group funds are isolated',()=>{const s=approved(),id=payout(s).id;const n=A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:id});assert.equal(n.groups[1].rotationCents,90000);assert.equal(n.groups[1].reserveCents,9000);});
test('next cycle requires new contributions',()=>{let s=approved();s=A(s,'SIMULATE_SETTLEMENT','lerato','khula',{requestId:payout(s).id});assert.throws(()=>A(s,'CREATE_PAYOUT','lerato'),is('INSUFFICIENT_ROTATION'));for(const id of s.groups[0].memberIds)s=A(s,'SIMULATE_CONTRIBUTION',id);s=A(s,'CREATE_PAYOUT','lerato');assert.equal(s.payouts[1].cycle,2);});
test('duplicate contribution per cycle refused',()=>assert.throws(()=>A(base(),'SIMULATE_CONTRIBUTION'),is('DUPLICATE_CONTRIBUTION')));
test('cash claim does not immediately add group balance',()=>{const s=afterCycleOne(),n=A(s,'LOG_CASH_CLAIM','lerato','khula',{targetId:'thabo'});assert.equal(n.cashClaims[0].status,'awaiting_member');assert.equal(n.groups[0].rotationCents,0);assert.equal(n.groups[0].reserveCents,25000);});
test('cash claim requires different member from logger',()=>assert.throws(()=>A(afterCycleOne(),'LOG_CASH_CLAIM','lerato','khula',{targetId:'lerato'}),is('SEPARATE_CONFIRMATION')));
test('cash confirmation only by named member',()=>{const n=A(afterCycleOne(),'LOG_CASH_CLAIM','lerato','khula',{targetId:'thabo'});assert.throws(()=>A(n,'CONFIRM_CASH','neo','khula',{claimId:n.cashClaims[0].id}),is('NOT_OWNER'));});
test('cash confirmation does not claim settlement or add balance',()=>{let s=A(afterCycleOne(),'LOG_CASH_CLAIM','lerato','khula',{targetId:'thabo'});s=A(s,'CONFIRM_CASH','thabo','khula',{claimId:s.cashClaims[0].id});assert.equal(s.cashClaims[0].status,'awaiting_reconciliation');assert.equal(s.groups[0].rotationCents,0);});
test('cash reconciliation requires member confirmation',()=>{const s=A(afterCycleOne(),'LOG_CASH_CLAIM','lerato','khula',{targetId:'thabo'});assert.throws(()=>A(s,'SIMULATE_CASH_RECONCILIATION','sipho','khula',{claimId:s.cashClaims[0].id}),is('NOT_RECONCILABLE'));});
test('disputed cash claim cannot be reconciled',()=>{let s=A(afterCycleOne(),'LOG_CASH_CLAIM','lerato','khula',{targetId:'thabo'});s=A(s,'DISPUTE_CASH','thabo','khula',{claimId:s.cashClaims[0].id});assert.throws(()=>A(s,'SIMULATE_CASH_RECONCILIATION','sipho','khula',{claimId:s.cashClaims[0].id}),is('NOT_RECONCILABLE'));});
test('duplicate confirmed contribution blocks mock cash reconciliation',()=>{let s=A(afterCycleOne(),'LOG_CASH_CLAIM','lerato','khula',{targetId:'thabo'});s=A(s,'CONFIRM_CASH','thabo','khula',{claimId:s.cashClaims[0].id});s=A(s,'SIMULATE_CONTRIBUTION','thabo');assert.throws(()=>A(s,'SIMULATE_CASH_RECONCILIATION','sipho','khula',{claimId:s.cashClaims[0].id}),is('DUPLICATE_CONTRIBUTION'));});
test('language preference is per member',()=>{const s=base(),n=A(s,'SET_LANGUAGE','thabo','khula',{lang:'xh'});assert.equal(n.members.find(m=>m.id==='thabo').lang,'xh');assert.equal(n.members.find(m=>m.id==='lerato').lang,'zu');});
test('unsupported language refused',()=>assert.throws(()=>A(base(),'SET_LANGUAGE','thabo','khula',{lang:'xx'}),is('LANGUAGE')));
test('SMS BAL and USSD 3 are localized and demo-labelled',()=>{const s=base();assert.match(L.smsReply(s,'khula','lerato','BAL','zu'),/R\s?2.500|R2\s?500/);assert.match(L.menuView(s,'khula','lerato','en','3'),/Thabo/);assert.match(L.menuView(s,'khula','lerato','en','1'),/simulation/i);});
test('SMS segment estimator accounts for Unicode',()=>{assert.deepEqual(L.smsSegments('A'.repeat(161)).segments,2);assert.equal(L.smsSegments('isiXhosa – Themba').encoding,'Unicode (conservative estimate)');});
test('invalid group and identity rejected',()=>{assert.throws(()=>A(base(),'CREATE_PAYOUT','thabo','madeup'),is('GROUP_NOT_FOUND'));assert.throws(()=>A(base(),'CREATE_PAYOUT','fake'),is('MEMBER_NOT_FOUND'));});
test('pure changes do not mutate original input',()=>{const s=base();A(s,'CREATE_PAYOUT');assert.equal(s.payouts.length,0);});

test('rejected payout allows a fresh request but never rewrites old rejection',()=>{let s=request();let id=payout(s).id;s=A(s,'REJECT_PAYOUT','lerato','khula',{requestId:id,reason:'Recheck records'});s=A(s,'CREATE_PAYOUT');assert.equal(s.payouts.length,2);assert.equal(s.payouts[0].status,'rejected');assert.equal(s.payouts[1].status,'pending');});
