'use strict';
const byId = id => document.getElementById(id);
const fmtDate = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const safeUrl = (value, hosts) => {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:') return null;
    if (hosts && !hosts.includes(u.hostname)) return null;
    return u.href;
  } catch (e) { return null; }
};
function el(tag, text, attrs) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
  return node;
}
function link(text, href) {
  return el('a', text, { href, rel: 'noopener noreferrer' });
}

/* ---------- Lobbying register ---------- */
function renderLobbying(records) {
  const summary = byId('lobby-records');
  const list = byId('lobby-list');
  const yearSelect = byId('lobby-year');
  const orgSelect = byId('lobby-org');
  const chart = byId('lobby-years');
  if (!records.length) { summary.textContent = 'No verified entries added yet.'; return; }

  const years = [...new Set(records.map(r => r.date.slice(0, 4)))].sort().reverse();
  const orgs = [...new Set(records.flatMap(r => r.orgs))].sort();
  for (const y of years) yearSelect.append(el('option', y, { value: y }));
  for (const o of orgs) orgSelect.append(el('option', o, { value: o }));

  const counts = Object.fromEntries(years.map(y => [y, records.filter(r => r.date.startsWith(y)).length]));
  const max = Math.max(...Object.values(counts));
  for (const y of [...years].reverse()) {
    const row = el('div', null, { class: 'yearrow' });
    row.append(el('span', y), el('i', null, { style: 'width:' + (100 * counts[y] / max) + '%' }), el('b', String(counts[y])));
    chart.append(row);
  }

  function draw() {
    const y = yearSelect.value, o = orgSelect.value;
    const shown = records.filter(r => (!y || r.date.startsWith(y)) && (!o || r.orgs.includes(o)));
    summary.textContent = shown.length + ' of ' + records.length + ' HMRC meetings with tobacco companies about vaping duty or stamps, April 2024 to June 2026';
    list.replaceChildren();
    for (const r of shown) {
      const item = el('p', null, { class: 'record' });
      item.append(el('b', fmtDate(r.date) + ' — ' + r.orgs.join(', ')), el('small', r.topic));
      const href = safeUrl(r.url);
      if (href) item.append(link('HMRC disclosure ↗', href));
      list.append(item);
    }
    if (!shown.length) list.append(el('p', 'No meetings match this filter.'));
  }
  yearSelect.addEventListener('change', draw);
  orgSelect.addEventListener('change', draw);
  draw();
}

/* ---------- Closures ---------- */
function renderClosures(items) {
  const box = byId('closure-records');
  const completed = items.filter(x => x.status === 'closed').length;
  const announced = items.filter(x => x.status === 'announced').length;
  box.textContent = items.length ? completed + ' confirmed completed; ' + announced + ' announced' : 'No verified entries added yet.';
  for (const item of items) {
    const p = el('p', null, { class: 'record' });
    p.append(el('b', fmtDate(item.date) + ' — ' + item.title));
    if (item.reason) p.append(el('small', item.reason + ' Job losses: not disclosed.'));
    const href = safeUrl(item.url);
    if (href) p.append(link('Company statement ↗', href));
    box.append(p);
  }
}

/* ---------- Insolvencies and job losses ---------- */
function renderInsolvencies(data) {
  const items = data.insolvencies || [];
  byId('insolvency-note').textContent = data.insolvencyNote || '';
  const box = byId('insolvency-list');
  for (const item of items) {
    const p = el('p', null, { class: 'record' });
    p.append(el('b', item.name + ' (' + item.companyNumber + ')'));
    p.append(el('small', item.notice + ', Gazette ' + fmtDate(item.gazetteDate) + '. Companies House status: ' + item.companiesHouseStatus + '. Reason for failure: not stated. Jobs affected: not disclosed.'));
    const ch = safeUrl(item.sources.companiesHouse), gz = safeUrl(item.sources.gazette);
    if (ch) p.append(link('Companies House \u2197', ch));
    if (ch && gz) p.append(document.createTextNode(' \u00b7 '));
    if (gz) p.append(link('The Gazette \u2197', gz));
    box.append(p);
  }
  const cases = (data.closures || []).concat(items);
  const known = cases.filter(c => typeof c.jobs === 'number');
  const total = known.reduce((n, c) => n + c.jobs, 0);
  byId('job-summary').textContent = known.length
    ? total + ' job losses documented across ' + known.length + ' of ' + cases.length + ' recorded cases. Cases without a published figure are not counted as zero.'
    : 'No job-loss figure has been published for any of the ' + cases.length + ' cases on this page, so none are counted. Unknown is not zero, and we do not add estimates to confirmed figures. If you have a sourced figure, use the form below.';
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(path);
  return response.json();
}

async function loadTracker() {
  try {
    const data = await loadJson('./data/records.json');
    renderLobbying(data.lobbying || []);
    renderClosures(data.closures || []);
    renderInsolvencies(data);
  } catch (e) {
    for (const id of ['lobby-records', 'closure-records']) byId(id).textContent = 'Register unavailable.';
  }
  try {
    const data = await loadJson('./data/news.json');
    byId('news-status').textContent = data.updated ? 'Last refreshed: ' + fmtDate(data.updated) + '. Source: GOV.UK.' : 'Awaiting first successful refresh.';
    const box = byId('news-items');
    for (const item of (data.items || []).slice(0, 12)) {
      const href = safeUrl(item.url);
      if (!href) continue;
      const a = link('', href);
      a.append(el('b', item.title), el('small', [fmtDate(item.date), item.category].filter(Boolean).join(' · ')));
      box.append(a);
    }
  } catch (e) {
    byId('news-status').textContent = 'News feed unavailable.';
  }
  try {
    const data = await loadJson('./data/reddit.json');
    const status = byId('reddit-status');
    status.textContent = data.updated ? 'Community posts, unverified. Last successful refresh: ' + fmtDate(data.updated) : 'No community posts imported yet. Use the search link below.';
    for (const item of (data.items || [])) {
      const href = safeUrl(item.url, ['reddit.com', 'www.reddit.com']);
      if (!href) continue;
      byId('reddit-items').append(link(item.title, href));
    }
  } catch (e) {
    byId('reddit-status').textContent = 'Community feed unavailable. Use the search link below.';
  }
}
loadTracker();
