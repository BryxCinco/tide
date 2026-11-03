// In-memory stand-in for the parts of supabase-js the routes use, so tests never touch a
// real project. Use it from a test file with:
//   jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);
//
// Every query resolves on a later macrotask (setImmediate), so two requests fired in
// parallel genuinely interleave between their reads and writes — the same window a real
// network round trip to Postgres opens. Each operation itself is applied atomically at the
// moment it runs, like a single SQL statement.

const db = { tables: {}, storage: {} };
let idCounter = 0;

function reset() {
  db.tables = {};
  db.storage = {};
  idCounter = 0;
}

function table(name) {
  if (!db.tables[name]) db.tables[name] = [];
  return db.tables[name];
}

function nextId() {
  idCounter += 1;
  return `id-${idCounter}`;
}

function notFound() {
  return { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' };
}

class Query {
  constructor(tableName) {
    this.tableName = tableName;
    this.op = 'select';
    this.payload = null;
    this.filters = [];
    this.returnRows = true;
    this.mode = 'many';
  }

  select() {
    if (this.op !== 'select') this.returnRows = true;
    return this;
  }
  insert(rows) {
    this.op = 'insert';
    this.payload = rows;
    this.returnRows = false;
    return this;
  }
  update(patch) {
    this.op = 'update';
    this.payload = patch;
    this.returnRows = false;
    return this;
  }
  upsert(row) {
    this.op = 'upsert';
    this.payload = row;
    this.returnRows = false;
    return this;
  }
  delete() {
    this.op = 'delete';
    this.returnRows = false;
    return this;
  }
  eq(col, val) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  // Only the `is` operator is used: .not(col, 'is', true) is SQL's `col IS NOT TRUE`, which
  // matches both false and NULL (a column the insert never set reads as NULL here).
  not(col, op, val) {
    if (op !== 'is') throw new Error(`fakeSupabase: .not() operator '${op}' not supported`);
    this.filters.push((r) => (r[col] ?? null) !== val);
    return this;
  }
  gte(col, val) {
    this.filters.push((r) => r[col] >= val);
    return this;
  }
  lte(col, val) {
    this.filters.push((r) => r[col] <= val);
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }

  matches(row) {
    return this.filters.every((f) => f(row));
  }

  execute() {
    const rows = table(this.tableName);
    let result = [];

    if (this.op === 'select') {
      result = rows.filter((r) => this.matches(r)).map((r) => ({ ...r }));
    } else if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      result = list.map((r) => {
        const row = { id: nextId(), created_at: new Date().toISOString(), ...r };
        rows.push(row);
        return { ...row };
      });
    } else if (this.op === 'update') {
      result = rows.filter((r) => this.matches(r)).map((r) => {
        Object.assign(r, this.payload);
        return { ...r };
      });
    } else if (this.op === 'upsert') {
      const key = 'user_id' in this.payload ? 'user_id' : 'id';
      const existing = rows.find((r) => r[key] === this.payload[key]);
      if (existing) {
        Object.assign(existing, this.payload);
        result = [{ ...existing }];
      } else {
        const row = { id: nextId(), ...this.payload };
        rows.push(row);
        result = [{ ...row }];
      }
    } else if (this.op === 'delete') {
      const kept = [];
      for (const r of rows) (this.matches(r) ? result : kept).push(r);
      db.tables[this.tableName] = kept;
    }

    if (this.op !== 'select' && !this.returnRows) return { data: null, error: null };
    if (this.mode === 'single') {
      return result.length === 1 ? { data: result[0], error: null } : { data: null, error: notFound() };
    }
    if (this.mode === 'maybeSingle') {
      return { data: result[0] ?? null, error: null };
    }
    return { data: result, error: null };
  }

  then(resolve, reject) {
    return new Promise((r) => setImmediate(r)).then(() => this.execute()).then(resolve, reject);
  }
}

