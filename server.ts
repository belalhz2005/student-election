// SPU Dental student council election server: Express API + the React app (built into dist/).
import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  normalizeUniId,
  normalizeArabicName,
  validateStudentName,
  findCohortForId,
  calculateElectionResults,
  generateReceiptCode,
} from './src/utils/election-logic.ts';
import type { Cohort, Candidate, Vote } from './src/utils/election-logic.ts';
import { createStore } from './storage.ts';
import type { Attempt, Db } from './storage.ts';

const PORT = Number(process.env.PORT) || 3000;
const ID_LENGTH = Number(process.env.ID_LENGTH) || 7;
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const PROXY_HOPS = Number(process.env.PROXY_HOPS) || 2; // proxies between the student and this server (Render: its load balancer + Cloudflare)
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 120; // vote/check requests per minute per IP; a campus Wi-Fi shares one IP, so raise it for election day
const DEV = process.argv.includes('--dev');
const DIST = path.join(process.cwd(), 'dist');
const store = createStore(process.env.DATA_DIR || path.join(process.cwd(), 'data'));

let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = crypto.randomBytes(6).toString('hex');
  console.log(`\n  No ADMIN_PASSWORD set. Temporary admin password (changes on every restart): ${ADMIN_PASSWORD}\n`);
}
const sha = (s: string) => crypto.createHash('sha256').update(s).digest();
const ADMIN_HASH = sha(ADMIN_PASSWORD);
const uid = (n = 5) => crypto.randomBytes(n).toString('hex');

// ---------- data ----------
function defaultDb(): Db {
  // Student ID = 2 + intake year (YY) + serial, e.g. 2240207 -> intake 24/25. Editable in the admin dashboard.
  const y = (id: string, prefix: string, n: number, en: string, ar: string): Cohort => ({ id, prefix, academicYear: n, labelEn: en, labelAr: ar });
  return {
    open: false, // the committee opens voting explicitly
    publicResults: false,
    cohorts: [
      y('cohort-y5', '222', 5, 'Year 5 (Intake 22/23)', 'السنة الخامسة (دفعة 22/23)'),
      y('cohort-y4', '223', 4, 'Year 4 (Intake 23/24)', 'السنة الرابعة (دفعة 23/24)'),
      y('cohort-y3', '224', 3, 'Year 3 (Intake 24/25)', 'السنة الثالثة (دفعة 24/25)'),
      y('cohort-y2', '225', 2, 'Year 2 (Intake 25/26)', 'السنة الثانية (دفعة 25/26)'),
      y('cohort-y1', '226', 1, 'Year 1 (Intake 26/27)', 'السنة الأولى (دفعة 26/27)'),
    ],
    candidates: [],
    roster: [],
    votes: [],
    attempts: [],
  };
}

// Accepts data saved by the older "election_1" version too (single `label` / `name` fields).
function upgrade(db: any): Db {
  db.publicResults = !!db.publicResults;
  db.roster ||= []; db.votes ||= []; db.attempts ||= [];
  db.cohorts = (db.cohorts || []).map((c: any, i: number) => ({
    ...c,
    labelEn: c.labelEn ?? c.label ?? c.prefix,
    labelAr: c.labelAr ?? c.label ?? c.prefix,
    academicYear: c.academicYear ?? (Number(/(\d)/.exec(c.label || '')?.[1]) || i + 1),
  }));
  db.candidates = (db.candidates || []).map((c: any) => ({ ...c, nameEn: c.nameEn ?? c.name, nameAr: c.nameAr ?? c.name }));
  return db;
}

let db: Db;
let rosterMap = new Map<string, string>();
let votedSet = new Set<string>();
const pending = new Set<string>(); // IDs whose vote is being written right now
function reindex() {
  rosterMap = new Map(db.roster.map((r) => [r.uniId, r.name]));
  votedSet = new Set(db.votes.map((v) => v.uniId));
}

// Turso only: re-read votes from the database (catches a vote saved just as its reply was lost). Throttled.
let lastSync = 0;
async function syncVotes(force = false) {
  if (!store.loadVotes || (!force && Date.now() - lastSync < 30000)) return;
  lastSync = Date.now();
  const rows = await store.loadVotes();
  const ids = new Set(rows.map((v) => v.uniId));
  db.votes = rows.concat(db.votes.filter((v) => pending.has(v.uniId) && !ids.has(v.uniId)));
  reindex();
}

