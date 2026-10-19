const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props); // textContent only: names are untrusted input
  n.append(...kids); return n;
};
let S = null, tab = 'results';

async function api(url, body) {
  const r = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/api/admin/login') location.reload();
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
}
const note = (text, bad) => { const n = $('note'); n.textContent = text; n.className = 'msg ' + (bad ? 'err' : 'ok'); n.hidden = !text; };
const act = async (fn) => { try { note(''); await fn(); } catch (e) { note(errMsg(e.message), true); } };

$('lf').onsubmit = async (e) => {
  e.preventDefault();
  try { await api('/api/admin/login', { password: $('pw').value }); start(); }
  catch (err) { $('le').textContent = errMsg(err.message); $('le').hidden = false; }
};
$('logout').onclick = async () => { await api('/api/admin/logout', {}); location.reload(); };

async function start() {
  S = await api('/api/admin/state');
  $('login').hidden = true; $('app').hidden = false;
  render();
  setInterval(async () => { if (tab === 'results' || tab === 'voters') { S = await api('/api/admin/state').catch(() => S); render(); } }, 10000);
}
api('/api/admin/state').then(() => start()).catch(() => {});

$('tabs').onclick = (e) => {
  const x = e.target.dataset.t; if (!x) return;
  tab = x;
  for (const b of $('tabs').children) b.classList.toggle('on', b.dataset.t === x);
  for (const id of ['results', 'voters', 'setup', 'tools']) $('t-' + id).hidden = id !== x;
  render();
};

$('toggle').onclick = () => act(async () => { S = await api('/api/admin/election', { open: !S.open }); render(); });

window.onLang = () => { if (S) render(); };

function render() {
  $('st').textContent = t(S.open ? 'st_open' : 'st_closed');
  $('st').className = 'badge ' + (S.open ? 'open' : 'closed');
  $('toggle').textContent = t(S.open ? 'btn_close' : 'btn_open');
  ({ results: renderResults, voters: renderVoters, setup: renderSetup, tools: renderTools })[tab]();
}

function renderResults() {
  const kids = [el('p', { className: 'mute', textContent: t('total', S.totalVotes) })];
  for (const c of S.cohorts) {
    const max = Math.max(1, ...c.candidates.map((x) => x.votes));
    const head = el('div', { className: 'row' }, el('h2', { textContent: c.label, dir: 'auto' }));
    if (c.result.status !== 'none') {
      const lead = S.open ? t('leading') : t(c.result.status === 'tie' ? 'tie' : 'winner');
      head.append(el('span', { className: 'badge ' + (c.result.status === 'tie' ? 'tie' : 'win'), dir: 'auto', textContent: lead + c.result.names.join(' / ') }));
    }
    const turnout = c.eligible ? t('turnout', c.totalVotes, c.eligible, Math.round((100 * c.totalVotes) / c.eligible)) : t('votes_n', c.totalVotes);
    const card = el('div', { className: 'card' }, head, el('p', { className: 'mute', textContent: t('prefix_line', c.prefix, turnout) }));
    if (!c.candidates.length) card.append(el('p', { className: 'mute', textContent: t('no_cands') }));
    for (const x of c.candidates) {
      const bar = el('div', { className: 'bar' }, el('i'));
      bar.firstChild.style.width = (100 * x.votes) / max + '%';
      card.append(el('div', { className: 'res' }, el('div', { className: 'top' }, el('span', { textContent: x.name, dir: 'auto' }), el('b', { textContent: x.votes })), bar));
    }
    kids.push(card);
  }
  $('t-results').replaceChildren(...kids);
}

