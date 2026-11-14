/* Themba Inclusive Access Lab - isolated DEMO domain logic. No real payments, wallets or authentication. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ThembaLab = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
  'use strict';
  const VERSION = 6;
  const COPY = {
    en: {
      language: 'English', welcome: 'Welcome to Themba', menu: '1 Balance  2 Contributions  3 Next payout  4 Protection reserve  0 Language  9 Help',
      balance: 'Rotation pot', reserve: 'Protection reserve', contribution: 'Your contribution', next: 'Next payout', help: 'Need help? Contact your stokvel committee.', changed: 'Language changed to English.',
      unknown: 'Invalid choice. Choose a menu number.', pending: 'This is a simulation. No money has moved.', voice: 'For balance press 1. For contributions press 2. For your next payout press 3. For the protection reserve press 4. For language press 0.'
    },
    af: {
      language: 'Afrikaans', welcome: 'Welkom by Themba', menu: '1 Saldo  2 Bydraes  3 Volgende uitbetaling  4 Beskermingsreserwe  0 Taal  9 Hulp',
      balance: 'Rotasiepot', reserve: 'Beskermingsreserwe', contribution: 'Jou bydrae', next: 'Volgende uitbetaling', help: 'Hulp nodig? Kontak jou stokvelkomitee.', changed: 'Taal na Afrikaans verander.',
      unknown: 'Ongeldige keuse. Kies ’n nommer.', pending: 'Dit is ’n simulasie. Geen geld is oorgeplaas nie.', voice: 'Vir saldo, druk 1. Vir bydraes, druk 2. Vir die volgende uitbetaling, druk 3. Vir die beskermingsreserwe, druk 4. Vir taal, druk 0.'
    },
    zu: {
      language: 'isiZulu', welcome: 'Siyakwamukela kuThemba', menu: '1 Ibhalansi  2 Iminikelo  3 Inkokhelo elandelayo  4 Isikhwama sokuvikela  0 Ulimi  9 Usizo',
      balance: 'Isikhwama sokujikeleza', reserve: 'Isikhwama sokuvikela', contribution: 'Umnikelo wakho', next: 'Inkokhelo elandelayo', help: 'Udinga usizo? Xhumana nekomiti le-stokvel.', changed: 'Ulimi lushintshelwe esiZulwini.',
      unknown: 'Inketho ayivumelekile. Khetha inombolo.', pending: 'Lokhu kuyisibonelo kuphela. Ayikho imali edlulisiwe.', voice: 'Ukuze uzwe ibhalansi, cindezela u-1. Ngeminikelo, cindezela u-2. Ngenkokhelo elandelayo, cindezela u-3. Ngokulondoloza, cindezela u-4. Ngokukhetha ulimi, cindezela u-0.'
    },
    xh: {
      language: 'isiXhosa', welcome: 'Wamkelekile kuThemba', menu: '1 Ibhalansi  2 Iminikelo  3 Intlawulo elandelayo  4 Ingxowa yokhuseleko  0 Ulwimi  9 Uncedo',
      balance: 'Ingxowa ejikelezayo', reserve: 'Ingxowa yokhuseleko', contribution: 'Umnikelo wakho', next: 'Intlawulo elandelayo', help: 'Ufuna uncedo? Qhagamshelana nekomiti ye-stokvel.', changed: 'Ulwimi lutshintshiwe lwaba sisiXhosa.',
      unknown: 'Ukhetho aluvumelekanga. Khetha inombolo.', pending: 'Lo ngumzekelo kuphela. Akukho mali ithunyelweyo.', voice: 'Ukuphulaphula ibhalansi, cofa u-1. Ngeminikelo, cofa u-2. Ngentlawulo elandelayo, cofa u-3. Ngengxowa yokhuseleko, cofa u-4. Ukutshintsha ulwimi, cofa u-0.'
    },
    nso: {
      language:'Sepedi', welcome:'Re go amogela go Themba', menu:'1 Tšhelete  2 Meneelo  3 Tefo ye e latelago  4 Sekhwama sa tšhireletšo  0 Leleme  9 Thušo',
      balance:'Sekhwama sa go dikološa', reserve:'Sekhwama sa tšhireletšo', contribution:'Moneelo wa gago', next:'Tefo ye e latelago', help:'O hloka thušo? Ikgokaganye le komiti ya stokvel.', changed:'Leleme le fetotšwe go Sepedi.', unknown:'Kgetho ga e a amogelwa.', pending:'Ke teko feela. Ga go tšhelete ye e rometšwego.', voice:'Go kwa tšhelete, kgotla 1. Meneelo, kgotla 2. Tefo ye e latelago, kgotla 3. Sekhwama sa tšhireletšo, kgotla 4. Leleme, kgotla 0.'
    },
    st: {
      language:'Sesotho', welcome:'Re o amohela ho Themba', menu:'1 Balansa  2 Menehelo  3 Tefo e latelang  4 Letlole la tshireletso  0 Puo  9 Thuso',
      balance:'Letlole la potoloho', reserve:'Letlole la tshireletso', contribution:'Monehelo wa hao', next:'Tefo e latelang', help:'O hloka thuso? Ikopanye le komiti ya stokvel.', changed:'Puo e fetotswe ho Sesotho.', unknown:'Kgetho ha e sebetse.', pending:'Ena ke teko feela. Ha ho tjhelete e rometsweng.', voice:'Ho utlwa balansa, tobetsa 1. Menehelo, tobetsa 2. Tefo e latelang, tobetsa 3. Tshireletso, tobetsa 4. Puo, tobetsa 0.'
    },
    tn: {
      language:'Setswana', welcome:'Re go amogela mo Themba', menu:'1 Madi a a leng teng  2 Meneelo  3 Tuelo e e latelang  4 Letlole la tshireletso  0 Puo  9 Thuso',
      balance:'Letlole la go dikologa', reserve:'Letlole la tshireletso', contribution:'Moneelo wa gago', next:'Tuelo e e latelang', help:'A o tlhoka thuso? Ikgolaganye le komiti ya stokvel.', changed:'Puo e fetotswe go Setswana.', unknown:'Tlhopho ga e a siama.', pending:'Ke teko fela. Ga go na madi a a rometsweng.', voice:'Go utlwa madi a a leng teng, tobetsa 1. Meneelo, tobetsa 2. Tuelo e e latelang, tobetsa 3. Tshireletso, tobetsa 4. Puo, tobetsa 0.'
    },
    ss: {
      language:'siSwati', welcome:'Wemukelekile kuThemba', menu:'1 Imali lesele  2 Iminikelo  3 Inkokhelo lelandzelako  4 Sikhwama sekuvikela  0 Lulwimi  9 Lusito',
      balance:'Sikhwama semjikeleto', reserve:'Sikhwama sekuvikela', contribution:'Umnikelo wakho', next:'Inkokhelo lelandzelako', help:'Udzinga lusito? Tsintsa likomiti le-stokvel.', changed:'Lulwimi lushintjelwe kusiSwati.', unknown:'Kukhetsa akukalungi.', pending:'Lesi sibonelo kuphela. Kute imali ledlulisiwe.', voice:'Kuva imali, cindzetela 1. Iminikelo, cindzetela 2. Inkokhelo lelandzelako, cindzetela 3. Sikhwama sekuvikela, cindzetela 4. Lulwimi, cindzetela 0.'
    },
    ve: {
      language:'Tshivenda', welcome:'Ni tanganedzwa kha Themba', menu:'1 Masheleni  2 Minyikelo  3 Mbadelo i tevhelaho  4 Tshikwama tsha tsireledzo  0 Luambo  9 Thuso',
      balance:'Tshikwama tsha u mona', reserve:'Tshikwama tsha tsireledzo', contribution:'Munyikelo wanu', next:'Mbadelo i tevhelaho', help:'Ni toda thuso? Kwamanani na komiti ya stokvel.', changed:'Luambo lwo shandukiswa lwa vha Tshivenda.', unknown:'Khetho a yo ngo tea.', pending:'Holu ndi lusumbedza fhedzi. A hu na masheleni o rumelwaho.', voice:'U pfa masheleni, pwanye 1. Minyikelo, pwanye 2. Mbadelo i tevhelaho, pwanye 3. Tsireledzo, pwanye 4. Luambo, pwanye 0.'
    },
    ts: {
      language:'Xitsonga', welcome:'Mi amukeriwile eka Themba', menu:'1 Mali leyi nga kona  2 Minyikelo  3 Hakelo leyi landzelaka  4 Nkwama wa nsirhelelo  0 Ririmi  9 Mpfuno',
      balance:'Nkwama wa ku rhendzeleka', reserve:'Nkwama wa nsirhelelo', contribution:'Munyikelo wa wena', next:'Hakelo leyi landzelaka', help:'U lava mpfuno? Vulavula na komiti ya stokvel.', changed:'Ririmi ri cinciwile ri va Xitsonga.', unknown:'Nhlawulo a wu tirhi.', pending:'Leyi i demo ntsena. A ku na mali leyi rhumeriweke.', voice:'Ku twa mali, tshikelela 1. Minyikelo, tshikelela 2. Hakelo leyi landzelaka, tshikelela 3. Nsirhelelo, tshikelela 4. Ririmi, tshikelela 0.'
    },
    nr: {
      language:'isiNdebele', welcome:'Siyakwamukela kuThemba', menu:'1 Ibhalansi  2 Iminikelo  3 Ukukhokhwa okulandelako  4 Isikhwama sokuvikela  0 Ilimi  9 Isizo',
      balance:'Isikhwama sokuzungeza', reserve:'Isikhwama sokuvikela', contribution:'Umnikelo wakho', next:'Ukukhokhwa okulandelako', help:'Ufuna isizo? Thintana nekomidi ye-stokvel.', changed:'Ilimi litjhugululelwe esiNdebeleni.', unknown:'Ikhetho alikavumeleki.', pending:'Lokhu kusibonelo kwaphela. Ayikho imali ethunyelweko.', voice:'Ukuzwa ibhalansi, gandelela 1. Iminikelo, gandelela 2. Ukukhokhwa okulandelako, gandelela 3. Isikhwama sokuvikela, gandelela 4. Ilimi, gandelela 0.'
    },
    sasl: {
      language:'South African Sign Language (SASL)', welcome:'THEMBA — SASL ACCESS MODE', menu:'1 Balance  2 Contributions  3 Next payout  4 Protection reserve  0 Language  9 Help',
      balance:'Rotation pot', reserve:'Protection reserve', contribution:'Your contribution', next:'Next payout', help:'SASL signed-video assistance is not yet available. This prototype offers plain written captions and visual navigation.', changed:'SASL accessibility mode selected (written fallback).', unknown:'Invalid choice. Choose a number.', pending:'Demo only. No funds moved. SASL interpreted video is not yet available.', voice:'SASL is a signed visual language. Use the on-screen captions. No signed video is included in this demonstration.'
    }
  };
  const LOCALES = Object.keys(COPY);
  const CURRENCY = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function money(cents) { return CURRENCY.format(cents / 100); }
  function fail(code, text) { const e = new Error(text || code); e.code = code; throw e; }
  function assert(condition, code, message) { if (!condition) fail(code, message); }
  function member(id, name, lang='en') { return { id, name, lang }; }
  function createDemoState() {
    const members = [member('thabo','Thabo Mokoena','en'), member('lerato','Lerato Dlamini','zu'), member('sipho','Sipho Ndlovu','xh'), member('nomsa','Nomsa Khoza','zu'), member('neo','Neo Molefe','af'), member('zola','Zola Ncube','en')];
    const groups = [
      { id:'khula', name:'Khula Savings Circle', memberIds:['thabo','lerato','sipho','nomsa','neo'], signerIds:['lerato','sipho','nomsa'], contributionCents:50000, reserveContributionCents:5000, rotationCents:250000, reserveCents:25000, cycle:1, totalCycles:5, payoutOrder:['thabo','lerato','sipho','nomsa','neo'] },
      { id:'ubuntu', name:'Ubuntu Grocery Circle', memberIds:['lerato','neo','zola'], signerIds:['lerato','neo','zola'], contributionCents:30000, reserveContributionCents:3000, rotationCents:90000, reserveCents:9000, cycle:1, totalCycles:3, payoutOrder:['zola','neo','lerato'] }
    ];
    const contributions = groups.flatMap(g => g.memberIds.map((userId,i) => ({ id:`seed-${g.id}-${i}`, groupId:g.id, userId, cycle:1, rotationCents:g.contributionCents, reserveCents:g.reserveContributionCents, status:'simulated_verified', label:'Seed data, NOT real funds' })));
    return { version:VERSION, seq:1, members, groups, contributions, cashClaims:[], payouts:[], bills:[], loans:[], disputes:[], acknowledgements:[], alerts:[], audit:[{id:'seed',at:'2026-11-12T00:00:00.000Z',type:'DEMO_SEED',message:'All balances are seeded demo figures, never real assets'}] };
  }
  // Users can build a fully configurable test circle; no fixed financial figures are required.
  // The existing createDemoState() is a clearly-labelled sample fixture for reviewers.
  function createConfiguredDemoState(config) {
    assert(config && typeof config==='object','SETUP','Supply a group configuration');
    const name=String(config.name||'').trim();
    assert(name.length>=3 && name.length<=80,'GROUP_NAME','Enter a stokvel name (3–80 characters)');
    const names=Array.isArray(config.members)?config.members.map(x=>String(x||'').trim()):[];
    assert(names.length>=3 && names.length<=20,'MEMBERS','Provide 3 to 20 members for independent approvals');
    assert(names.every(x=>x.length>=2 && x.length<=80),'MEMBERS','Each name must be 2–80 characters');
    assert(new Set(names.map(x=>x.toLocaleLowerCase())).size===names.length,'MEMBERS','Member names must be unique');
    const contributionCents=config.contributionCents;
    const reserveContributionCents=config.reserveContributionCents;
    assert(positiveInt(contributionCents)&&contributionCents<=100000000,'CONTRIBUTION','Enter a valid positive contribution in cents');
    assert(Number.isSafeInteger(reserveContributionCents)&&reserveContributionCents>=0&&reserveContributionCents<=100000000,'RESERVE','Enter a valid nonnegative reserve contribution');
    const members=names.map((n,i)=>member('demo-person-'+(i+1),n,'en'));
    const ids=members.map(m=>m.id), groupId='demo-circle';
    const groups=[{id:groupId,name,memberIds:ids,signerIds:ids.slice(0,3),contributionCents,reserveContributionCents,rotationCents:0,reserveCents:0,cycle:1,totalCycles:ids.length,payoutOrder:ids.slice()}];
    return {version:VERSION,seq:1,members,groups,contributions:[],cashClaims:[],payouts:[],bills:[],loans:[],disputes:[],acknowledgements:[],alerts:[],audit:[{id:'setup',at:new Date().toISOString(),type:'DEMO_GROUP_SETUP',message:'A user-configured test circle was created with zero starting balance. No financial account was opened.'}]};
  }
  function copyState(state) { assert(state && state.version === VERSION,'VERSION','Demo data version mismatch: reset the demo'); return JSON.parse(JSON.stringify(state)); }
  function group(s,id) { const g = s.groups.find(x => x.id === id); assert(g,'GROUP_NOT_FOUND','Stokvel not found'); return g; }
  function identity(s,id) { const m = s.members.find(x => x.id === id); assert(m,'MEMBER_NOT_FOUND','Member not found'); return m; }
  function inGroup(g,id) { assert(g.memberIds.includes(id),'OUTSIDER','You are not a member of this stokvel'); }
  function positiveInt(n) { return Number.isSafeInteger(n) && n > 0; }
  function nextId(s,prefix) { return prefix + '-' + s.seq++; }
  function log(s,type,message,actorId,groupId,requestId) { s.audit.push({id:nextId(s,'evt'),at:new Date().toISOString(),type,message,actorId:actorId||null,groupId:groupId||null,requestId:requestId||null}); }
  function riskSummary(s,groupId,recipientId) {
    const g=group(s,groupId); const recipient=recipientId||g.payoutOrder[g.cycle-1];
    inGroup(g,recipient);
    const futureRounds=Math.max(0,g.totalCycles-g.cycle);
    const potentialMissedCents=futureRounds*g.contributionCents;
    const reserveCoverCents=Math.min(g.reserveCents,potentialMissedCents);
    return {recipientId:recipient,futureRounds,potentialMissedCents,reserveCoverCents,uncoveredCents:Math.max(0,potentialMissedCents-reserveCoverCents),note:'Illustrative future missed contributions if this recipient stops paying after this cycle. Not an insurance guarantee or a forecast.'};
  }

  function payoutPolicyPreview(state,groupId,mode='full',stagedPercent=60) {
    const g=group(state,groupId),amountCents=g.memberIds.length*g.contributionCents;
    assert(Number.isSafeInteger(stagedPercent)&&stagedPercent>=1&&stagedPercent<=99,'PERCENT','Staged percentage must be an integer from 1–99');
    const policy={full:100,staged:stagedPercent,'save-first':0};
    assert(Object.prototype.hasOwnProperty.call(policy,mode),'POLICY','Unknown payout policy');
    const immediateCents=Math.floor(amountCents*policy[mode]/100);
    return {mode,amountCents,immediateCents,heldCents:amountCents-immediateCents,
      disclaimer:'Planning illustration, not a payable amount or a verified risk reduction. Payout execution still follows the existing full-amount demo rules.'};
  }
  function splitBill(totalCents,memberIds,mode='equal',weights=null) {
    assert(positiveInt(totalCents),'AMOUNT','Bill total must be positive whole cents');
    assert(Array.isArray(memberIds)&&memberIds.length>0&&new Set(memberIds).size===memberIds.length,'MEMBERS','Unique group members required');
    let amounts;
    if(mode==='equal') {
      const q=Math.floor(totalCents/memberIds.length),rem=totalCents%memberIds.length;
      amounts=memberIds.map((_,i)=>q+(i<rem?1:0));
    } else if(mode==='fixed') {
      assert(Array.isArray(weights)&&weights.length===memberIds.length&&weights.every(x=>Number.isSafeInteger(x)&&x>=0),'SHARES','Provide one non-negative whole-cent share for each member');
      assert(weights.reduce((a,b)=>a+b,0)===totalCents,'SHARES','Fixed shares must exactly add up to the bill total');amounts=weights;
    } else if(mode==='percentage') {
      assert(Array.isArray(weights)&&weights.length===memberIds.length&&weights.every(x=>Number.isSafeInteger(x)&&x>=0),'SHARES','Provide whole-number percentages');
      assert(weights.reduce((a,b)=>a+b,0)===100,'SHARES','Percentages must add up to 100');
      const raw=weights.map(w=>totalCents*w/100);amounts=raw.map(Math.floor);
      let remaining=totalCents-amounts.reduce((a,b)=>a+b,0);
      const order=raw.map((v,i)=>({i,fract:v-Math.floor(v)})).sort((a,b)=>b.fract-a.fract||a.i-b.i);
      for(let i=0;i<remaining;i++)amounts[order[i].i]++;
    } else fail('SPLIT_MODE','Supported modes: equal, fixed, percentage');
    return memberIds.map((memberId,i)=>({memberId,cents:amounts[i]}));
  }

  function applyAction(previous, action) {
    const s=copyState(previous); assert(action&&typeof action.type==='string','ACTION','Missing action');
    const g=group(s,action.groupId); const actor=identity(s,action.actorId); inGroup(g,actor.id);
    if (action.type==='SET_LANGUAGE') {
      assert(LOCALES.includes(action.lang),'LANGUAGE','Unsupported language');
      actor.lang=action.lang; log(s,'LANGUAGE','Member changed language',actor.id,g.id); return s;
    }
    if (action.type==='CREATE_PAYOUT') {
      assert(g.cycle<=g.totalCycles,'CYCLE_DONE','All rotation cycles completed');
      const expected=g.payoutOrder[g.cycle-1];
      assert(actor.id===expected,'NOT_RECIPIENT','Only the scheduled recipient may request this cycle payout');
      assert(!s.payouts.some(p=>p.groupId===g.id&&p.cycle===g.cycle&&p.status!=='rejected'),'DUPLICATE_PAYOUT','This cycle already has a payout request');
      const amountCents=g.contributionCents*g.memberIds.length;
      assert(g.rotationCents>=amountCents,'INSUFFICIENT_ROTATION','The rotation pot is not fully funded');
      const id=nextId(s,'payout'); s.payouts.push({id,groupId:g.id,cycle:g.cycle,requesterId:actor.id,recipientId:actor.id,amountCents,status:'pending',approvals:[],rejections:[],kind:'rotation',createdAt:new Date().toISOString()});
      log(s,'PAYOUT_REQUEST',`Requested ${money(amountCents)} rotation payout`,actor.id,g.id,id); return s;
    }
    if (action.type==='APPROVE_PAYOUT' || action.type==='REJECT_PAYOUT') {
      const p=s.payouts.find(x=>x.id===action.requestId); assert(p&&p.groupId===g.id,'REQUEST_NOT_FOUND','Request does not belong to this group');
      assert(p.status==='pending','NOT_PENDING','This request is not pending');
      assert(g.signerIds.includes(actor.id),'NOT_SIGNER','You are not an approved signer');
      assert(actor.id!==p.requesterId,'SELF_APPROVAL','A recipient cannot approve their own payout');
      assert(!p.approvals.includes(actor.id)&&!p.rejections.includes(actor.id),'DUPLICATE_VOTE','You have already voted on this request');
      if(action.type==='REJECT_PAYOUT') {
        assert(typeof action.reason==='string'&&action.reason.trim().length>=3,'REASON_REQUIRED','A rejection reason is required');
        p.rejections.push(actor.id);p.status='rejected';p.rejectionReason=action.reason.trim().slice(0,240);
        log(s,'REJECT_PAYOUT','Rejected with reason: '+p.rejectionReason,actor.id,g.id,p.id);return s;
      }
      p.approvals.push(actor.id); if (p.approvals.length>=2) p.status='authorized_demo';
      log(s,'APPROVE_PAYOUT',`${p.approvals.length}/2 independent approvals; ${p.status}`,actor.id,g.id,p.id);return s;
    }
    if(action.type==='SIMULATE_SETTLEMENT') {
      const p=s.payouts.find(x=>x.id===action.requestId);assert(p&&p.groupId===g.id,'REQUEST_NOT_FOUND','Request does not belong to this group');
      assert(p.status==='authorized_demo'&&p.approvals.length===2,'NOT_AUTHORIZED','Two independent approvals are required');
      assert(g.signerIds.includes(actor.id),'NOT_SIGNER','An authorized committee member must simulate payout settlement');
      assert(g.cycle===p.cycle,'CYCLE_MISMATCH','The scheduled cycle changed');
      assert(g.rotationCents>=p.amountCents,'INSUFFICIENT_ROTATION','Insufficient rotation pot');
      g.rotationCents-=p.amountCents; g.cycle++; p.status='simulated_settled';p.settledAt=new Date().toISOString();
      log(s,'SIMULATE_SETTLEMENT',`DEMO ONLY: simulated ${money(p.amountCents)} settlement; no funds moved`,actor.id,g.id,p.id);return s;
    }
    if(action.type==='SIMULATE_CONTRIBUTION') {
      assert(g.cycle<=g.totalCycles,'CYCLE_DONE','The rotation has finished');
      assert(!s.contributions.some(c=>c.groupId===g.id&&c.userId===actor.id&&c.cycle===g.cycle&&c.status==='simulated_verified'),'DUPLICATE_CONTRIBUTION','One simulated contribution per cycle');
      g.rotationCents+=g.contributionCents;g.reserveCents+=g.reserveContributionCents;
      s.contributions.push({id:nextId(s,'contribution'),groupId:g.id,userId:actor.id,cycle:g.cycle,rotationCents:g.contributionCents,reserveCents:g.reserveContributionCents,status:'simulated_verified',label:'SIMULATION: not a bank payment'});
      log(s,'SIMULATE_CONTRIBUTION',`DEMO ONLY: ${money(g.contributionCents+g.reserveContributionCents)} contribution (rotation + reserve)`,actor.id,g.id); return s;
    }
    if(action.type==='LOG_CASH_CLAIM') {
      assert(g.signerIds.includes(actor.id),'NOT_SIGNER','Treasurer/signer access required for demo cash claim');
      const target=identity(s,action.targetId);inGroup(g,target.id);assert(target.id!==actor.id,'SEPARATE_CONFIRMATION','A member cannot both log and confirm their own cash claim');
      assert(!s.contributions.some(c=>c.groupId===g.id&&c.userId===target.id&&c.cycle===g.cycle&&c.status==='simulated_verified'),'DUPLICATE_CONTRIBUTION','Member already has a simulated verified contribution for this cycle');
      const claim={id:nextId(s,'cash'),groupId:g.id,memberId:target.id,loggedBy:actor.id,cycle:g.cycle,rotationCents:g.contributionCents,reserveCents:g.reserveContributionCents,status:'awaiting_member'};
      assert(!s.cashClaims.some(c=>c.groupId===g.id&&c.memberId===target.id&&c.cycle===g.cycle&&c.status!=='disputed'),'DUPLICATE_CASH','Already logged cash for this member and cycle');
      s.cashClaims.push(claim);log(s,'CASH_CLAIM','Treasurer reported cash; NOT yet verified',actor.id,g.id,claim.id);return s;
    }
    if(action.type==='CONFIRM_CASH' || action.type==='DISPUTE_CASH') {
      const claim=s.cashClaims.find(c=>c.id===action.claimId);assert(claim&&claim.groupId===g.id,'CLAIM_NOT_FOUND','Unknown claim');
      assert(actor.id===claim.memberId,'NOT_OWNER','Only the named member may confirm their cash handover');
      assert(claim.status==='awaiting_member','ALREADY_HANDLED','Claim already handled');
      claim.status=action.type==='CONFIRM_CASH'?'awaiting_reconciliation':'disputed';
      log(s,action.type,claim.status==='disputed'?'Member disputed the cash claim':'Member confirmed handover; bank settlement still unverified',actor.id,g.id,claim.id);return s;
    }
    if(action.type==='SIMULATE_CASH_RECONCILIATION') {
      const claim=s.cashClaims.find(c=>c.id===action.claimId);assert(claim&&claim.groupId===g.id,'CLAIM_NOT_FOUND','Unknown cash claim');
      assert(g.signerIds.includes(actor.id),'NOT_SIGNER','Signer required');assert(actor.id!==claim.memberId,'SEPARATE_CONFIRMATION','Member cannot settle own claim');
      assert(claim.status==='awaiting_reconciliation','NOT_RECONCILABLE','Member confirmation required first');
      assert(!s.contributions.some(c=>c.groupId===g.id&&c.userId===claim.memberId&&c.cycle===claim.cycle&&c.status==='simulated_verified'),'DUPLICATE_CONTRIBUTION','Already counted for this cycle');
      claim.status='simulated_reconciled';g.rotationCents+=claim.rotationCents;g.reserveCents+=claim.reserveCents;
      s.contributions.push({id:nextId(s,'contribution'),groupId:g.id,userId:claim.memberId,cycle:claim.cycle,rotationCents:claim.rotationCents,reserveCents:claim.reserveCents,status:'simulated_verified',label:'MOCK RECONCILIATION ONLY'});
      log(s,'SIMULATE_RECONCILIATION','MOCK settlement evidence accepted in demo only; no bank proof',actor.id,g.id,claim.id);return s;
    }

    if(action.type==='ACK_GROUP_RULES') {
      assert(!s.acknowledgements.some(x=>x.groupId===g.id&&x.memberId===actor.id&&x.cycle===g.cycle),'ALREADY_ACKNOWLEDGED','Already acknowledged this cycle');
      s.acknowledgements.push({id:nextId(s,'ack'),groupId:g.id,memberId:actor.id,cycle:g.cycle,at:new Date().toISOString()});
      log(s,'ACK_RULES','Acknowledged draft group rules and no-guarantee reserve policy',actor.id,g.id);return s;
    }
    if(action.type==='FILE_DISPUTE') {
      const subject=String(action.subject||'general');assert(['general','cash','payout','bill','loan'].includes(subject),'SUBJECT','Invalid dispute category');
      const reason=String(action.reason||'').trim();assert(reason.length>=8&&reason.length<=350,'REASON_REQUIRED','Explain the issue in 8–350 characters');
      const id=nextId(s,'dispute');s.disputes.push({id,groupId:g.id,memberId:actor.id,subject,reason,status:'open',createdAt:new Date().toISOString()});
      log(s,'DISPUTE_OPEN',`${subject} dispute opened; no funds frozen by this demo`,actor.id,g.id,id);return s;
    }
    if(action.type==='RESOLVE_DISPUTE') {
      const d=s.disputes.find(x=>x.id===action.disputeId&&x.groupId===g.id);assert(d,'DISPUTE_NOT_FOUND','Dispute does not belong to this group');
      assert(d.status==='open','ALREADY_RESOLVED','Dispute already resolved');assert(g.signerIds.includes(actor.id)&&actor.id!==d.memberId,'NOT_INDEPENDENT','Independent authorized committee member needed');
      const decision=String(action.decision||'').trim();assert(decision.length>=8&&decision.length<=350,'REASON_REQUIRED','Decision must include an explanation');
      d.status='resolved_demo';d.decision=decision;d.resolvedBy=actor.id;d.resolvedAt=new Date().toISOString();
      log(s,'DISPUTE_RESOLUTION','DEMO resolution documented; original record preserved',actor.id,g.id,d.id);return s;
    }
    if(action.type==='CREATE_BILL') {
      assert(g.signerIds.includes(actor.id),'NOT_SIGNER','Authorized committee member required to create group expense');
      const title=String(action.title||'').trim();assert(title.length>=3&&title.length<=90,'TITLE','Bill title must be 3–90 characters');
      const cents=action.totalCents;assert(positiveInt(cents)&&cents<=100000000,'AMOUNT','Enter a positive amount within the demo limit');
      const weights=action.weights||null;const shares=splitBill(cents,g.memberIds,action.mode||'equal',weights);
      const bill={id:nextId(s,'bill'),groupId:g.id,title,totalCents:cents,mode:action.mode||'equal',createdBy:actor.id,createdAt:new Date().toISOString(),shares:shares.map(x=>({...x,status:'unpaid_demo'}))};
      s.bills.push(bill);log(s,'BILL_CREATE',`Created group expense ${title} · ${money(cents)}; no money collected`,actor.id,g.id,bill.id);return s;
    }
    if(action.type==='SIMULATE_BILL_SHARE') {
      const b=s.bills.find(x=>x.id===action.billId&&x.groupId===g.id);assert(b,'BILL_NOT_FOUND','Bill is not in your group');
      const item=b.shares.find(x=>x.memberId===actor.id);assert(item,'OUTSIDER','No bill share for this member');
      assert(item.status==='unpaid_demo','DUPLICATE_SHARE','This sample share is already marked');
      item.status='simulated_settled';item.paidAt=new Date().toISOString();
      log(s,'BILL_SIMULATED',`DEMO: share marked ${money(item.cents)}; no verified settlement`,actor.id,g.id,b.id);return s;
    }
    if(action.type==='REQUEST_LOAN') {
      const cents=action.principalCents;assert(positiveInt(cents)&&cents<=100000000,'AMOUNT','Enter a positive loan amount within the demo limit');
      assert(!s.loans.some(l=>l.groupId===g.id&&l.borrowerId===actor.id&&l.status==='pending'),'LOAN_PENDING','You already have a pending demo loan request');
      const id=nextId(s,'loan');s.loans.push({id,groupId:g.id,borrowerId:actor.id,principalCents:cents,owedCents:0,approvals:[],status:'pending',createdAt:new Date().toISOString(),repaymentClaims:[]});
      log(s,'LOAN_REQUEST',`Records-only loan request ${money(cents)}; nothing disbursed`,actor.id,g.id,id);return s;
    }
    if(action.type==='APPROVE_LOAN') {
      const l=s.loans.find(x=>x.id===action.loanId&&x.groupId===g.id);assert(l,'LOAN_NOT_FOUND','Loan is not in your group');
      assert(l.status==='pending','NOT_PENDING','Loan is not pending');assert(g.signerIds.includes(actor.id),'NOT_SIGNER','Authorized member required');
      assert(actor.id!==l.borrowerId,'SELF_APPROVAL','Loan requester cannot approve');assert(!l.approvals.includes(actor.id),'DUPLICATE_VOTE','Already approved');
      l.approvals.push(actor.id);if(l.approvals.length===2)l.status='approved_records_only';
      log(s,'LOAN_REVIEW',`${l.approvals.length}/2 loan review approvals; NO loan disbursement`,actor.id,g.id,l.id);return s;
    }
    fail('UNKNOWN_ACTION','Unsupported action type');
  }
  function locale(id) {return COPY[id]||COPY.en;}
  function menuView(state,groupId,memberId,language,selection='menu') {
    const g=group(state,groupId); const m=identity(state,memberId);inGroup(g,m.id);
    const l=locale(language || m.lang);const choice=String(selection).trim().toUpperCase();
    const opener=l.welcome+' — '+g.name+'\n';
    if(choice==='0'||choice==='LANG')return opener+'LANG 1–12 (SMS) or use the USSD language keypad\n'+LOCALES.map((code,i)=>`${i+1} ${COPY[code].language}`).join('\n')+'\nDraft translations; no money moved.';
    if(choice==='1'||choice==='BAL')return opener+l.balance+': '+money(g.rotationCents)+'\n'+l.reserve+': '+money(g.reserveCents)+'\n'+l.pending;
    if(choice==='2'||choice==='CONTRIB') {const n=state.contributions.filter(c=>c.groupId===g.id&&c.userId===m.id&&c.status==='simulated_verified').length;return opener+l.contribution+': '+money(n*(g.contributionCents+g.reserveContributionCents))+' (DEMO)\n'+l.pending;}
    if(choice==='3'||choice==='NEXT')return opener+l.next+': '+(state.members.find(x=>x.id===g.payoutOrder[g.cycle-1])?.name||'Cycle finished')+'\n'+l.pending;
    if(choice==='4'||choice==='RESERVE')return opener+l.reserve+': '+money(g.reserveCents)+'\n'+l.pending;
    if(choice==='9'||choice==='HELP')return opener+l.help;
    if(choice==='ALERTS')return opener+'Blocked demo actions: '+(state.alerts||[]).filter(a=>a.groupId===g.id).length+'. Security notifications are not sent.';
    if(choice==='BILLS')return opener+'Group bills (DEMO): '+state.bills.filter(b=>b.groupId===g.id).length+' created. Use the web app for details.';
    if(choice==='LOANS')return opener+'Records-only loan requests (DEMO): '+state.loans.filter(b=>b.groupId===g.id).length+' created. No loans funded.';
    if(choice==='DISPUTE')return opener+'Dispute support: use the web app or your verified group committee. No real message sent.';
    return opener+(choice==='MENU'?'':l.unknown+'\n')+l.menu+'\n'+l.pending;
  }
  function recordBlockedDemoAttempt(previous,{groupId,actorId,code}) {
    const allowed=['SELF_APPROVAL','DUPLICATE_VOTE','NOT_SIGNER','REQUEST_NOT_FOUND','INSUFFICIENT_ROTATION','DUPLICATE_PAYOUT','NOT_AUTHORIZED','OUTSIDER','SEPARATE_CONFIRMATION','DUPLICATE_CASH'];
    assert(allowed.includes(code),'ALERT_TYPE','Only known demo-rule failures may generate alerts');
    const s=copyState(previous);const g=group(s,groupId);const a=identity(s,actorId);
    // The test UI uses selectable identities. For an outsider attempt, the report is logged as an anonymous blocked event.
    const isMember=g.memberIds.includes(a.id);
    const id=nextId(s,'alert');s.alerts.push({id,groupId:g.id,actorId:isMember?a.id:null,code,at:new Date().toISOString(),status:'DEMO_ONLY'});
    log(s,'BLOCKED_DEMO_ATTEMPT','DEMO blocked rule: '+code,isMember?a.id:null,g.id,id);return s;
  }
  function smsReply(state,groupId,memberId,command,lang) { return menuView(state,groupId,memberId,lang,command); }
  function smsSegments(message) {
    const unicode=/[^\x00-\x7F]/.test(message); const size=unicode?70:160; const multi=unicode?67:153;
    return {encoding:unicode?'Unicode (conservative estimate)':'GSM-compatible ASCII estimate',segments:message.length<=size?1:Math.ceil(message.length/multi),characters:message.length};
  }
  return Object.freeze({VERSION,COPY,LOCALES,money,createDemoState,createConfiguredDemoState,applyAction,riskSummary,menuView,smsReply,smsSegments,splitBill,payoutPolicyPreview,recordBlockedDemoAttempt});
});