// ---------- helpers ----------
function clientIp(req: Request): string {
  // Only trust the proxy header when told to; the entry the nearest proxies appended cannot be forged by the client.
  const fwd = TRUST_PROXY && req.headers['x-forwarded-for'];
  if (fwd) {
    const parts = String(fwd).split(',').map((s) => s.trim());
    return parts[Math.max(0, parts.length - PROXY_HOPS)];
  }
  return req.socket.remoteAddress || '';
}

const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
  return ++h.n > max;
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 60000).unref();

function logAttempt(uniId: string, name: string, reason: string, ip: string, severity: Attempt['severity'] = 'medium') {
  if (limited('log:' + ip, 30, 60000)) return; // a flood of bad attempts must not burn the database's write quota
  const a: Attempt = { id: uid(6), timestamp: Date.now(), uniId, name: String(name).slice(0, 100), reason, ip, severity };
  db.attempts.push(a);
  if (db.attempts.length > 2000) db.attempts.splice(0, db.attempts.length - 2000);
  store.addAttempt(db, a).catch(() => {}); // the log must never block or fail a request
}

const body = (req: Request): Record<string, any> => (req.body && typeof req.body === 'object' ? req.body : {});
const str = (v: unknown, max: number) => String(v ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, max);
const h = (fn: (req: Request, res: Response) => unknown): RequestHandler => (req, res, next) => { Promise.resolve(fn(req, res)).catch(next); };
const eligibleCounts = () => {
  const m: Record<string, number> = {};
  for (const r of db.roster) { const c = findCohortForId(r.uniId, db.cohorts); if (c) m[c.id] = (m[c.id] || 0) + 1; }
  return m;
};

function csv(rows: string[][]): string {
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // block spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n'); // BOM so Excel reads Arabic correctly
}

// ---------- sessions (HttpOnly cookie, never exposed to page scripts) ----------
const sessions = new Map<string, number>(); // token -> expiry
const tokenOf = (req: Request) => /(?:^|;\s*)adm_token=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
function isAdmin(req: Request): boolean {
  const t = tokenOf(req);
  const exp = t && sessions.get(t);
  return !!exp && exp > Date.now();
}
const cookie = (req: Request, value: string, maxAge: number) =>
  `adm_token=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.headers['x-forwarded-proto'] === 'https' || req.secure ? '; Secure' : ''}`;

// ---------- voter validation (synchronous on purpose: no await between the checks and reserving the ID) ----------
function checkVoter(fullName: unknown, rawId: unknown, ip: string) {
  const nameCheck = validateStudentName(String(fullName ?? ''));
  if (!nameCheck.valid) return { code: 400, error: nameCheck.error! };
  const name = str(fullName, 100);
  const id = normalizeUniId(String(rawId ?? '').slice(0, 40));
  if (id.length !== ID_LENGTH) return { code: 400, error: `University ID must be exactly ${ID_LENGTH} digits (e.g., 2240207).` };
  if (!db.open) return { code: 403, error: 'Voting is currently closed.' };

  const cohort = findCohortForId(id, db.cohorts);
  if (!cohort) {
    logAttempt(id, name, 'ID does not belong to any academic year in this election', ip, 'high');
    return { code: 403, error: 'This University ID does not belong to any participating academic year in this election.' };
  }
  if (cohort.open === false) {
    logAttempt(id, name, `Voting is closed for ${cohort.labelEn}`, ip, 'low');
    return { code: 403, error: `التصويت مغلق حالياً لهذه السنة الدراسية (${cohort.labelAr || cohort.labelEn}).` };
  }
  if (rosterMap.size && !rosterMap.has(id)) { // once a roster is uploaded it is enforced
    logAttempt(id, name, 'ID not on the voter roster', ip, 'high');
    return { code: 403, error: 'This ID is not on the list of eligible students. Please contact the Faculty Election Committee.' };
  }
  if (votedSet.has(id)) {
    logAttempt(id, name, 'Tried to vote twice', ip, 'high');
    return { code: 409, error: 'This University ID has already voted. Each student is permitted one vote only.' };
  }
  const candidates = db.candidates.filter((c) => c.cohortId === cohort.id);
  if (!candidates.length) return { code: 403, error: 'There are no registered candidates for your academic year yet.' };
  const registered = rosterMap.get(id);
  return { id, name, cohort, candidates, nameMismatch: registered !== undefined && normalizeArabicName(registered) !== normalizeArabicName(name) };
}

