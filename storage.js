'use strict';
// Storage backends. Default: a JSON file (Termux / own server).
// With TURSO_DATABASE_URL + TURSO_AUTH_TOKEN: Turso over its HTTP API (no dependencies; needs Node 18+).
const fs = require('fs');
const path = require('path');

function fileStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'db.json');
  const write = async (db) => {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file); // atomic: never leaves a half-written file
  };
  return {
    name: 'JSON file ' + file,
    load: async () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } },
    saveConfig: write, addVote: write, addAttempt: write, reset: write, cancelVote: write,
  };
}

const VOTES_SQL = 'SELECT uni_id, name, cohort_id, candidate_id, ts, name_mismatch, device FROM votes ORDER BY ts, rowid';
const toVote = ([uniId, name, cohortId, candidateId, ts, mm, device]) => ({ uniId, name, cohortId, candidateId, ts, nameMismatch: !!mm, device });
const CONFIG_UPSERT = 'INSERT OR REPLACE INTO config (id, data) VALUES (1, ?)';
const configJson = (db) => JSON.stringify({ open: db.open, cohorts: db.cohorts, candidates: db.candidates, roster: db.roster });

function tursoStore(url, token) {
  const endpoint = url.replace(/^libsql:/, 'https:').replace(/\/+$/, '') + '/v2/pipeline';
  const arg = (v) => v == null ? { type: 'null', value: null }
    : typeof v === 'number' && Number.isInteger(v) ? { type: 'integer', value: String(v) }
    : typeof v === 'number' ? { type: 'float', value: v }
    : { type: 'text', value: String(v) };
  const cell = (c) => (c.type === 'null' ? null : c.type === 'integer' ? Number(c.value) : c.value);

  // run([sql, ...args], ...) -> one array of rows per statement. Throws on any SQL/HTTP error (e.dup = unique violation).
  async function run(...stmts) {
    const requests = stmts.map(([sql, ...args]) => ({ type: 'execute', stmt: { sql, args: args.map(arg) } }));
    requests.push({ type: 'close' });
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Turso HTTP ${r.status}`);
    const results = (await r.json()).results;
    const bad = results.find((x) => x.type === 'error');
    if (bad) {
      const e = new Error(bad.error?.message || 'Turso error');
      e.dup = /UNIQUE constraint/i.test(e.message);
      throw e;
    }
    return results.slice(0, -1).map((x) => x.response.result.rows.map((row) => row.map(cell)));
  }

  let chain = Promise.resolve(); // admin changes are applied in the order they were made
  const queued = (fn) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };

  return {
    name: 'Turso ' + url,
    async load() {
      await run(
        ['CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)'],
        ['CREATE TABLE IF NOT EXISTS votes (uni_id TEXT PRIMARY KEY, name TEXT NOT NULL, cohort_id TEXT NOT NULL, candidate_id TEXT NOT NULL, ts INTEGER NOT NULL, name_mismatch INTEGER NOT NULL DEFAULT 0, device TEXT)'],
        ['CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, uni_id TEXT, name TEXT, reason TEXT, ip TEXT)'],
      );
      // Databases created before the same-phone flag existed get the column added once.
      try { await run(['ALTER TABLE votes ADD COLUMN device TEXT']); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
      const [cfg, votes, attempts] = await run(
        ['SELECT data FROM config WHERE id = 1'], [VOTES_SQL],
        ['SELECT ts, uni_id, name, reason, ip FROM attempts ORDER BY id DESC LIMIT 2000'],
      );
      if (!cfg.length) return null;
      return {
        ...JSON.parse(cfg[0][0]),
        votes: votes.map(toVote),
        attempts: attempts.reverse().map(([ts, uniId, name, reason, ip]) => ({ ts, uniId, name, reason, ip })),
      };
    },
    loadVotes: async () => (await run([VOTES_SQL]))[0].map(toVote),
    saveConfig: (db) => { const data = configJson(db); return queued(() => run([CONFIG_UPSERT, data])); },
    // The PRIMARY KEY on uni_id is what guarantees one vote per ID, even across restarts or two servers.
    addVote: (db, v) => run(['INSERT INTO votes (uni_id, name, cohort_id, candidate_id, ts, name_mismatch, device) VALUES (?, ?, ?, ?, ?, ?, ?)',
      v.uniId, v.name, v.cohortId, v.candidateId, v.ts, v.nameMismatch ? 1 : 0, v.device]),
    cancelVote: (db, id) => run(['DELETE FROM votes WHERE uni_id = ?', id]),
    addAttempt: (db, a) => run(['INSERT INTO attempts (ts, uni_id, name, reason, ip) VALUES (?, ?, ?, ?, ?)', a.ts, a.uniId, a.name, a.reason, a.ip]),
    reset: (db) => { const data = configJson(db); return queued(() => run(['BEGIN'], ['DELETE FROM votes'], ['DELETE FROM attempts'], [CONFIG_UPSERT, data], ['COMMIT'])); },
  };
}

module.exports = (dataDir) => {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token } = process.env;
  if (!url) return fileStore(dataDir);
  if (!token) throw new Error('TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is missing.');
  return tursoStore(url, token);
};
