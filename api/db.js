import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.warn("DATABASE_URL missing: API will not reach Neon.");
}

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

const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString,
    // Neon requires SSL; local Postgres usually doesn't.
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

if (!globalForPg.__pgPool) {
  globalForPg.__pgPool = pool;
}

export const query = (text, params) => pool.query(text, params);