// ---------- app ----------
const app = express();
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!DEV) // Vite's dev server needs inline scripts; the production build does not. Google Fonts is the only outside source.
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  if (req.headers['x-forwarded-proto'] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.json({ limit: '1mb' }));

// Defense in depth on top of SameSite=Strict: a browser request that names another site as its origin is refused.
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (req.method !== 'GET' && origin) {
    let host = '';
    try { host = new URL(origin).host; } catch {}
    if (host !== req.headers.host) return res.status(403).json({ error: 'Forbidden.' });
  }
  next();
});

// ---------------- PUBLIC API ----------------
app.get('/api/status', (_req, res) => {
  res.json({
    open: db.open,
    publicResults: db.publicResults,
    idLength: ID_LENGTH,
    cohorts: db.cohorts.map((c) => ({ id: c.id, prefix: c.prefix, labelEn: c.labelEn, labelAr: c.labelAr, academicYear: c.academicYear, open: c.open !== false })),
  });
});

// Step 1: verify the student and detect the academic year from the ID prefix.
app.post('/api/check', (req, res) => {
  const ip = clientIp(req);
  if (limited('v:' + ip, RATE_LIMIT, 60000)) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  const b = body(req);
  const v = checkVoter(b.fullName, b.uniId, ip);
  if ('error' in v) return res.status(v.code).json({ error: v.error });
  res.json({
    eligible: true,
    cohort: v.cohort,
    candidates: v.candidates.map(({ id, cohortId, nameEn, nameAr, sloganEn, sloganAr, avatarUrl }) => ({ id, cohortId, nameEn, nameAr, sloganEn, sloganAr, avatarUrl })),
  });
});

// Step 3: cast the vote.
app.post('/api/vote', h(async (req, res) => {
  const ip = clientIp(req);
  if (limited('v:' + ip, RATE_LIMIT, 60000)) return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
  const b = body(req);
  const v = checkVoter(b.fullName, b.uniId, ip);
  if ('error' in v) return res.status(v.code).json({ error: v.error });

  const cand = db.candidates.find((c) => c.id === b.candidateId);
  if (!cand) return res.status(400).json({ error: 'Please select a valid candidate.' });
  if (cand.cohortId !== v.cohort.id) {
    logAttempt(v.id, v.name, 'Tried to vote for a candidate outside their academic year', ip, 'high');
    return res.status(403).json({ error: 'You are only authorized to vote for candidates of your own academic year.' });
  }
  if (v.nameMismatch) logAttempt(v.id, v.name, 'Name differs from the roster', ip, 'low');

  // Reserve the ID synchronously (no await above), so a double-click cannot slip two votes through.
  const vote: Vote & { device: string | null } = {
    id: v.id, uniId: v.id, studentName: v.name, cohortId: v.cohort.id, candidateId: cand.id,
    timestamp: Date.now(), receiptCode: generateReceiptCode(), nameMismatch: v.nameMismatch,
    device: /^[a-f0-9]{16,64}$/.test(String(b.device || '')) ? b.device : null, // random per-browser id, used only to flag several votes from one phone
  };
  db.votes.push(vote); votedSet.add(v.id); pending.add(v.id);
  try {
    await store.addVote(db, vote);
  } catch (e: any) {
    db.votes = db.votes.filter((x) => x !== vote); votedSet.delete(v.id); // never count a vote that was not saved
    if (e.dup) { await syncVotes(true).catch(() => {}); return res.status(409).json({ error: 'This University ID has already voted.' }); }
    console.error('Saving a vote failed:', e.message);
    return res.status(503).json({ error: 'Could not save your vote. Please try again.' });
  } finally { pending.delete(v.id); }

  res.json({
    success: true,
    receiptCode: vote.receiptCode,
    timestamp: vote.timestamp,
    cohort: { labelEn: v.cohort.labelEn, labelAr: v.cohort.labelAr, academicYear: v.cohort.academicYear },
    candidateNameEn: cand.nameEn,
    candidateNameAr: cand.nameAr,
  });
}));

