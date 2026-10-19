const $ = (id) => document.getElementById(id);
const show = (id) => { for (const s of ['closed', 's1', 's2', 's3']) $(s).hidden = s !== id; };
let chosen = null;

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.');
  return d;
}
function deviceId() {
  try {
    let d = localStorage.getItem('dev');
    if (!/^[a-f0-9]{32}$/.test(d || '')) {
      d = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('dev', d);
    }
    return d;
  } catch { return null; } // storage blocked: no flag, the vote still works
}
const details = () => ({ fullName: $('name').value, uniId: $('uid').value });
const fail = (id, err) => { $(id).textContent = errMsg(err.message); $(id).hidden = false; };

fetch('/api/status').then((r) => r.json()).then((s) => {
  $('uid').maxLength = s.idLength;
  show(s.open ? 's1' : 'closed');
});

$('s1').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('e1').hidden = true; $('go').disabled = true;
  try {
    const d = await post('/api/check', details());
    $('yr').textContent = d.year;
    $('cands').replaceChildren(...d.candidates.map((c) => {
      const l = document.createElement('label'); l.className = 'cand';
      const i = document.createElement('input'); i.type = 'radio'; i.name = 'c'; i.value = c.id;
      i.onchange = () => { chosen = c.id; $('vote').disabled = false; };
      const t = document.createElement('span'); t.textContent = c.name; t.dir = 'auto';
      l.append(i, t); return l;
    }));
    chosen = null; $('vote').disabled = true;
    show('s2');
  } catch (err) { fail('e1', err); }
  $('go').disabled = false;
});

$('back').onclick = () => show('s1');

$('s2').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('e2').hidden = true; $('vote').disabled = true;
  try {
    await post('/api/vote', { ...details(), candidateId: chosen, device: deviceId() });
    $('name').value = ''; $('uid').value = '';
    show('s3');
  } catch (err) { fail('e2', err); $('vote').disabled = false; }
});

applyLang();
