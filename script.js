'use strict';
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(n);
const number=id=>Math.max(0,Number($(id).value)||0);
let mode='diy';
function calculate(){
const volume=mode==='diy'?number('base')+number('nic')+number('flavour'):number('bottle')*number('units');
const spend=number('spend'),pass=number('pass')/100;
const duty=volume*0.22,added=duty*pass*($('vat').checked?1.2:1),total=spend+added;
$('pass-label').textContent=Math.round(pass*100)+'%';
$('volume').textContent=volume.toLocaleString('en-GB',{maximumFractionDigits:2})+' ml';
$('oldcost').textContent=money(spend);$('newcost').textContent=money(total);
$('increase').textContent='+'+money(added);$('annual').textContent=money(added*12);
$('duty').textContent=money(duty);
$('pct').textContent=spend>0?(added/spend*100).toFixed(1)+'%':'N/A';
$('barbase').style.width=(total?100*spend/total:0)+'%';
$('barduty').style.width=(total?100*added/total:0)+'%';
}
for(const field of document.querySelectorAll('input'))field.addEventListener('input',calculate);
for(const tab of document.querySelectorAll('[data-mode]'))tab.addEventListener('click',()=>{
mode=tab.dataset.mode;
$('diy-fields').hidden=mode!=='diy';$('retail-fields').hidden=mode!=='retail';
for(const t of document.querySelectorAll('[data-mode]')){const active=t===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',active?'true':'false');}
calculate();
});
$('reset').addEventListener('click',()=>{
for(const [id,value] of Object.entries({base:500,nic:180,flavour:120,bottle:10,units:20,spend:40,pass:100}))$(id).value=value;
$('vat').checked=true;calculate();
});
$('copy').addEventListener('click',()=>{
const value='VapeTaxTruth — UK vape duty estimate\n'+
'Monthly volume: '+$('volume').textContent+'\nCurrent spend: '+$('oldcost').textContent+
'\nEstimated new spend: '+$('newcost').textContent+'\nAdded per month: '+$('increase').textContent+
'\nAnnual increase: '+$('annual').textContent+'\nScenario estimate, not a shop quote.\nhttps://scarab0793.github.io/VapeTaxTruth/';
if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(value).then(()=>{$('copy').textContent='Copied!';setTimeout(()=>$('copy').textContent='Copy these results',1600);}).catch(()=>window.prompt('Copy the text:',value));}
else window.prompt('Copy the text:',value);
});
calculate();