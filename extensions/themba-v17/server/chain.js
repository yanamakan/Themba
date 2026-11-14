'use strict';
const crypto=require('node:crypto');
const ADDRESS=/^0x[0-9a-fA-F]{40}$/;
function validateSafeIntent({chainId,safeAddress,owners,threshold,nonce,expiresAt,alreadyExecuted=false,executedNonces=[]}, expectedChainId=11155111) {
 const errors=[];
 if(!Number.isSafeInteger(chainId)||chainId!==expectedChainId) errors.push('Network mismatch: expected Sepolia chain 11155111');
 if(typeof safeAddress!=='string'||!ADDRESS.test(safeAddress)) errors.push('Invalid Safe address');
 if(!Array.isArray(owners)||owners.length<2||owners.length>30||owners.some(x=>typeof x!=='string'||!ADDRESS.test(x))) errors.push('Owners must be valid EVM addresses');
 else if(new Set(owners.map(x=>x.toLowerCase())).size!==owners.length) errors.push('Duplicate owner');
 if(!Number.isInteger(threshold)||threshold<2||!Array.isArray(owners)||threshold>owners.length) errors.push('At least two distinct signers required');
 if(!Number.isSafeInteger(nonce)||nonce<0||executedNonces.includes(nonce)||alreadyExecuted) errors.push('Nonce invalid or previously executed');
 if(!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.now()) errors.push('Intent expired');
 return {ok:errors.length===0,errors,notice:'Local preflight only: verify real owners, threshold, nonce and execution state against Safe contracts on trusted RPC, simulate and obtain independent signatures.'};
}
function signAuditEntry(prevHash,event,secret) {
 if(typeof secret!=='string'||secret.length<32) throw new Error('Provide a 32+ character server-side audit secret');
 if(typeof prevHash!=='string'||!(/^[a-f0-9]{64}$/.test(prevHash)||prevHash==='GENESIS')) throw new Error('Invalid previous hash');
 if(!event||typeof event!=='object'||Array.isArray(event)) throw new Error('Invalid audit event');
 const payload=JSON.stringify({prevHash,event});
 const hash=crypto.createHmac('sha256',secret).update(payload).digest('hex');
 return {prevHash,event:JSON.parse(JSON.stringify(event)),hash};
}
function verifyAuditChain(entries,secret) {
 if(!Array.isArray(entries)) return false;
 let previous='GENESIS';
 for(const entry of entries){if(!entry||entry.prevHash!==previous) return false;const candidate=signAuditEntry(previous,entry.event,secret);if(!crypto.timingSafeEqual(Buffer.from(candidate.hash,'hex'),Buffer.from(String(entry.hash).padEnd(64,'0').slice(0,64),'hex'))) return false;previous=entry.hash;}
 return true;
}
module.exports={validateSafeIntent,signAuditEntry,verifyAuditChain};
