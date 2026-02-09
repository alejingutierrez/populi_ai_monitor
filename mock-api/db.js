import { Pool } from "pg";

const shouldUseSsl = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname;
    const sslmode = url.searchParams.get("sslmode");
    if (sslmode === "disable") return false;
    if (host === "localhost" || host === "127.0.0.1") return false;
    return true;
  } catch {
    if (value.includes("sslmode=disable")) return false;
    if (value.includes("localhost") || value.includes("127.0.0.1")) return false;
    return true;
  }
};

const globalForPg = globalThis;

const getPool = () => {
  const existing = globalForPg.__pgPool;
  if (existing) return existing;

  // Note: `server.js` loads dotenv after static imports (ESM hoists imports),
  // so env vars may not exist at module init time. Resolve lazily here.
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  const pool = new Pool({
    connectionString,
    // Neon requires SSL; local Postgres usually doesn't.
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  globalForPg.__pgPool = pool;
  return pool;
};

export const query = (text, params) => getPool().query(text, params);