app.get('/api/public-results', h(async (req, res) => {
  if (!db.publicResults && !isAdmin(req)) return res.status(403).json({ error: 'Public results are currently disabled by the election committee.' });
  await syncVotes().catch(() => {});
  res.json({ open: db.open, totalVotes: db.votes.length, results: calculateElectionResults(db.cohorts, db.candidates, db.votes, eligibleCounts()) });
}));

// ---------------- ADMIN API ----------------
app.post('/api/admin/login', (req, res) => {
  const ip = clientIp(req);
  if (limited('l:' + ip, 8, 60000)) return res.status(429).json({ error: 'Too many login attempts. Please wait a minute.' });
  if (!crypto.timingSafeEqual(sha(String(body(req).password ?? '')), ADMIN_HASH)) {
    logAttempt('ADMIN', 'Admin Login', 'Invalid admin password attempt', ip, 'high');
    return res.status(401).json({ error: 'Incorrect administrator password.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 8 * 3600e3);
  res.setHeader('Set-Cookie', cookie(req, token, 8 * 3600));
  res.json({ success: true });
});

// Everything below needs a logged-in admin.
app.use('/api/admin', (req, res, next) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized. Please log in as administrator.' });
  next();
});

app.post('/api/admin/logout', (req, res) => {
  const t = tokenOf(req); if (t) sessions.delete(t);
  res.setHeader('Set-Cookie', cookie(req, '', 0));
  res.json({ success: true });
});

app.get('/api/admin/state', h(async (_req, res) => {
  await syncVotes().catch(() => {});
  const perDevice = new Map<string, number>();
  for (const v of db.votes as any[]) if (v.device) perDevice.set(v.device, (perDevice.get(v.device) || 0) + 1);
  res.json({
    open: db.open,
    publicResults: db.publicResults,
    strictRosterOnly: rosterMap.size > 0,
    idLength: ID_LENGTH,
    totalVotes: db.votes.length,
    rosterCount: db.roster.length,
    cohorts: db.cohorts,
    candidates: db.candidates,
    results: calculateElectionResults(db.cohorts, db.candidates, db.votes, eligibleCounts()),
    voters: db.votes.slice().reverse().map((v: any) => ({
      id: v.id, uniId: v.uniId, studentName: v.studentName, cohortId: v.cohortId, timestamp: v.timestamp,
      receiptCode: v.receiptCode || '', nameMismatch: !!v.nameMismatch, sameDevice: (perDevice.get(v.device) || 0) > 1 ? perDevice.get(v.device) : 0,
    })),
    attempts: db.attempts.slice().reverse().slice(0, 500),
  });
}));

app.post('/api/admin/settings', h(async (req, res) => {
  const { open, publicResults } = body(req);
  if (typeof open === 'boolean') db.open = open;
  if (typeof publicResults === 'boolean') db.publicResults = publicResults;
  await store.saveConfig(db);
  res.json({ success: true });
}));

app.post('/api/admin/cohort', h(async (req, res) => {
  const b = body(req);
  const prefix = normalizeUniId(String(b.prefix ?? ''));
  if (!prefix || prefix.length >= ID_LENGTH) return res.status(400).json({ error: `Prefix must be 1 to ${ID_LENGTH - 1} digits (the start of the student ID).` });
  const labelEn = str(b.labelEn, 80), labelAr = str(b.labelAr, 80);
  const academicYear = Math.min(9, Math.max(1, Math.round(Number(b.academicYear)) || 1));
  const existing = b.id ? db.cohorts.find((c) => c.id === b.id) : undefined;
  if (db.cohorts.some((c) => c.prefix === prefix && c !== existing)) return res.status(400).json({ error: 'Another academic year already uses this prefix.' });
  if (existing) {
    if (existing.prefix !== prefix && db.votes.some((v) => v.cohortId === existing.id)) return res.status(400).json({ error: 'This year already has votes; its prefix can no longer change.' });
    existing.prefix = prefix;
    if (labelEn) existing.labelEn = labelEn;
    if (labelAr) existing.labelAr = labelAr;
    if (b.academicYear) existing.academicYear = academicYear;
  } else {
    db.cohorts.push({ id: `cohort-${uid(4)}`, prefix, labelEn: labelEn || `Year ${prefix}`, labelAr: labelAr || `السنة ${prefix}`, academicYear, open: true });
  }
  await store.saveConfig(db);
  res.json({ success: true, cohorts: db.cohorts });
}));

app.post('/api/admin/cohort/toggle-voting', h(async (req, res) => {
  const b = body(req);
  const cohort = db.cohorts.find((c) => c.id === (b.id || b.cohortId));
  if (!cohort) return res.status(404).json({ error: 'Cohort not found.' });
  cohort.open = typeof b.open === 'boolean' ? b.open : cohort.open === false;
  await store.saveConfig(db);
  res.json({ success: true, cohort, cohorts: db.cohorts });
}));

app.post('/api/admin/cohorts/bulk-toggle', h(async (req, res) => {
  const open = body(req).open === true;
  db.cohorts.forEach((c) => { c.open = open; });
  await store.saveConfig(db);
  res.json({ success: true, cohorts: db.cohorts });
}));

// Open voting for one year only and close the others.
app.post('/api/admin/cohorts/open-single', h(async (req, res) => {
  const b = body(req);
  const target = db.cohorts.find((c) => c.id === (b.id || b.cohortId));
  if (!target) return res.status(404).json({ error: 'Target academic year not found.' });
  db.cohorts.forEach((c) => { c.open = c === target; });
  db.open = true;
  await store.saveConfig(db);
  res.json({ success: true, activeCohort: target, cohorts: db.cohorts, open: db.open });
}));

app.post('/api/admin/candidate', h(async (req, res) => {
  const b = body(req);
  const nameEn = str(b.nameEn, 80), nameAr = str(b.nameAr, 80);
  if (!db.cohorts.some((c) => c.id === b.cohortId)) return res.status(400).json({ error: 'Academic year does not exist.' });
  if (!nameEn && !nameAr) return res.status(400).json({ error: 'Candidate name is required.' });
  const avatarUrl = /^https:\/\//.test(String(b.avatarUrl ?? '')) ? String(b.avatarUrl).slice(0, 500) : '';
  const cand: Candidate = {
    id: `cand-${uid(6)}`, cohortId: b.cohortId, nameEn: nameEn || nameAr, nameAr: nameAr || nameEn,
    sloganEn: str(b.sloganEn, 160), sloganAr: str(b.sloganAr, 160), avatarUrl,
  };
  db.candidates.push(cand);
  await store.saveConfig(db);
  res.json({ success: true, candidate: cand });
}));

// A candidate who already received votes is never deleted silently: resetting the election is the explicit way to do that.
app.post('/api/admin/candidate/delete', h(async (req, res) => {
  const b = body(req), id = b.id || b.candidateId;
  if (db.votes.some((v) => v.candidateId === id)) return res.status(400).json({ error: 'This candidate already has votes. Reset the election ballots first if you really want to remove them.' });
  db.candidates = db.candidates.filter((c) => c.id !== id);
  await store.saveConfig(db);
  res.json({ success: true, remainingCandidates: db.candidates.length });
}));

app.post('/api/admin/candidate/clear-all', h(async (_req, res) => {
  if (db.votes.length) return res.status(400).json({ error: 'Votes have already been cast. Reset the election ballots first.' });
  db.candidates = [];
  await store.saveConfig(db);
  res.json({ success: true });
}));

app.post('/api/admin/roster', h(async (req, res) => {
  const b = body(req);
  const entries = new Map<string, string>();
  let skipped = 0;
  for (const raw of String(b.text ?? '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const [first, ...rest] = raw.split(/[,;\t]/);
    const id = normalizeUniId(first || '');
    const name = str(rest.join(' '), 100);
    if (id.length === ID_LENGTH && name.length >= 3) entries.set(id, name); else skipped++;
  }
  if (b.replaceAll) db.roster = [...entries].map(([uniId, name]) => ({ uniId, name }));
  else for (const [uniId, name] of entries) { const r = db.roster.find((x) => x.uniId === uniId); if (r) r.name = name; else db.roster.push({ uniId, name }); }
  reindex();
  await store.saveConfig(db);
  res.json({ success: true, totalRosterCount: db.roster.length, importedCount: entries.size, skippedCount: skipped });
}));

app.post('/api/admin/roster/clear', h(async (_req, res) => {
  db.roster = [];
  reindex();
  await store.saveConfig(db);
  res.json({ success: true });
}));

// Cancel one student's vote (e.g. cast by mistake or by someone else); the student may then vote again.
app.post('/api/admin/vote/cancel', h(async (req, res) => {
  const id = normalizeUniId(String(body(req).uniId ?? ''));
  const vote = db.votes.find((v) => v.uniId === id);
  if (!vote) return res.status(404).json({ error: 'No vote found for this ID.' });
  db.votes = db.votes.filter((v) => v !== vote); reindex();
  try { await store.cancelVote(db, id); } catch (e) { db.votes.push(vote); reindex(); throw e; }
  logAttempt(id, vote.studentName, 'Vote cancelled by admin', 'admin', 'medium');
  res.json({ success: true });
}));

app.post('/api/admin/reset-votes', h(async (req, res) => {
  if (body(req).confirmation !== 'RESET_ELECTION') return res.status(400).json({ error: 'Type RESET_ELECTION to confirm wiping all cast votes.' });
  db.votes = []; db.attempts = []; db.open = false; reindex();
  await store.reset(db);
  res.json({ success: true, message: 'All votes have been cleared. Voting is paused.' });
}));

const download = (res: Response, name: string, rows: string[][]) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(csv(rows));
};

app.get('/api/admin/export/results.csv', h(async (_req, res) => {
  await syncVotes(true).catch(() => {});
  const rows = [
    ['Syrian Private University - Faculty of Dentistry', 'انتخابات مجلس الطلبة - كلية طب الأسنان'],
    ['Official Election Results / نتائج الانتخابات الرسمية', new Date().toISOString()],
    [],
    ['Academic Year', 'السنة الدراسية', 'Candidate Name', 'اسم المرشح', 'Votes', 'Percentage %', 'Outcome / النتيجة'],
  ];
  for (const r of calculateElectionResults(db.cohorts, db.candidates, db.votes, eligibleCounts()))
    for (const c of r.candidates)
      rows.push([r.cohort.labelEn, r.cohort.labelAr, c.nameEn, c.nameAr, String(c.votes), `${c.percentage}%`,
        c.isWinner ? (db.open ? 'LEADING / متقدم' : 'ELECTED WINNER / الفائز بالانتخابات') : c.isTied ? 'TIED / تعادل' : 'Participant']);
  download(res, 'SPU_Dental_Council_Results.csv', rows);
}));

app.get('/api/admin/export/voters.csv', h(async (_req, res) => {
  await syncVotes(true).catch(() => {});
  const cohorts = new Map(db.cohorts.map((c) => [c.id, c]));
  const rows = [['Timestamp', 'University ID', 'Student Name', 'Academic Year', 'السنة', 'Receipt Code', 'Roster Status / حالة القائمة']];
  for (const v of db.votes) {
    const c = cohorts.get(v.cohortId);
    rows.push([new Date(v.timestamp).toISOString(), v.uniId, v.studentName, c?.labelEn ?? 'Unknown', c?.labelAr ?? 'غير معروف', v.receiptCode || '',
      v.nameMismatch ? 'Name Mismatch / اختلاف بالاسم' : 'Verified / مطابق']);
  }
  download(res, 'SPU_Dental_Voters_Registry.csv', rows);
}));

// QR code for the voting page. APP_URL wins; on Render RENDER_EXTERNAL_URL is set automatically.
app.get('/api/admin/qr', h(async (req, res) => {
  const proto = TRUST_PROXY && req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']).split(',')[0] : req.protocol;
  const url = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `${proto}://${req.headers.host}`).replace(/\/+$/, '');
  const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: '#0f356d', light: '#ffffff' } });
  res.json({ url, qrDataUrl });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---------------- the React app ----------------
async function mountApp() {
  if (DEV) {
    const { createServer } = await import('vite');
    app.use((await createServer({ server: { middlewareMode: true }, appType: 'spa' })).middlewares);
    return;
  }
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/ not found. Run "npm run build" first.');
  app.use('/assets', express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '1y' })); // hashed file names: safe to cache
  app.use(express.static(DIST, { maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  console.error('Request failed:', err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

async function main() {
  db = upgrade((await store.load()) || defaultDb());
  reindex();
  await store.saveConfig(db);
  await mountApp();
  app.listen(PORT, '0.0.0.0', () => console.log(`SPU Dental election server on http://localhost:${PORT}\nStorage: ${store.name}`));
}
main().catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
