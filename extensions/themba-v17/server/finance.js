'use strict';
const money = n => { if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1e9) throw new RangeError('Invalid non-negative monetary amount'); return Math.round(n*100); };
const rate = (n,max=100) => {if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>max) throw new RangeError('Invalid percentage');return n;};
const round = c => Math.round(c)/100;
function quoteLoan({principal, annualRatePct, months, monthlyIncome, existingMonthlyDebt=0}) {
 const p=money(principal), annual=rate(annualRatePct,60), n=months, income=money(monthlyIncome), debt=money(existingMonthlyDebt);
 if (!Number.isInteger(n)||n<1||n>60||p===0) throw new RangeError('Invalid principal or loan term');
 const r=annual/1200; const installmentCents=r===0?Math.ceil(p/n):Math.ceil(p*r/(1-Math.pow(1+r,-n)));
 const available=Math.max(0,income-debt); const maxAffordable=Math.floor(available*.3);
 return {principal:round(p),annualRatePct:annual,months:n,monthlyPayment:round(installmentCents),totalRepayment:round(installmentCents*n),totalInterest:round(installmentCents*n-p),existingDebt:round(debt),maxSuggestedInstallment:round(maxAffordable),withinIllustrativeCap:installmentCents<=maxAffordable,disclaimer:'Illustrative calculation; excludes fees, insurance and regulatory affordability assessment. Not an approval.'};
}
function activitySignals({monthsObserved,onTimeContributions,contributionsExpected,meetingAttendance,meetingsExpected,previousLoansPaidOnTime=0,previousLoansDue=0}) {
 for(const v of [monthsObserved,onTimeContributions,contributionsExpected,meetingAttendance,meetingsExpected,previousLoansPaidOnTime,previousLoansDue]) if(!Number.isInteger(v)||v<0) throw new RangeError('Activity counts must be non-negative integers');
 if(monthsObserved>120||onTimeContributions>contributionsExpected||meetingAttendance>meetingsExpected||previousLoansPaidOnTime>previousLoansDue) throw new RangeError('Inconsistent activity counts');
 const contributionRatio=contributionsExpected?onTimeContributions/contributionsExpected:null;
 const attendanceRatio=meetingsExpected?meetingAttendance/meetingsExpected:null;
 const repaymentRatio=previousLoansDue?previousLoansPaidOnTime/previousLoansDue:null;
 const fields=[contributionRatio,attendanceRatio,repaymentRatio].filter(x=>x!==null);
 return {monthsObserved,contributionRatio,attendanceRatio,repaymentRatio,historyCoverage:fields.length,activitySummary:fields.length?Math.round(fields.reduce((a,b)=>a+b,0)/fields.length*100):null,notice:'Descriptive group participation only; not a credit score or automatic lending eligibility.'};
}
function inflationTarget({currentSavings,annualInflationPct,years,annualSavingsYieldPct=0}) {
 const savings=money(currentSavings), inflation=rate(annualInflationPct,100), yieldRate=rate(annualSavingsYieldPct,100);
 if(typeof years!=='number'||!Number.isFinite(years)||years<0||years>40) throw new RangeError('Invalid time horizon');
 const futureCosts=round(savings*Math.pow(1+inflation/100,years));
 const futureSavings=round(savings*Math.pow(1+yieldRate/100,years));
 return {currentSavings:round(savings),futureCostEquivalent:futureCosts,illustrativeFutureSavings:futureSavings,realPurchasingPowerToday:round(futureSavings/Math.pow(1+inflation/100,years)),gapToMaintainTarget:round(Math.max(0,(futureCosts-futureSavings)*100)),notice:'Inflation and yields are assumptions. No guaranteed growth.'};
}
function validateGuarantor({borrowerId,guarantorId,consent,consentRecordedAt,identityVerified=false}) {
 if(typeof borrowerId!=='string'||typeof guarantorId!=='string'||!borrowerId.trim()||!guarantorId.trim()||borrowerId===guarantorId) return {eligibleForReview:false,reason:'Distinct borrower and guarantor required'};
 if(consent!==true || !identityVerified || !Number.isFinite(Date.parse(consentRecordedAt))) return {eligibleForReview:false,reason:'Verified guarantor with recorded explicit consent required'};
 return {eligibleForReview:true,reason:'Consent prerequisites met; independent financial/legal review still required'};
}
module.exports={quoteLoan,activitySignals,inflationTarget,validateGuarantor};
