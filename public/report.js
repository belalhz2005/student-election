const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props); // textContent only: names are untrusted input
  n.append(...kids); return n;
};
let S = null;
window.onLang = () => { if (S) render(); };
$('print').onclick = () => window.print();
$('inc').onchange = () => render();
fetch('/api/admin/state').then((r) => (r.ok ? r.json() : Promise.reject()))
  .then((s) => { S = s; $('report').hidden = false; render(); })
  .catch(() => { $('need').hidden = false; });

const row = (...cells) => el('tr', {}, ...cells.map((c) => el('td', { textContent: c, dir: 'auto' })));
const table = (head, rows) => el('table', {}, el('thead', {}, el('tr', {}, ...head.map((h) => el('th', { textContent: t(h) })))), el('tbody', {}, ...rows));

function render() {
  $('meta').textContent = `${t('r_generated', when(Date.now()))} · ${t(S.open ? 'st_open' : 'st_closed')} · ${t('total', S.totalVotes)}`;
  const kids = S.cohorts.map((c) => {
    const rows = c.candidates.map((x, i) => {
      const tr = row(i + 1, x.name, x.votes, c.totalVotes ? ((100 * x.votes) / c.totalVotes).toFixed(1) + '%' : '-');
      if (c.result.names.includes(x.name)) tr.className = 'win';
      return tr;
    });
    const turnout = c.eligible ? t('turnout', c.totalVotes, c.eligible, Math.round((100 * c.totalVotes) / c.eligible)) : t('votes_n', c.totalVotes);
    const outcome = c.result.status === 'none' ? t('r_none') : (S.open ? t('leading') : t(c.result.status === 'tie' ? 'tie' : 'winner')) + c.result.names.join(' / ');
    return el('div', { className: 'card' },
      el('h2', { textContent: c.label, dir: 'auto' }),
      el('p', { className: 'mute', textContent: t('prefix_line', c.prefix, turnout) }),
      c.candidates.length ? table(['th_rank', 'th_cand', 'th_votes', 'th_pct'], rows) : el('p', { className: 'mute', textContent: t('no_cands') }),
      el('p', { className: 'outcome', textContent: outcome, dir: 'auto' }));
  });
  if ($('inc').checked) {
    const sorted = [...S.voters].sort((a, b) => a.year.localeCompare(b.year) || a.name.localeCompare(b.name));
    kids.push(el('div', { className: 'card' }, el('h2', { textContent: t('tab_voters') }), table(['th_id', 'th_name', 'th_year'], sorted.map((v) => row(v.uniId, v.name, v.year)))));
  }
  $('body').replaceChildren(...kids);
}

applyLang();
