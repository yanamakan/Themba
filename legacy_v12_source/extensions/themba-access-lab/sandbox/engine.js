'use strict';
// Local integration sandbox: trusted server operations. No real money, payments or contracts.
const {DatabaseSync} = require('node:sqlite');
const {randomUUID,randomBytes,scryptSync,timingSafeEqual,createHash} = require('node:crypto');
class DomainError extends Error {constructor(code,message,status=400){super(message||code);this.code=code;this.status=status;}}
function fail(code,message,status){throw new DomainError(code,message,status);}
function check(v,code,message,status){if(!v)fail(code,message,status);}
const nameCheck=/^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 '\-.]{1,79}$/u;
const hex=(x)=>createHash('sha256').update(x).digest('hex');
function protect(password){const salt=randomBytes(16).toString('hex');return {salt,hash:scryptSync(password,salt,64).toString('hex')};}
function equalsHash(password,user){const derived=scryptSync(password,user.salt,64);return timingSafeEqual(derived,Buffer.from(user.password_hash,'hex'));}
function validMoney(v){return Number.isSafeInteger(v) && v>=0 && v<=100_000_000_00;}
function createEngine(dbFile=':memory:'){
 const db=new DatabaseSync(dbFile);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;');
 db.exec(`
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,handle TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,salt TEXT NOT NULL,lang TEXT NOT NULL DEFAULT 'en');
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS circles(id TEXT PRIMARY KEY,name TEXT NOT NULL,monthly_cents INTEGER NOT NULL,reserve_cents INTEGER NOT NULL,cycle INTEGER NOT NULL DEFAULT 1,payout_order TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id));
 CREATE TABLE IF NOT EXISTS memberships(circle_id TEXT REFERENCES circles(id),user_id TEXT REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('member','signer')),PRIMARY KEY(circle_id,user_id));
 CREATE TABLE IF NOT EXISTS invites(circle_id TEXT REFERENCES circles(id),user_id TEXT REFERENCES users(id),role TEXT NOT NULL CHECK(role IN ('member','signer')),invited_by TEXT NOT NULL REFERENCES users(id),PRIMARY KEY(circle_id,user_id));
 CREATE TABLE IF NOT EXISTS contributions(id TEXT PRIMARY KEY,circle_id TEXT REFERENCES circles(id),user_id TEXT REFERENCES users(id),cycle INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('reported','simulated_verified')),verified_by TEXT REFERENCES users(id),ref TEXT,UNIQUE(circle_id,user_id,cycle),UNIQUE(ref));
 CREATE TABLE IF NOT EXISTS payouts(id TEXT PRIMARY KEY,circle_id TEXT REFERENCES circles(id),cycle INTEGER NOT NULL,recipient_id TEXT REFERENCES users(id),amount_cents INTEGER NOT NULL,status TEXT NOT NULL CHECK(status IN ('pending','approved','simulated_completed','rejected')),created_by TEXT REFERENCES users(id),UNIQUE(circle_id,cycle));
 CREATE TABLE IF NOT EXISTS votes(id TEXT UNIQUE NOT NULL,payout_id TEXT REFERENCES payouts(id),user_id TEXT REFERENCES users(id),decision TEXT NOT NULL CHECK(decision IN ('approve','reject')),PRIMARY KEY(payout_id,user_id));
 CREATE TABLE IF NOT EXISTS ledger(id TEXT PRIMARY KEY,circle_id TEXT REFERENCES circles(id),account TEXT NOT NULL CHECK(account IN ('rotation','reserve')),delta_cents INTEGER NOT NULL,reason TEXT NOT NULL,reference TEXT NOT NULL,actor_id TEXT REFERENCES users(id),at TEXT NOT NULL,prev_hash TEXT NOT NULL,hash TEXT NOT NULL,UNIQUE(circle_id,account,reference));
 CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,circle_id TEXT REFERENCES circles(id),type TEXT NOT NULL,actor_id TEXT REFERENCES users(id),details TEXT NOT NULL,at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS disputes(id TEXT PRIMARY KEY,circle_id TEXT REFERENCES circles(id),created_by TEXT REFERENCES users(id),topic TEXT NOT NULL,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',resolution TEXT,reviewed_by TEXT REFERENCES users(id));
 CREATE TRIGGER IF NOT EXISTS immutable_ledger_update BEFORE UPDATE ON ledger BEGIN SELECT RAISE(ABORT,'ledger entries are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS immutable_ledger_delete BEFORE DELETE ON ledger BEGIN SELECT RAISE(ABORT,'ledger entries are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS immutable_event_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'audit events are append-only'); END;
 CREATE TRIGGER IF NOT EXISTS immutable_event_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'audit events are append-only'); END;
 `);
 const q=(sql,...params)=>db.prepare(sql).get(...params);
 const all=(sql,...params)=>db.prepare(sql).all(...params);
 const exec=(sql,...params)=>db.prepare(sql).run(...params);
 const transaction=(fn)=>{db.exec('BEGIN IMMEDIATE');try{let out=fn();db.exec('COMMIT');return out;}catch(err){db.exec('ROLLBACK');throw err;}};
 const user=(id)=>{const u=q('SELECT id,handle,lang FROM users WHERE id=?',id);check(u,'USER_NOT_FOUND','User not found',404);return u;};
 const circle=(id)=>{const c=q('SELECT * FROM circles WHERE id=?',id);check(c,'CIRCLE_NOT_FOUND','Group not found',404);return c;};
 const membership=(id,cid)=>{const m=q('SELECT role FROM memberships WHERE circle_id=? AND user_id=?',cid,id);check(m,'FORBIDDEN','You do not belong to this group',403);return m;};
 const signer=(id,cid)=>{check(membership(id,cid).role==='signer','NOT_SIGNER','An authorized signer is required',403);};
 const event=(cid,type,uid,details)=>exec('INSERT INTO events VALUES(?,?,?,?,?,?)',randomUUID(),cid,type,uid,JSON.stringify(details),new Date().toISOString());
 const available=(cid,account)=>Number(q('SELECT COALESCE(SUM(delta_cents),0) AS total FROM ledger WHERE circle_id=? AND account=?',cid,account).total);
 const addEntry=(cid,account,amount,reason,ref,uid)=>{
    check(Number.isSafeInteger(amount),'INVALID_MONEY','Invalid monetary entry');
    const prior=q('SELECT hash FROM ledger WHERE circle_id=? ORDER BY rowid DESC LIMIT 1',cid);
    const previous=prior?prior.hash:'GENESIS',id=randomUUID(),at=new Date().toISOString();
    const payload=JSON.stringify({id,cid,account,amount,reason,ref,uid,at,previous});const hash=hex(payload);
    exec('INSERT INTO ledger VALUES(?,?,?,?,?,?,?,?,?,?)',id,cid,account,amount,reason,ref,uid,at,previous,hash);
 };
 const createUser=(handle,password,lang='en')=>transaction(()=>{
   handle=String(handle||'').trim();check(nameCheck.test(handle),'BAD_NAME','Use 2–80 letters/numbers for name');
   check(typeof password==='string'&&password.length>=12&&password.length<=128,'WEAK_PASSWORD','Password must be 12–128 characters');
   check(['en','af','zu','xh','nso','st','tn','ss','ve','ts','nr','sasl'].includes(lang),'BAD_LANG','Unknown language');
   check(!q('SELECT 1 AS ok FROM users WHERE handle=?',handle),'DUPLICATE_USER','Name already in use');
   const id=randomUUID(),v=protect(password);exec('INSERT INTO users VALUES(?,?,?,?,?)',id,handle,v.hash,v.salt,lang);return {id,handle,lang};
 });
 const login=(handle,password)=>{
   const u=q('SELECT * FROM users WHERE handle=?',String(handle||'').trim());
   check(u&&typeof password==='string'&&equalsHash(password,u),'LOGIN_FAILED','Invalid credentials',401);
   const token=randomBytes(32).toString('hex'),expiresAt=Date.now()+60*60*1000;
   exec('INSERT INTO sessions VALUES(?,?,?)',hex(token),u.id,expiresAt);
   return {token,expiresAt,user:user(u.id)};
 };
 const authenticate=(token)=>{check(typeof token==='string'&&/^[0-9a-f]{64}$/.test(token),'AUTH_REQUIRED','Sign in to continue',401);const s=q('SELECT * FROM sessions WHERE token_hash=?',hex(token));check(s&&s.expires_at>Date.now(),'AUTH_REQUIRED','Session expired',401);return user(s.user_id);};
 const createCircle=(uid,{name,monthlyCents,reserveCents}={})=>transaction(()=>{
   name=String(name||'').trim();check(name.length>=3&&name.length<=80,'INVALID_NAME','Group name must be 3–80 characters');
   check(Number.isSafeInteger(monthlyCents)&&monthlyCents>0&&monthlyCents<=100000000,'INVALID_AMOUNT','Monthly contribution must be positive');
   check(validMoney(reserveCents),'INVALID_RESERVE','Protection reserve must be nonnegative');
   const id=randomUUID();exec('INSERT INTO circles VALUES(?,?,?,?,?,?,?)',id,name,monthlyCents,reserveCents,1,JSON.stringify([uid]),uid);
   exec("INSERT INTO memberships VALUES(?,?,'signer')",id,uid);event(id,'CIRCLE_CREATED',uid,{name});return {id,name,monthlyCents,reserveCents};
 });
 const invite=(uid,cid,{handle,role='member'}={})=>transaction(()=>{
   signer(uid,cid);check(['member','signer'].includes(role),'BAD_ROLE','Unsupported role');
   const target=q('SELECT id FROM users WHERE handle=?',String(handle||'').trim());check(target,'USER_NOT_FOUND','The user must register before being invited',404);
   check(!q('SELECT 1 FROM memberships WHERE circle_id=? AND user_id=?',cid,target.id),'ALREADY_MEMBER','Already in group');
   check(!q('SELECT 1 FROM invites WHERE circle_id=? AND user_id=?',cid,target.id),'DUPLICATE_INVITE','Already invited');
   exec('INSERT INTO invites VALUES(?,?,?,?)',cid,target.id,role,uid);event(cid,'INVITED',uid,{target:target.id,role});return {invited:true};
 });
 const join=(uid,cid)=>transaction(()=>{
   const invitation=q('SELECT * FROM invites WHERE circle_id=? AND user_id=?',cid,uid);check(invitation,'NO_INVITE','No invitation for this group',403);
   exec('INSERT INTO memberships VALUES(?,?,?)',cid,uid,invitation.role);
   exec('DELETE FROM invites WHERE circle_id=? AND user_id=?',cid,uid);
   const c=circle(cid);check(!q('SELECT 1 FROM contributions WHERE circle_id=? LIMIT 1',cid)&&!q('SELECT 1 FROM payouts WHERE circle_id=? LIMIT 1',cid),'MEMBERSHIP_FROZEN','Cannot add members after a contribution cycle has started');const order=JSON.parse(c.payout_order);order.push(uid);exec('UPDATE circles SET payout_order=? WHERE id=?',JSON.stringify(order),cid);
   event(cid,'JOINED',uid,{role:invitation.role});return {joined:true};
 });
 const listInvites=(uid)=>all('SELECT i.circle_id AS circleId,c.name,i.role FROM invites i JOIN circles c ON c.id=i.circle_id WHERE i.user_id=?',uid);
 const listCircles=(uid)=>all('SELECT c.id,c.name,c.monthly_cents AS monthlyCents,c.reserve_cents AS reserveCents,c.cycle,m.role FROM circles c JOIN memberships m ON m.circle_id=c.id WHERE m.user_id=? ORDER BY c.rowid DESC',uid);
 const summary=(uid,cid)=>{
   const c=circle(cid);membership(uid,cid);const order=JSON.parse(c.payout_order);
   const mems=all('SELECT u.id,u.handle,m.role FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.circle_id=? ORDER BY u.handle',cid);
   const payments=all('SELECT ct.id,ct.user_id AS userId,u.handle,ct.cycle,ct.status FROM contributions ct JOIN users u ON u.id=ct.user_id WHERE ct.circle_id=? ORDER BY ct.rowid',cid);
   const payouts=all('SELECT id,cycle,recipient_id AS recipientId,amount_cents AS amountCents,status FROM payouts WHERE circle_id=? ORDER BY cycle',cid);
   const audits=all('SELECT type,actor_id AS actorId,details,at FROM events WHERE circle_id=? ORDER BY rowid DESC LIMIT 50',cid);
   return {id:c.id,name:c.name,cycle:c.cycle,monthlyCents:c.monthly_cents,reserveCents:c.reserve_cents,rotationBalance:available(cid,'rotation'),reserveBalance:available(cid,'reserve'),members:mems,order,payments,payouts,audit:audits,simulation:true};
 };
 const report=(uid,cid)=>transaction(()=>{
   const c=circle(cid);membership(uid,cid);check(!q('SELECT 1 FROM contributions WHERE circle_id=? AND user_id=? AND cycle=?',cid,uid,c.cycle),'DUPLICATE_REPORT','Contribution already reported this cycle');
   const id=randomUUID();exec("INSERT INTO contributions(id,circle_id,user_id,cycle,status) VALUES(?,?,?,?,'reported')",id,cid,uid,c.cycle);
   event(cid,'CONTRIBUTION_REPORTED',uid,{id,cycle:c.cycle});return {id,status:'reported',settled:false};
 });
 const reconcile=(uid,cid,contributionId,verificationReference)=>transaction(()=>{
   signer(uid,cid);check(typeof verificationReference==='string'&&/^DEMO-[A-Za-z0-9-]{6,50}$/.test(verificationReference),'REFERENCE','Use unique DEMO- payment reference');
   const p=q('SELECT * FROM contributions WHERE id=? AND circle_id=?',contributionId,cid);check(p,'NOT_FOUND','Contribution missing',404);
   check(p.user_id!==uid,'SELF_VERIFY','Another signer must independently reconcile');
   check(p.status==='reported','ALREADY_VERIFIED','Already verified');
   check(!q('SELECT 1 FROM contributions WHERE ref=?',verificationReference),'DUPLICATE_REFERENCE','Reference was already used');
   const c=circle(cid);exec("UPDATE contributions SET status='simulated_verified',verified_by=?,ref=? WHERE id=?",uid,verificationReference,contributionId);
   addEntry(cid,'rotation',c.monthly_cents,'SIMULATED CONTRIBUTION',`rotation:${p.id}`,uid);
   if(c.reserve_cents) addEntry(cid,'reserve',c.reserve_cents,'SIMULATED RESERVE CONTRIBUTION',`reserve:${p.id}`,uid);
   event(cid,'SIMULATED_RECONCILIATION',uid,{id:p.id,reference:verificationReference,noRealBankProof:true});return {status:'simulated_verified',bankVerified:false};
 });
 const requestPayout=(uid,cid)=>transaction(()=>{
   const c=circle(cid);membership(uid,cid);
   const order=JSON.parse(c.payout_order);check(order.length>=3,'TOO_FEW_MEMBERS','At least three members required');
   const signers=all("SELECT user_id FROM memberships WHERE circle_id=? AND role='signer'",cid).map(x=>x.user_id);
   check(signers.length>=3,'TOO_FEW_SIGNERS','At least three active signers required');
   const recipient=order[c.cycle-1];check(recipient===uid,'WRONG_RECIPIENT','Only the scheduled recipient may request');
   const totalVerified=Number(q("SELECT COUNT(*) AS n FROM contributions WHERE circle_id=? AND cycle=? AND status='simulated_verified'",cid,c.cycle).n);
   check(totalVerified===order.length,'UNSETTLED_CONTRIBUTIONS','All contributions must be simulated verified for this policy');
   const amount=order.length*c.monthly_cents;check(available(cid,'rotation')>=amount,'INSUFFICIENT_ROTATION','Insufficient rotation pot');
   check(!q('SELECT 1 FROM payouts WHERE circle_id=? AND cycle=?',cid,c.cycle),'DUPLICATE_PAYOUT','Payout exists for this cycle');
   const id=randomUUID();exec("INSERT INTO payouts VALUES(?,?,?,?,?,'pending',?)",id,cid,c.cycle,uid,amount,uid);
   event(cid,'PAYOUT_REQUEST',uid,{id,amount,cycle:c.cycle,simulated:true});return {id,amountCents:amount,status:'pending'};
 });
 const vote=(uid,cid,payoutId,decision)=>transaction(()=>{
   signer(uid,cid);check(['approve','reject'].includes(decision),'INVALID_DECISION','Invalid decision');
   const p=q('SELECT * FROM payouts WHERE id=? AND circle_id=?',payoutId,cid);check(p,'NOT_FOUND','Payout not found',404);
   check(p.status==='pending','NOT_PENDING','Payout is not pending');check(uid!==p.recipient_id,'SELF_APPROVAL','Recipient cannot approve payout');
   check(!q('SELECT 1 FROM votes WHERE payout_id=? AND user_id=?',payoutId,uid),'DUPLICATE_VOTE','You already voted');
   exec('INSERT INTO votes VALUES(?,?,?,?)',randomUUID(),payoutId,uid,decision);
   const count=q("SELECT COUNT(*) AS n FROM votes WHERE payout_id=? AND decision='approve'",payoutId).n;
   if(decision==='reject')exec("UPDATE payouts SET status='rejected' WHERE id=?",payoutId);
   else if(count>=2)exec("UPDATE payouts SET status='approved' WHERE id=?",payoutId);
   event(cid,'PAYOUT_VOTE',uid,{payoutId,decision,approvedCount:count,simulated:true});return {status:decision==='reject'?'rejected':count>=2?'approved':'pending',approvedCount:count};
 });
 const simulateFinalize=(uid,cid,payoutId)=>transaction(()=>{
   signer(uid,cid);
   const p=q('SELECT * FROM payouts WHERE id=? AND circle_id=?',payoutId,cid);check(p,'NOT_FOUND','Payout not found',404);
   check(p.status==='approved','NOT_APPROVED','Two approvals required');
   const count=Number(q("SELECT COUNT(*) AS n FROM votes WHERE payout_id=? AND decision='approve' AND user_id<>?",payoutId,p.recipient_id).n);
   check(count>=2,'NOT_APPROVED','Two independent non-recipient approvers required');
   check(available(cid,'rotation')>=p.amount_cents,'INSUFFICIENT_ROTATION','Reserve cannot be used for rotation payout');
   addEntry(cid,'rotation',-p.amount_cents,'SIMULATED PAYOUT',`payout:${p.id}`,uid);
   exec("UPDATE payouts SET status='simulated_completed' WHERE id=?",p.id);
   exec('UPDATE circles SET cycle=cycle+1 WHERE id=? AND cycle=?',cid,p.cycle);
   event(cid,'SIMULATED_PAYOUT',uid,{payoutId:p.id,amount:p.amount_cents,noTransfer:true});return {status:'simulated_completed',transactionHash:null,realTransfer:false};
 });
 const createDispute=(uid,cid,topic,reason)=>transaction(()=>{
   membership(uid,cid);check(['contribution','payout','rules','other'].includes(topic),'BAD_TOPIC','Invalid topic');
   check(typeof reason==='string'&&reason.trim().length>=10&&reason.length<=500,'BAD_REASON','Explain dispute (10–500 characters)');
   const id=randomUUID();exec("INSERT INTO disputes(id,circle_id,created_by,topic,reason,status) VALUES(?,?,?,?,?,'open')",id,cid,uid,topic,reason.trim());event(cid,'DISPUTE_OPEN',uid,{id,topic});return {id,status:'open'};
 });
 const resolveDispute=(uid,cid,id,resolution)=>transaction(()=>{
   signer(uid,cid);const d=q('SELECT * FROM disputes WHERE id=? AND circle_id=?',id,cid);
   check(d,'NOT_FOUND','Dispute not found',404);check(d.created_by!==uid,'SELF_REVIEW','Independent reviewer required');
   check(d.status==='open','ALREADY_RESOLVED','Already resolved');check(typeof resolution==='string'&&resolution.length>=10&&resolution.length<=500,'BAD_REASON','Resolution explanation required');
   exec("UPDATE disputes SET status='resolved',resolution=?,reviewed_by=? WHERE id=?",resolution,uid,id);event(cid,'DISPUTE_RESOLVED',uid,{id,resolution});return {id,status:'resolved'};
 });
 const verifyLedger=(uid,cid)=>{
   membership(uid,cid);const entries=all('SELECT * FROM ledger WHERE circle_id=? ORDER BY rowid',cid);let prev='GENESIS';
   for(const e of entries){const expected=hex(JSON.stringify({id:e.id,cid,account:e.account,amount:e.delta_cents,reason:e.reason,ref:e.reference,uid:e.actor_id,at:e.at,previous:prev}));if(e.prev_hash!==prev||e.hash!==expected)return {valid:false,checked:entries.length};prev=e.hash;}
   return {valid:true,checked:entries.length,headHash:prev};
 };
 const signout=(token)=>exec('DELETE FROM sessions WHERE token_hash=?',hex(token));
 return {db,createUser,login,authenticate,signout,createCircle,invite,join,listCircles,listInvites,summary,report,reconcile,requestPayout,vote,simulateFinalize,createDispute,resolveDispute,verifyLedger,close:()=>db.close()};
}
module.exports={createEngine,DomainError};
