/* Themba V6 public sandbox gateway. No static financial balances, identities or secrets.
 * The public HTTP callback NEVER receives a group/member snapshot from an unauthenticated caller.
 * Snapshot injection is available only for isolated local simulations and requires trusted backend
 * identity verification before any future real-data use.
 */
(function(root,factory){
 const core=(typeof module!=='undefined' && module.exports)?require('../logic.js'):root.ThembaLab;
 const value=factory(core);
 if(typeof module!=='undefined' && module.exports)module.exports=value;
 if(root)root.ThembaUSSDGateway=value;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(core){
 'use strict';
 if(!core||!core.COPY)throw new Error('Missing Themba language resources');
 const LANGS=core.LOCALES,C=core.COPY;
 function clean(input){const raw=String(input??'');if(raw.length>140||/[^0-9*#]/.test(raw))return null;return raw?raw.split('*'):[];}
 function safeSnapshot(raw){
   if(!raw||raw.mode!=='local-demo'||typeof raw!=='object')return null;
   const keys=['rotationCents','reserveCents','contributionCents'];
   if(!keys.every(k=>Number.isSafeInteger(raw[k])&&raw[k]>=0&&raw[k]<1e12))return null;
   return {rotationCents:raw.rotationCents,reserveCents:raw.reserveCents,contributionCents:raw.contributionCents,
     nextRecipient:String(raw.nextRecipient||'Cycle complete').slice(0,80)};
 }
 function demoSnapshot(state,groupId,memberId){
   const g=state?.groups?.find(x=>x.id===groupId);
   if(!g||!g.memberIds.includes(memberId))throw new Error('Not a member of this demo circle');
   const actual=state.contributions.filter(x=>x.groupId===g.id&&x.userId===memberId&&x.status==='simulated_verified');
   const paid=actual.reduce((sum,c)=>sum+c.rotationCents+c.reserveCents,0);
   const next=state.members.find(m=>m.id===g.payoutOrder[g.cycle-1]);
   return {mode:'local-demo',rotationCents:g.rotationCents,reserveCents:g.reserveCents,contributionCents:paid,nextRecipient:next?.name||'Cycle complete'};
 }
 function menu(lang){
   const c=C[lang]||C.en;
   return 'CON THEMBA | SANDBOX DEMO\n'+(lang==='sasl'?'Written captions only; SASL video not available.':c.welcome)+
   '\n1 '+c.balance+'\n2 '+c.contribution+'\n3 '+c.next+'\n4 '+c.reserve+'\n5 Payment guidance\n0 Language\n9 Help';
 }
 function languagePage(page){
   const choices=LANGS.slice(page*7,page*7+7);
   return 'CON THEMBA | Choose language\n'+choices.map((code,i)=>(i+1)+' '+C[code].language).join('\n')+
   '\n8 '+(page?'Previous languages':'More languages')+'\n0 Cancel';
 }
 function choice(lang,opt,rawContext){
   const c=C[lang]||C.en,context=safeSnapshot(rawContext);
   if(opt==='0')return languagePage(0);
   if(opt==='5')return 'END Payment instructions: use your bank or approved provider. Never share PINs. No payment was started.';
   if(opt==='9')return 'END '+c.help+'\nThis is a simulator.';
   if(!['1','2','3','4'].includes(opt))return 'END Invalid selection. Please try again.';
   if(!context)return 'END Account information is not available on the public demo callback.\nUse the secure application to check your records. NO real payments.';
   const values={
     '1':c.balance+': '+core.money(context.rotationCents),
     '2':c.contribution+': '+core.money(context.contributionCents),
     '3':c.next+': '+context.nextRecipient,
     '4':c.reserve+': '+core.money(context.reserveCents)
   };
   return 'END '+values[opt]+'\nLOCAL SIMULATED DATA ONLY. Not a real bank balance.';
 }
 function render(text,context=null){
   const steps=clean(text);
   if(steps===null)return 'END Invalid session input. Dial again.';
   if(!steps.length)return menu('en');
   if(steps[0]!=='0')return choice('en',steps[0],context);
   if(steps.length===1)return languagePage(0);
   if(steps[1]==='0')return menu('en');
   const second=steps[1]==='8';
   if(second&&steps.length===2)return languagePage(1);
   if(second&&steps[2]==='8')return languagePage(0);
   if(second&&steps[2]==='0')return menu('en');
   const part=second?steps[2]:steps[1],index=(second?7:0)+Number(part)-1;
   if(!/^\d$/.test(String(part))||Number(part)<1||Number(part)>(second?5:7)||index>=LANGS.length)return 'END Invalid language selection. Dial again.';
   const locale=LANGS[index];
   if(steps.length===(second?3:2))return menu(locale);
   return choice(locale,steps[second?3:2],context);
 }
 function handle(payload,context=null){return render(payload?.text,context);}
 function smsPreview(command,lang='en',context=null){
   const key=String(command||'').trim().toUpperCase().slice(0,40);
   const language=LANGS.includes(lang)?lang:'en',c=C[language];
   if(key==='STOP')return 'THEMBA SANDBOX: No messages are delivered. A live opt-out needs a verified provider integration.';
   if(key==='START')return 'THEMBA SANDBOX: Messaging is not enabled. Consent required for production.';
   if(key==='LANG')return 'THEMBA SANDBOX: Use LANG 1 through LANG 12. Preferences are not saved by this public API.';
   const match=/^LANG (1[0-2]|[1-9])$/.exec(key);
   if(match)return 'THEMBA SANDBOX: '+C[LANGS[Number(match[1])-1]].changed+' This is a sample response only.';
   if(key==='HELP')return 'THEMBA SANDBOX: Ask your stokvel committee for help. Never share a PIN or OTP.';
   const map={BAL:'1',NEXT:'3',RESERVE:'4',CONTRIB:'2'};
   if(map[key])return 'THEMBA SANDBOX: '+choice(language,map[key],context).replace(/^END /,'');
   return 'THEMBA SANDBOX: Reply BAL, CONTRIB, NEXT, RESERVE, LANG, HELP, STOP. No message sent.';
 }
 return Object.freeze({render,handle,smsPreview,languagePage,menu,LANGS,demoSnapshot});
});
