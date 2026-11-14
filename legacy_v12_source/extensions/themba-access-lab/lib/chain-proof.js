"use strict";
/* The proof reader is always read-only. It never signs, sends, sponsors, or moves tokens. */
const HASH=/^0x[0-9a-fA-F]{64}$/;
const ADDR=/^0x[0-9a-fA-F]{40}$/;
const SEPOLIA=11155111;
class ProofError extends Error {constructor(code,message){super(message||code);this.code=code;}}
function validHash(hash){return typeof hash==='string'&&HASH.test(hash);}
function validAddress(address){return typeof address==='string'&&ADDR.test(address);}
function getStatus(env={}){
  const vault=env.THEMBA_SEPOLIA_VAULT_ADDRESS||'';
  const rpc=env.THEMBA_SEPOLIA_RPC_URL||'';
  const bundler=env.THEMBA_4337_BUNDLER_URL||'';
  const paymaster=env.THEMBA_4337_PAYMASTER_URL||'';
  // URL configuration never proves gas was sponsored or a transaction executed.
  return Object.freeze({chainId:SEPOLIA,mode:'testnet-only',tokenCustody:'not-connected',contractConfigured:validAddress(vault),
    verificationConfigured:validAddress(vault)&&/^https:\/\//.test(rpc),
    paymasterConfigured:/^https:\/\//.test(bundler)&&/^https:\/\//.test(paymaster),
    phoneOtpProviderConnected:false,whatsappProviderConnected:false,livePaymentsEnabled:false,
    receiptVerified:false,gasSponsoredVerified:false});
}
async function verifySepoliaReceipt({hash,vault,rpcCall,minConfirmations=1}={}){
  if(!validHash(hash))throw new ProofError('INVALID_HASH','Provide a 0x-prefixed 32-byte transaction hash.');
  if(!validAddress(vault))throw new ProofError('VAULT_NOT_CONFIGURED','A reviewed deployed contract address must be configured by the team.');
  if(typeof rpcCall!=='function')throw new ProofError('RPC_UNAVAILABLE','Trusted Sepolia RPC is not configured.');
  const [chainHex,receipt,tx,latest]=await Promise.all([
    rpcCall('eth_chainId',[]),rpcCall('eth_getTransactionReceipt',[hash]),rpcCall('eth_getTransactionByHash',[hash]),rpcCall('eth_blockNumber',[])
  ]);
  if(Number.parseInt(chainHex,16)!==SEPOLIA)throw new ProofError('WRONG_CHAIN','RPC is not on Ethereum Sepolia.');
  if(!receipt||!tx)return {verified:false,code:'NOT_MINED',message:'Transaction is not mined or could not be found on Sepolia.'};
  if(String(receipt.transactionHash).toLowerCase()!==hash.toLowerCase()||String(tx.hash).toLowerCase()!==hash.toLowerCase())
    throw new ProofError('MISMATCH','Receipt does not match requested transaction.');
  if(String(tx.to||'').toLowerCase()!==vault.toLowerCase()||String(receipt.to||'').toLowerCase()!==vault.toLowerCase())
    return {verified:false,code:'WRONG_CONTRACT',message:'Transaction did not target the team-approved vault.'};
  if(receipt.status!=='0x1')return {verified:false,code:'REVERTED',message:'Transaction failed on Sepolia.'};
  const block=Number.parseInt(receipt.blockNumber,16),tip=Number.parseInt(latest,16);
  if(!Number.isSafeInteger(block)||!Number.isSafeInteger(tip)||block>tip)return {verified:false,code:'INVALID_BLOCK',message:'Block height is invalid.'};
  const confirmations=tip-block+1;
  if(confirmations<minConfirmations)return {verified:false,code:'AWAITING_CONFIRMATIONS',confirmations};
  return {verified:true,chainId:SEPOLIA,hash,blockNumber:block,confirmations,
    vault,execution:'mined_success',
    // The receipt alone does NOT prove that the tx was a payout, that it had two approvers, or that gas was sponsored.
    payoutPolicyVerified:false,gasSponsoredVerified:false,
    message:'Mined transaction to the configured vault. Approval rules and gas sponsorship still require decoded logs and contract-level review.'};
}
function createRPC(endpoint,fetcher=globalThis.fetch){
  if(typeof endpoint!=='string'||!/^https:\/\//.test(endpoint))throw new ProofError('RPC_UNAVAILABLE','Trusted HTTPS RPC required.');
  if(typeof fetcher!=='function')throw new ProofError('RPC_UNAVAILABLE','Fetch not available');
  return async(method,params)=>{
    if(!['eth_chainId','eth_getTransactionReceipt','eth_getTransactionByHash','eth_blockNumber'].includes(method))throw new ProofError('UNSUPPORTED_METHOD','Read-only methods only');
    const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),5000);
    try{const res=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:ctrl.signal});
      if(!res.ok)throw new ProofError('RPC_ERROR','RPC HTTP '+res.status);
      const body=await res.json();if(body.error||!Object.hasOwn(body,'result'))throw new ProofError('RPC_ERROR','Invalid RPC response');return body.result;
    }finally{clearTimeout(timeout);}
  };
}
module.exports={validHash,validAddress,getStatus,verifySepoliaReceipt,createRPC,ProofError,SEPOLIA};
