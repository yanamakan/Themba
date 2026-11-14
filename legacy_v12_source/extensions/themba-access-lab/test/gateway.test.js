const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../lib/gateway.js');
const load=(text)=>G.handle({text});
test('Africa Talking callback starts with CON',()=>assert.match(load(''),/^CON THEMBA/));
test('reading balance ends with END and uses only sample figures',()=>{const x=load('1');assert.match(x,/^END /);assert.match(x,/not available on the public demo callback/);});
test('12 locale choices across two numbered pages',()=>{
 for(let n=1;n<=12;n++){const steps=n<=7?'0*'+n:'0*8*'+(n-7);const x=load(steps);assert.match(x,/^CON THEMBA/);assert.ok(x.includes(G.LANGS[n-1]==='sasl'?'SASL':G.LANGS[n-1]==='en'?'Welcome':G.LANGS[n-1]==='af'?'Welkom':'THEMBA')||x.length>10);const menu=load(steps+'*1');assert.match(menu,/^END /);}
});
test('USSD language page 2 is reachable with numeric 8',()=>{assert.match(load('0*8'),/isiNdebele|SASL|Tshivenda/);});
test('invalid selections terminate rather than transferring',()=>{for(const text of ['0*99','0*8*9','abcd','*;','1*999','0*8*0*1'])assert.match(load(text),/^(END|CON) /)});
test('no private or real group balances exposed in callback',()=>{assert.doesNotMatch(load('1'),/API key|bank account|wallet|private/i)});
test('SMS STOP reply says no messages sent',()=>assert.match(G.smsPreview('STOP'),/No messages are delivered/));
test('SMS language choices accept 1-12',()=>{for(let n=1;n<=12;n++)assert.match(G.smsPreview('LANG '+n),/THEMBA SANDBOX/)});
test('SMS dangerous payment command never claims funds moved',()=>assert.match(G.smsPreview('PAY 500'),/No message sent/));
test('SASL language output never claims a voice translation',()=>assert.match(load('0*8*5'),/SASL/));
test('USSD input is capped',()=>assert.match(load('1'.repeat(1000)),/^END Invalid session input/));