function renderVoters() {
  const fy = $('fy'), cur = fy.value;
  fy.replaceChildren(el('option', { value: '', textContent: t('all_years') }), ...S.cohorts.map((c) => el('option', { value: c.label, textContent: c.label })));
  fy.value = cur;
  const q = $('q').value.trim().toLowerCase();
  const rows = S.voters.filter((v) => (!fy.value || v.year === fy.value) && (!$('flagged').checked || v.nameMismatch || v.sameDevice) && (!q || v.uniId.includes(q) || v.name.toLowerCase().includes(q)));
  $('vcount').textContent = t('voters_shown', rows.length, S.voters.length);
  $('vb').replaceChildren(...rows.slice(0, 1500).map((v) => el('tr', {}, el('td', { textContent: when(v.ts) }), el('td', { textContent: v.uniId }),
    el('td', { textContent: (v.nameMismatch ? '⚠ ' : '') + (v.sameDevice ? '📱 ' : '') + v.name + (v.sameDevice ? ` (${t('same_phone', v.sameDevice)})` : ''), dir: 'auto' }),
    el('td', { textContent: v.year, dir: 'auto' }),
    el('td', {}, el('button', { className: 'ghost sm', textContent: t('btn_cancelvote'), onclick: () => cancelVote(v) })))));
  $('ab').replaceChildren(...S.attempts.map((a) => el('tr', {}, el('td', { textContent: when(a.ts) }), el('td', { textContent: a.uniId }),
    el('td', { textContent: a.name, dir: 'auto' }), el('td', { textContent: errMsg(a.reason) }))));
}
$('q').oninput = $('fy').onchange = $('flagged').onchange = () => renderVoters();
function cancelVote(v) {
  if (!confirm(t('confirm_cancel', v.name, v.uniId))) return;
  act(async () => { S = await api('/api/admin/vote/cancel', { uniId: v.uniId }); render(); });
}

function renderSetup() {
  $('cohorts').replaceChildren(...S.cohorts.map((c) => {
    const list = c.candidates.map((x) => el('div', { className: 'row' }, el('span', { textContent: t('cand_votes', x.name, x.votes), dir: 'auto' }),
      el('button', { className: 'ghost sm', textContent: t('btn_remove'), onclick: () => act(async () => { S = await api('/api/admin/candidate/delete', { id: x.id }); render(); }) })));
    const inp = el('input', { placeholder: t('ph_cand'), dir: 'auto' });
    const add = el('button', { textContent: t('btn_addcand'), onclick: () => act(async () => { S = await api('/api/admin/candidate', { cohortId: c.id, name: inp.value }); render(); }) });
    const del = el('button', { className: 'ghost sm', textContent: t('btn_delyear'), onclick: () => act(async () => { S = await api('/api/admin/cohort/delete', { id: c.id }); render(); }) });
    return el('div', { className: 'card' }, el('div', { className: 'row' }, el('h2', { textContent: `${c.label} (${c.prefix})`, dir: 'auto' }), del), ...list, el('div', { className: 'row mt' }, inp, add));
  }));
}
$('cf').onsubmit = (e) => { e.preventDefault(); act(async () => { S = await api('/api/admin/cohort', { prefix: $('cp').value, label: $('cl').value }); $('cp').value = $('cl').value = ''; render(); }); };

function renderTools() {
  $('rinfo').textContent = S.rosterSize ? t('roster_active', S.rosterSize) : t('roster_none');
  fetch('/link.txt').then((r) => (r.ok ? r.text() : Promise.reject())).then((u) => {
    $('qr').src = '/qr.png?' + Date.now(); $('qrlink').textContent = u.trim(); $('qrbox').hidden = false;
  }).catch(() => { $('qrbox').hidden = true; });
}
$('imp').onclick = () => act(async () => { const d = await api('/api/admin/roster', { text: $('rt').value }); S = d.state; $('rt').value = ''; note(t('imported', d.imported, d.skipped)); render(); });
$('clr').onclick = () => act(async () => { S = await api('/api/admin/roster/clear', {}); render(); });
$('rs').onclick = () => act(async () => { S = await api('/api/admin/reset', { confirm: $('rc').value }); $('rc').value = ''; note(t('reset_done')); render(); });

applyLang();
