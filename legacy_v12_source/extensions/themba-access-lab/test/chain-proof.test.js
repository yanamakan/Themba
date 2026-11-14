"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const p=require('../lib/chain-proof.js');
const hash='0x'+'a'.repeat(64),vault='0x'+'b'.repeat(40),other='0x'+'c'.repeat(40);
function rpc({chain='0xaa36a7',to=vault,status='0x1',block='0x3e8',tip='0x3ea',mined=true}={}){
 return async(method)=>({eth_chainId:chain,eth_getTransactionReceipt:mined?{transactionHash:hash,to,status,blockNumber:block}:null,eth_getTransactionByHash:mined?{hash,to}:null,eth_blockNumber:tip})[method];
}
test('rejects malformed or untrusted transaction identifiers',async()=>{
 assert.equal(p.validHash(hash),true);assert.equal(p.validHash('0x123'),false);assert.equal(p.validAddress(vault),true);
 await assert.rejects(()=>p.verifySepoliaReceipt({hash:'abc',vault,rpcCall:rpc()}),e=>e.code==='INVALID_HASH');
 await assert.rejects(()=>p.verifySepoliaReceipt({hash,vault:'bad',rpcCall:rpc()}),e=>e.code==='VAULT_NOT_CONFIGURED');
});
test('refuses wrong chain and wrong deployed contract',async()=>{
 await assert.rejects(()=>p.verifySepoliaReceipt({hash,vault,rpcCall:rpc({chain:'0x1'})}),e=>e.code==='WRONG_CHAIN');
 const out=await p.verifySepoliaReceipt({hash,vault,rpcCall:rpc({to:other})});assert.equal(out.verified,false);assert.equal(out.code,'WRONG_CONTRACT');
});
test('refuses failed, missing, and insufficient-confirmation receipts',async()=>{
 assert.equal((await p.verifySepoliaReceipt({hash,vault,rpcCall:rpc({status:'0x0'})})).code,'REVERTED');
 assert.equal((await p.verifySepoliaReceipt({hash,vault,rpcCall:rpc({mined:false})})).code,'NOT_MINED');
 assert.equal((await p.verifySepoliaReceipt({hash,vault,rpcCall:rpc({tip:'0x3e8'}),minConfirmations:3})).code,'AWAITING_CONFIRMATIONS');
});
test('verified receipt only proves mined tx to configured vault, NOT approvals or gas sponsorship',async()=>{
 const x=await p.verifySepoliaReceipt({hash,vault,rpcCall:rpc(),minConfirmations:2});assert.equal(x.verified,true);
 assert.equal(x.confirmations,3);assert.equal(x.chainId,11155111);assert.equal(x.payoutPolicyVerified,false);assert.equal(x.gasSponsoredVerified,false);
});
test('sponsorship cannot claim live with no configured services or identity',()=>{
 let status=p.getStatus({});assert.equal(status.paymasterConfigured,false);assert.equal(status.phoneOtpProviderConnected,false);assert.equal(status.receiptVerified,false);
 status=p.getStatus({THEMBA_4337_BUNDLER_URL:'https://bundler.example',THEMBA_4337_PAYMASTER_URL:'https://paymaster.example'});
 assert.equal(status.paymasterConfigured,true);assert.equal(status.gasSponsoredVerified,false);
});
test('read-only provider excludes signing and money-moving RPC methods',async()=>{
 const call=p.createRPC('https://sepolia.example',async()=>({ok:true,json:async()=>({result:'0xaa36a7'})}));
 assert.equal(await call('eth_chainId',[]),'0xaa36a7');
 await assert.rejects(()=>call('eth_sendRawTransaction',[]),e=>e.code==='UNSUPPORTED_METHOD');
});
test('Vercel handlers reject unconfigured proof attempts safely',async()=>{
 const handler=require('../api/verify-sepolia.js');let code=0,val={};const res={setHeader(){},status(n){code=n;return this},json(x){val=x;return this}};
 await handler({method:'GET',url:'/api/verify-sepolia?hash='+hash,query:{hash}},res);
 assert.equal(code,503);assert.equal(val.verified,false);assert.equal(val.error,'VERIFICATION_NOT_CONFIGURED');
});
