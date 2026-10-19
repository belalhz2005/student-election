'use strict';
// Student council election server. Zero dependencies (Node 18+).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 3000;
const ID_LENGTH = +process.env.ID_LENGTH || 7;
const MIN_NAME_WORDS = +process.env.MIN_NAME_WORDS || 2;
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const RATE_LIMIT = +process.env.RATE_LIMIT || 120; // requests per minute per IP; students on one campus Wi-Fi share an IP, so raise it for election day
const PUBLIC = path.join(__dirname, 'public');
const store = require('./storage')(process.env.DATA_DIR || path.join(__dirname, 'data'));

let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = crypto.randomBytes(6).toString('hex');
  console.log(`\n  No ADMIN_PASSWORD set. Temporary admin password: ${ADMIN_PASSWORD}\n`);
}
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();

// ---------- data ----------
const uid = () => crypto.randomBytes(5).toString('hex');

function defaultDb() {
  // Student ID = 2 + intake year (YY) + serial, e.g. 2240207 -> intake 24/25.
  // Edit these in the admin dashboard if your numbering differs.
  const seed = [
    ['222', 'Year 5 / السنة الخامسة (22/23)'],
    ['223', 'Year 4 / السنة الرابعة (23/24)'],
    ['224', 'Year 3 / السنة الثالثة (24/25)'],
    ['225', 'Year 2 / السنة الثانية (25/26)'],
    ['226', 'Year 1 / السنة الأولى (26/27)'],
  ];
  return {
    open: false,
    cohorts: seed.map(([prefix, label]) => ({ id: uid(), prefix, label })),
    candidates: [],
    roster: [], // [{uniId, name}]
    votes: [], // [{uniId, name, cohortId, candidateId, ts, nameMismatch}]
    attempts: [], // [{ts, uniId, name, reason, ip}]
  };
}

let db, rosterMap, votedSet;
const pending = new Set(); // IDs whose vote is being written right now
function reindex() {
  rosterMap = new Map(db.roster.map((r) => [r.uniId, r.name]));
  votedSet = new Set(db.votes.map((v) => v.uniId));
}
// Turso only: re-read votes from the database (catches a vote saved just as its reply was lost). Throttled.
let lastSync = 0;
async function syncVotes(force) {
  if (!store.loadVotes || (!force && Date.now() - lastSync < 30000)) return;
  lastSync = Date.now();
  const rows = await store.loadVotes();
  const ids = new Set(rows.map((v) => v.uniId));
  db.votes = rows.concat(db.votes.filter((v) => pending.has(v.uniId) && !ids.has(v.uniId)));
  reindex();
}

// ---------- helpers ----------
const normDigits = (s) =>
  s.replace(/[\u0660-\u0669]/g, (d) => d.charCodeAt(0) - 0x660).replace(/[\u06F0-\u06F9]/g, (d) => d.charCodeAt(0) - 0x6f0);

const normName = (s) =>
  s.normalize('NFKC').toLowerCase().replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/\s+/g, ' ').trim();

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s'’.\-]{1,98}[\p{L}\p{M}.]$/u;

function cohortOf(id) {
  // longest matching prefix wins
  return [...db.cohorts].sort((a, b) => b.prefix.length - a.prefix.length).find((c) => id.startsWith(c.prefix));
}

function logAttempt(uniId, name, reason, ip) {
  if (limited('log:' + ip, 30, 60000)) return; // a flood of bad attempts must not burn the database's write quota
  const a = { ts: Date.now(), uniId, name, reason, ip };
  db.attempts.push(a);
  if (db.attempts.length > 2000) db.attempts.splice(0, db.attempts.length - 2000);
  store.addAttempt(db, a).catch(() => {}); // the log must never block or fail a request
}

function clientIp(req) {
  // Behind the Cloudflare tunnel every request comes from localhost; Cloudflare sets cf-connecting-ip (clients cannot forge it).
  if (TRUST_PROXY && req.headers['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']).trim();
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim(); // Render etc.
  return req.socket.remoteAddress || '';
}

const hits = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
  return ++h.n > max;
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 60000).unref();

function send(res, code, body, headers = {}) {
  res.writeHead(code, {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'",
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}
const json = (res, code, obj, h) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...h });

