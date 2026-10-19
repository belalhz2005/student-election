// Storage backends. Default: a JSON file (local use). With TURSO_DATABASE_URL + TURSO_AUTH_TOKEN: Turso over its HTTP API.
import fs from 'fs';
import path from 'path';
import type { Vote } from './src/utils/election-logic.ts';

export interface Attempt { id: string; timestamp: number; uniId: string; name: string; reason: string; ip: string; severity: 'low' | 'medium' | 'high' }
export interface Config { open: boolean; publicResults: boolean; cohorts: any[]; candidates: any[]; roster: any[] }
export interface Db extends Config { votes: Vote[]; attempts: Attempt[] }
export interface Store {
  name: string;
  load(): Promise<Db | null>;
  loadVotes?(): Promise<Vote[]>;
  saveConfig(db: Db): Promise<unknown>;
  addVote(db: Db, v: Vote): Promise<unknown>;
  cancelVote(db: Db, uniId: string): Promise<unknown>;
  addAttempt(db: Db, a: Attempt): Promise<unknown>;
  reset(db: Db): Promise<unknown>;
}

function fileStore(dir: string): Store {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'db.json');
  const write = async (db: Db) => {
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

const VOTES_SQL = 'SELECT uni_id, name, cohort_id, candidate_id, ts, name_mismatch, device, receipt_code FROM votes ORDER BY ts, rowid';
const toVote = ([uniId, name, cohortId, candidateId, ts, mm, device, receiptCode]: any[]): Vote =>
  ({ id: uniId, uniId, studentName: name, cohortId, candidateId, timestamp: ts, receiptCode: receiptCode || '', nameMismatch: !!mm, device });
const CONFIG_UPSERT = 'INSERT OR REPLACE INTO config (id, data) VALUES (1, ?)';
const configJson = (db: Db) => JSON.stringify({ open: db.open, publicResults: db.publicResults, cohorts: db.cohorts, candidates: db.candidates, roster: db.roster });

function tursoStore(url: string, token: string): Store {
  const endpoint = url.replace(/^libsql:/, 'https:').replace(/\/+$/, '') + '/v2/pipeline';
  const arg = (v: any) => v == null ? { type: 'null', value: null }
    : typeof v === 'number' && Number.isInteger(v) ? { type: 'integer', value: String(v) }
    : typeof v === 'number' ? { type: 'float', value: v }
    : { type: 'text', value: String(v) };
  const cell = (c: any) => (c.type === 'null' ? null : c.type === 'integer' ? Number(c.value) : c.value);

  // run([sql, ...args], ...) -> one array of rows per statement. Throws on any SQL/HTTP error (e.dup = unique violation).
  async function run(...stmts: any[][]): Promise<any[][][]> {
    const requests: any[] = stmts.map(([sql, ...args]) => ({ type: 'execute', stmt: { sql, args: args.map(arg) } }));
    requests.push({ type: 'close' });
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Turso HTTP ${r.status}`);
    const results = ((await r.json()) as any).results;
    const bad = results.find((x: any) => x.type === 'error');
    if (bad) {
      const e: any = new Error(bad.error?.message || 'Turso error');
      e.dup = /UNIQUE constraint/i.test(e.message);
      throw e;
    }
    return results.slice(0, -1).map((x: any) => x.response.result.rows.map((row: any[]) => row.map(cell)));
  }

  let chain: Promise<unknown> = Promise.resolve(); // admin changes are applied in the order they were made
  const queued = <T,>(fn: () => Promise<T>) => { const p = chain.then(fn); chain = p.catch(() => {}); return p; };
  const addColumn = async (col: string) => { // databases created by an older version get the column added once
    try { await run([`ALTER TABLE ${col}`]); } catch (e: any) { if (!/duplicate column/i.test(e.message)) throw e; }
  };

  return {
    name: 'Turso ' + url,
    async load() {
      await run(
        ['CREATE TABLE IF NOT EXISTS config (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)'],
        ['CREATE TABLE IF NOT EXISTS votes (uni_id TEXT PRIMARY KEY, name TEXT NOT NULL, cohort_id TEXT NOT NULL, candidate_id TEXT NOT NULL, ts INTEGER NOT NULL, name_mismatch INTEGER NOT NULL DEFAULT 0, device TEXT, receipt_code TEXT)'],
        ['CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, uni_id TEXT, name TEXT, reason TEXT, ip TEXT, severity TEXT)'],
      );
      await addColumn('votes ADD COLUMN device TEXT');
      await addColumn('votes ADD COLUMN receipt_code TEXT');
      await addColumn('attempts ADD COLUMN severity TEXT');
      const [cfg, votes, attempts] = await run(
        ['SELECT data FROM config WHERE id = 1'], [VOTES_SQL],
        ['SELECT id, ts, uni_id, name, reason, ip, severity FROM attempts ORDER BY id DESC LIMIT 2000'],
      );
      if (!cfg.length) return null;
      return {
        publicResults: false,
        ...JSON.parse(cfg[0][0]),
        votes: votes.map(toVote),
        attempts: attempts.reverse().map(([id, timestamp, uniId, name, reason, ip, severity]) => ({ id: String(id), timestamp, uniId, name, reason, ip, severity: severity || 'medium' })),
      };
    },
    loadVotes: async () => (await run([VOTES_SQL]))[0].map(toVote),
    saveConfig: (db) => { const data = configJson(db); return queued(() => run([CONFIG_UPSERT, data])); },
    // The PRIMARY KEY on uni_id is what guarantees one vote per ID, even across restarts or two servers.
    addVote: (_db, v) => run(['INSERT INTO votes (uni_id, name, cohort_id, candidate_id, ts, name_mismatch, device, receipt_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      v.uniId, v.studentName, v.cohortId, v.candidateId, v.timestamp, v.nameMismatch ? 1 : 0, (v as any).device ?? null, v.receiptCode]),
    cancelVote: (_db, id) => run(['DELETE FROM votes WHERE uni_id = ?', id]),
    addAttempt: (_db, a) => run(['INSERT INTO attempts (ts, uni_id, name, reason, ip, severity) VALUES (?, ?, ?, ?, ?, ?)', a.timestamp, a.uniId, a.name, a.reason, a.ip, a.severity]),
    reset: (db) => { const data = configJson(db); return queued(() => run(['BEGIN'], ['DELETE FROM votes'], ['DELETE FROM attempts'], [CONFIG_UPSERT, data], ['COMMIT'])); },
  };
}

export function createStore(dataDir: string): Store {
  const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: token } = process.env;
  if (!url) return fileStore(dataDir);
  if (!token) throw new Error('TURSO_DATABASE_URL is set but TURSO_AUTH_TOKEN is missing.');
  return tursoStore(url, token);
}
