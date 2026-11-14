'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateSafeIntent,signAuditEntry,verifyAuditChain}=require('../server/chain');
const one='0x'+'1'.repeat(40),two='0x'+'2'.repeat(40),safe='0x'+'3'.repeat(40);
const valid={chainId:11155111,safeAddress:safe,owners:[one,two],threshold:2,nonce:1,expiresAt:'2099-01-01T00:00:00Z'};
test('safe preflight accepts well-formed demonstration',()=>assert.equal(validateSafeIntent(valid).ok,true));
test('safe rejects wrong network, duplicate owner and replay',()=>{const r=validateSafeIntent({...valid,chainId:1,owners:[one,one],executedNonces:[1]});assert.equal(r.ok,false);assert.ok(r.errors.length>=3)});
test('safe requires two signers',()=>assert.equal(validateSafeIntent({...valid,threshold:1}).ok,false));
test('audit tampering detectable',()=>{const secret='supersecure'.repeat(5);const e1=signAuditEntry('GENESIS',{type:'demo',amount:10},secret);const e2=signAuditEntry(e1.hash,{type:'confirm'},secret);assert.equal(verifyAuditChain([e1,e2],secret),true);e1.event.amount=999;assert.equal(verifyAuditChain([e1,e2],secret),false)});