function readBody(req) {
  return new Promise((ok, bad) => {
    let n = 0; const chunks = [];
    req.on('data', (c) => { n += c.length; if (n > 2e6) { bad(new Error('Request too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { bad(new Error('Invalid JSON')); } });
    req.on('error', bad);
  });
}

// ---------- voter validation ----------
function checkVoter(fullName, rawId, ip) {
  if (!db.open) return { code: 403, error: 'Voting is currently closed.' };
  const name = String(fullName || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(name) || name.split(' ').length < MIN_NAME_WORDS)
    return { code: 400, error: 'Please enter your full name (first name and family name at least).' };
  const id = normDigits(String(rawId || '')).trim();
  if (!new RegExp(`^\\d{${ID_LENGTH}}$`).test(id)) return { code: 400, error: `University ID must be exactly ${ID_LENGTH} digits.` };

  const cohort = cohortOf(id);
  if (!cohort) {
    logAttempt(id, name, 'ID does not belong to any academic year in this election', ip);
    return { code: 403, error: 'This ID does not belong to an academic year taking part in this election.' };
  }
  if (rosterMap.size && !rosterMap.has(id)) {
    logAttempt(id, name, 'ID not on the voter roster', ip);
    return { code: 403, error: 'This ID is not on the list of eligible students. Contact the election committee.' };
  }
  if (votedSet.has(id)) {
    logAttempt(id, name, 'Tried to vote twice', ip);
    return { code: 409, error: 'This ID has already voted.' };
  }
  const candidates = db.candidates.filter((c) => c.cohortId === cohort.id);
  if (!candidates.length) return { code: 403, error: 'There are no candidates for your academic year yet.' };
  const rosterName = rosterMap.get(id);
  return { id, name, cohort, candidates, nameMismatch: rosterName !== undefined && normName(rosterName) !== normName(name) };
}

// ---------- admin state ----------
function buildState() {
  const counts = new Map();
  const perCohort = new Map();
  for (const v of db.votes) {
    counts.set(v.candidateId, (counts.get(v.candidateId) || 0) + 1);
    perCohort.set(v.cohortId, (perCohort.get(v.cohortId) || 0) + 1);
  }
  const eligible = new Map();
  for (const r of db.roster) { const c = cohortOf(r.uniId); if (c) eligible.set(c.id, (eligible.get(c.id) || 0) + 1); }

  const cohorts = [...db.cohorts].sort((a, b) => a.prefix.localeCompare(b.prefix)).map((c) => {
    const candidates = db.candidates
      .filter((x) => x.cohortId === c.id)
      .map((x) => ({ id: x.id, name: x.name, votes: counts.get(x.id) || 0 }))
      .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
    const top = candidates.length ? candidates[0].votes : 0;
    const leaders = top > 0 ? candidates.filter((x) => x.votes === top).map((x) => x.name) : [];
    return {
      id: c.id, prefix: c.prefix, label: c.label, candidates,
      totalVotes: perCohort.get(c.id) || 0,
      eligible: eligible.get(c.id) || null,
      result: { status: !leaders.length ? 'none' : leaders.length === 1 ? 'winner' : 'tie', names: leaders },
    };
  });
  const label = new Map(db.cohorts.map((c) => [c.id, c.label]));
  const perDevice = new Map();
  for (const v of db.votes) if (v.device) perDevice.set(v.device, (perDevice.get(v.device) || 0) + 1);
  const sameDevice = (v) => ((perDevice.get(v.device) || 0) > 1 ? perDevice.get(v.device) : 0);
  return {
    open: db.open,
    idLength: ID_LENGTH,
    rosterSize: db.roster.length,
    totalVotes: db.votes.length,
    cohorts,
    voters: db.votes.map((v) => ({ uniId: v.uniId, name: v.name, year: label.get(v.cohortId) || '?', ts: v.ts, nameMismatch: !!v.nameMismatch, sameDevice: sameDevice(v) })).reverse(),
    attempts: db.attempts.slice().reverse().slice(0, 500),
  };
}

function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const csv = (rows) => '\ufeff' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

// ---------- sessions ----------
const sessions = new Map(); // token -> expiry
function isAdmin(req) {
  const m = /(?:^|;\s*)adm=([a-f0-9]+)/.exec(req.headers.cookie || '');
  const exp = m && sessions.get(m[1]);
  if (!exp || exp < Date.now()) return false;
  return true;
}

// ---------- routes ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.txt': 'text/plain; charset=utf-8' };

async function handle(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const ip = clientIp(req);

  // ----- public API -----
  if (p === '/api/status' && req.method === 'GET') return json(res, 200, { open: db.open, idLength: ID_LENGTH });

  if ((p === '/api/check' || p === '/api/vote') && req.method === 'POST') {
    if (limited('v:' + ip, RATE_LIMIT, 60000)) return json(res, 429, { error: 'Too many requests. Please wait a minute.' });
    const body = await readBody(req);
    const v = checkVoter(body.fullName, body.uniId, ip);
    if (v.error) return json(res, v.code, { error: v.error });
    if (p === '/api/check')
      return json(res, 200, { year: v.cohort.label, candidates: v.candidates.map((c) => ({ id: c.id, name: c.name })) });

    const cand = db.candidates.find((c) => c.id === body.candidateId);
    if (!cand) return json(res, 400, { error: 'Please choose a candidate.' });
    if (cand.cohortId !== v.cohort.id) {
      logAttempt(v.id, v.name, 'Tried to vote for a candidate outside their academic year', ip);
      return json(res, 403, { error: 'You can only vote for candidates of your own academic year.' });
    }
    // Reserve the ID synchronously (no await above), so a double-click cannot slip two votes through.
    const vote = { uniId: v.id, name: v.name, cohortId: v.cohort.id, candidateId: cand.id, ts: Date.now(), nameMismatch: v.nameMismatch,
      device: /^[a-f0-9]{16,64}$/.test(String(body.device || '')) ? body.device : null }; // random per-browser id, used only to flag
    db.votes.push(vote); votedSet.add(v.id); pending.add(v.id);
    try {
      await store.addVote(db, vote);
    } catch (e) {
      db.votes = db.votes.filter((x) => x !== vote); votedSet.delete(v.id); // never count a vote that was not saved
      if (e.dup) { await syncVotes(true).catch(() => {}); return json(res, 409, { error: 'This ID has already voted.' }); }
      console.error('Saving a vote failed:', e.message);
      return json(res, 503, { error: 'Could not save your vote. Please try again.' });
    } finally { pending.delete(v.id); }
    return json(res, 200, { ok: true, year: v.cohort.label });
  }

  // ----- admin auth -----
  if (p === '/api/admin/login' && req.method === 'POST') {
    if (limited('l:' + ip, 8, 60000)) return json(res, 429, { error: 'Too many attempts. Wait a minute.' });
    const body = await readBody(req);
    if (!crypto.timingSafeEqual(hash(body.password || ''), hash(ADMIN_PASSWORD))) return json(res, 401, { error: 'Wrong password.' });
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, Date.now() + 8 * 3600e3);
    return json(res, 200, { ok: true }, { 'Set-Cookie': `adm=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}` });
  }

  if (p.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return json(res, 401, { error: 'Not logged in.' });
    const body = req.method === 'POST' ? await readBody(req) : {};
    if (p.includes('/export/')) await syncVotes(true).catch(() => {});
    else if (p === '/api/admin/state') await syncVotes().catch(() => {});

    if (p === '/api/admin/logout') {
      const m = /adm=([a-f0-9]+)/.exec(req.headers.cookie || ''); if (m) sessions.delete(m[1]);
      return json(res, 200, { ok: true }, { 'Set-Cookie': 'adm=; HttpOnly; Path=/; Max-Age=0' });
    }
    if (p === '/api/admin/state') return json(res, 200, buildState());

    if (p === '/api/admin/election') { db.open = !!body.open; await store.saveConfig(db); return json(res, 200, buildState()); }

    if (p === '/api/admin/cohort') {
      const prefix = normDigits(String(body.prefix || '')).trim();
      const label = String(body.label || '').trim().slice(0, 60);
      if (!/^\d{1,6}$/.test(prefix) || prefix.length >= ID_LENGTH) return json(res, 400, { error: 'Prefix must be 1-6 digits (the start of the student ID).' });
      if (!label) return json(res, 400, { error: 'Give the year a name.' });
      const ex = db.cohorts.find((c) => c.prefix === prefix);
      if (ex) ex.label = label; else db.cohorts.push({ id: uid(), prefix, label });
      await store.saveConfig(db); return json(res, 200, buildState());
    }
    if (p === '/api/admin/cohort/delete') {
      if (db.candidates.some((c) => c.cohortId === body.id)) return json(res, 400, { error: 'Delete this year\'s candidates first.' });
      if (db.votes.some((v) => v.cohortId === body.id)) return json(res, 400, { error: 'This year already has votes.' });
      db.cohorts = db.cohorts.filter((c) => c.id !== body.id); await store.saveConfig(db); return json(res, 200, buildState());
    }
    if (p === '/api/admin/candidate') {
      const name = String(body.name || '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 80);
      if (name.length < 2) return json(res, 400, { error: 'Candidate name is too short.' });
      if (!db.cohorts.some((c) => c.id === body.cohortId)) return json(res, 400, { error: 'Unknown year.' });
      db.candidates.push({ id: uid(), cohortId: body.cohortId, name });
      await store.saveConfig(db); return json(res, 200, buildState());
    }
    if (p === '/api/admin/candidate/delete') {
      if (db.votes.some((v) => v.candidateId === body.id)) return json(res, 400, { error: 'This candidate already has votes. Reset the election to remove them.' });
      db.candidates = db.candidates.filter((c) => c.id !== body.id); await store.saveConfig(db); return json(res, 200, buildState());
    }
    if (p === '/api/admin/roster') {
      const seen = new Map(); let skipped = 0;
      for (const line of String(body.text || '').split(/\r?\n/)) {
        if (!line.trim()) continue;
        const [first, ...rest] = line.split(/[,;\t]/);
        const id = normDigits(first.trim());
        const name = rest.join(' ').trim().replace(/\s+/g, ' ');
        if (new RegExp(`^\\d{${ID_LENGTH}}$`).test(id) && name) seen.set(id, name); else skipped++;
      }
      db.roster = [...seen].map(([uniId, name]) => ({ uniId, name }));
      reindex(); await store.saveConfig(db);
      return json(res, 200, { imported: db.roster.length, skipped, state: buildState() });
    }
    if (p === '/api/admin/roster/clear') { db.roster = []; reindex(); await store.saveConfig(db); return json(res, 200, buildState()); }
    if (p === '/api/admin/reset') {
      if (body.confirm !== 'RESET') return json(res, 400, { error: 'Type RESET to confirm.' });
      db.votes = []; db.attempts = []; db.open = false; reindex(); await store.reset(db); return json(res, 200, buildState());
    }
    if (p === '/api/admin/vote/cancel') {
      const id = normDigits(String(body.uniId || '')).trim();
      const vote = db.votes.find((v) => v.uniId === id);
      if (!vote) return json(res, 404, { error: 'No vote found for this ID.' });
      db.votes = db.votes.filter((v) => v !== vote); reindex(); // the student may now vote again
      try { await store.cancelVote(db, id); } catch (e) { db.votes.push(vote); reindex(); throw e; }
      logAttempt(id, vote.name, 'Vote cancelled by admin', 'admin');
      return json(res, 200, buildState());
    }
    if (p === '/api/admin/export/results.txt') {
      const s = buildState();
      const L = [
        'STUDENT COUNCIL ELECTION RESULTS / نتائج انتخابات مجلس الطلبة',
        'Generated / تاريخ التقرير: ' + new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
        'Status / الحالة: ' + (s.open ? 'Voting open / التصويت مفتوح' : 'Voting closed / التصويت مغلق'),
        'Total votes / إجمالي الأصوات: ' + s.totalVotes, '',
      ];
      for (const c of s.cohorts) {
        L.push('='.repeat(50), c.label, `ID prefix / بادئة الرقم: ${c.prefix}   Votes / الأصوات: ${c.totalVotes}` + (c.eligible ? ` (of ${c.eligible} eligible)` : ''), '-'.repeat(50));
        for (const x of c.candidates) L.push(`  ${x.name}: ${x.votes}`);
        L.push(c.result.status === 'winner' ? (s.open ? `  >> LEADING (voting still open) / المتقدم (التصويت لم يُغلق): ${c.result.names[0]}` : `  >> WINNER / الفائز: ${c.result.names[0]}`)
          : c.result.status === 'tie' ? `  >> TIE / تعادل: ${c.result.names.join(' | ')}` : '  >> No votes / لا توجد أصوات', '');
      }
      return send(res, 200, '\ufeff' + L.join('\r\n'), { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': 'attachment; filename="results.txt"' });
    }
    if (p === '/api/admin/export/results.csv' || p === '/api/admin/export/voters.csv') {
      const s = buildState();
      let rows;
      if (p.endsWith('results.csv')) {
        rows = [['Academic year', 'Candidate', 'Votes', 'Outcome']];
        for (const c of s.cohorts) for (const x of c.candidates)
          rows.push([c.label, x.name, x.votes, c.result.names.includes(x.name) ? (c.result.status === 'tie' ? 'TIE' : 'WINNER') : '']);
      } else {
        rows = [['Time', 'University ID', 'Full name', 'Academic year', 'Name differs from roster', 'Votes from same phone']];
        for (const v of s.voters) rows.push([new Date(v.ts).toISOString(), v.uniId, v.name, v.year, v.nameMismatch ? 'yes' : '', v.sameDevice || '']);
      }
      return send(res, 200, csv(rows), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${p.split('/').pop()}"` });
    }
    return json(res, 404, { error: 'Not found' });
  }

  // ----- static files -----
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const rel = p === '/' ? 'index.html' : p === '/admin' ? 'admin.html' : p === '/report' ? 'report.html' : p.slice(1);
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    send(res, 200, data, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  });
}

async function main() {
  db = (await store.load()) || defaultDb();
  reindex();
  await store.saveConfig(db);
  http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      if (!res.headersSent) json(res, 400, { error: e.message === 'Invalid JSON' ? 'Invalid request.' : 'Something went wrong.' });
    });
  }).listen(PORT, () => console.log(`Election server running on http://localhost:${PORT}  (admin: /admin)\nStorage: ${store.name}`));
}
main().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