// Resolves "a/../b" and percent-encoded dots the way a permissive object store could, so a
// path-traversal attempt is tested against the worst case rather than a literal-key miss.
function normalizeKey(p) {
  try {
    return require('path').posix.normalize(decodeURIComponent(p));
  } catch {
    return p;
  }
}

function bucket(name) {
  if (!db.storage[name]) db.storage[name] = {};
  const files = db.storage[name];
  const tick = () => new Promise((r) => setImmediate(r));
  return {
    async upload(path, buffer) {
      await tick();
      files[normalizeKey(path)] = buffer;
      return { data: { path }, error: null };
    },
    getPublicUrl(path) {
      return { data: { publicUrl: `${process.env.SUPABASE_URL}/storage/v1/object/public/${name}/${path}` } };
    },
    async remove(paths) {
      await tick();
      for (const p of paths) delete files[normalizeKey(p)];
      return { data: paths, error: null };
    },
    async list(prefix) {
      await tick();
      const data = Object.keys(files)
        .filter((p) => p.startsWith(`${prefix}/`))
        .map((p) => ({ name: p.slice(prefix.length + 1) }));
      return { data, error: null };
    },
  };
}

// Postgres functions the server calls through .rpc(). Each runs synchronously inside one
// macrotask — i.e. atomically, like the single SQL statement it stands in for.
const rpcs = {
  // migrations/014_atomic_xp.sql: INSERT ... ON CONFLICT (user_id) DO UPDATE total_xp + amount.
  award_xp({ p_user_id, p_amount }) {
    if (!Number.isInteger(p_amount) || p_amount <= 0) {
      return { data: null, error: { code: 'P0001', message: 'award_xp: p_amount must be a positive integer' } };
    }
    const rows = table('user_levels');
    let row = rows.find((r) => r.user_id === p_user_id);
    if (!row) {
      row = { user_id: p_user_id, total_xp: 0, level: 1 };
      rows.push(row);
    }
    row.total_xp += p_amount;
    row.level = Math.floor(Math.sqrt(Math.max(0, row.total_xp) / 100)) + 1;
    row.updated_at = new Date().toISOString();
    return { data: [{ new_total_xp: row.total_xp, new_level: row.level }], error: null };
  },
};

class RpcCall {
  constructor(name, params) {
    this.name = name;
    this.params = params;
    this.mode = 'many';
  }
  single() {
    this.mode = 'single';
    return this;
  }
  execute() {
    const fn = rpcs[this.name];
    if (!fn) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${this.name}` } };
    const result = fn(this.params || {});
    if (result.error || this.mode !== 'single') return result;
    return result.data.length === 1 ? { data: result.data[0], error: null } : { data: null, error: notFound() };
  }
  then(resolve, reject) {
    return new Promise((r) => setImmediate(r)).then(() => this.execute()).then(resolve, reject);
  }
}

const supabaseAdmin = {
  from: (name) => new Query(name),
  rpc: (name, params) => new RpcCall(name, params),
  storage: {
    from: bucket,
    async listBuckets() {
      return { data: Object.keys(db.storage).map((n) => ({ name: n })), error: null };
    },
    async createBucket(n) {
      bucket(n);
      return { data: { name: n }, error: null };
    },
  },
  auth: {
    // Tests authenticate with "Authorization: Bearer <userId>" — the token IS the user id.
    async getClaims(token) {
      return { data: { claims: { sub: token, email: `${token}@test.local` } }, error: null };
    },
    // Any email signs in with the password "correct-password"; anything else is rejected.
    async signInWithPassword({ email, password }) {
      if (password !== 'correct-password') return { data: {}, error: { message: 'Invalid login credentials' } };
      return { data: { user: { id: `id-${email}`, email }, session: { access_token: 'token' } }, error: null };
    },
  },
};

module.exports = {
  db,
  reset,
  table,
  clientModule: { supabaseAdmin, supabaseAuth: supabaseAdmin, initError: null },
};
