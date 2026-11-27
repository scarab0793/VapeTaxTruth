'use strict';
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
const number = id => Math.max(0, Number($(id).value) || 0);
const DUTY_PER_ML = 0.22; // £2.20 per 10 ml, Finance Act 2026 s.115
const VAT = 1.2;
let mode = 'diy';

function calculate() {
  let volume;
  if (mode === 'diy') {
    volume = 0;
    for (const [field, scope] of [['base', 'scope-base'], ['nic', 'scope-nic'], ['flavour', 'scope-flavour']]) {
      if ($(scope).checked) volume += number(field);
    }
  } else {
    volume = number('bottle') * number('units');
  }
  const spend = number('spend');
  const pass = number('pass') / 100;
  const duty = volume * DUTY_PER_ML;
  const added = duty * pass * ($('vat').checked ? VAT : 1);
  const total = spend + added;
  $('pass-label').textContent = Math.round(pass * 100) + '%';
  $('volume').textContent = volume.toLocaleString('en-GB', { maximumFractionDigits: 2 }) + ' ml';
  $('oldcost').textContent = money(spend);
  $('newcost').textContent = money(total);
  $('increase').textContent = '+' + money(added);
  $('annual').textContent = money(added * 12);
  $('duty').textContent = money(duty);
  $('pct').textContent = spend > 0 ? (added / spend * 100).toFixed(1) + '%' : 'N/A';
  $('barbase').style.width = (total ? 100 * spend / total : 0) + '%';
  $('barduty').style.width = (total ? 100 * added / total : 0) + '%';
}

for (const field of document.querySelectorAll('#calc-form input')) {
  field.addEventListener('input', calculate);
  field.addEventListener('change', calculate);
}
for (const tab of document.querySelectorAll('[data-mode]')) {
  tab.addEventListener('click', () => {
    mode = tab.dataset.mode;
    $('diy-fields').hidden = mode !== 'diy';
    $('retail-fields').hidden = mode !== 'retail';
    for (const t of document.querySelectorAll('[data-mode]')) {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    }
    calculate();
  });
}
$('reset').addEventListener('click', () => {
  for (const [id, value] of Object.entries({ base: 500, nic: 180, flavour: 120, bottle: 10, units: 20, spend: 40, pass: 100 })) $(id).value = value;
  for (const id of ['scope-base', 'scope-nic', 'scope-flavour', 'vat']) $(id).checked = true;
  calculate();
});
$('copy').addEventListener('click', () => {
  const value = 'VapeTaxTruth — UK vape duty estimate\n' +
    'Monthly volume in scope: ' + $('volume').textContent + '\nCurrent spend: ' + $('oldcost').textContent +
    '\nEstimated new spend: ' + $('newcost').textContent + '\nAdded per month: ' + $('increase').textContent +
    '\nAnnual increase: ' + $('annual').textContent + '\nScenario estimate, not a shop quote.\nhttps://scarab0793.github.io/VapeTaxTruth/';
  const done = () => { $('copy').textContent = 'Copied!'; setTimeout(() => { $('copy').textContent = 'Copy these results'; }, 1600); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(value).then(done).catch(() => window.prompt('Copy the text:', value));
  else window.prompt('Copy the text:', value);
});
calculate();

/* ---------- Report form ---------- */
(function reportForm() {
  const form = $('evidence-form');
  if (!form) return;
  const status = $('report-status');
  const button = form.querySelector('button[type=submit]');
  const COOLDOWN_MS = 60000;

  function show(message, kind) {
    status.textContent = message;
    status.className = 'formstatus ' + kind;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    let last = 0;
    try { last = Number(localStorage.getItem('vtt-last-report')) || 0; } catch (e) { /* storage unavailable */ }
    if (Date.now() - last < COOLDOWN_MS) {
      show('Please wait a minute before sending another report.', 'warn');
      return;
    }
    button.disabled = true;
    show('Sending…', 'info');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(form)),
        signal: controller.signal
      });
      const reply = (await response.text()).trim();
      if (response.ok && reply === 'OK') {
        form.reset();
        try { localStorage.setItem('vtt-last-report', String(Date.now())); } catch (e) { /* ignore */ }
        show('Thank you. Your report has been received and will be reviewed before publication.', 'ok');
      } else if (reply === 'Rejected') {
        show('The report was not accepted. Please check the details and try again.', 'error');
      } else {
        show('We could not confirm that your report was received. Please check before trying again.', 'error');
      }
    } catch (error) {
      show('We could not confirm that your report was received. Please check before trying again.', 'error');
    } finally {
      clearTimeout(timer);
      button.disabled = false;
    }
  });
})();
