import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.warn("DATABASE_URL missing: API will not reach Neon.");
}

const sslRequired = Boolean(connectionString?.includes("sslmode=require"));

const globalForPg = globalThis;

const pool =
  globalForPg.__pgPool ??
  new Pool({
    connectionString,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

if (!globalForPg.__pgPool) {
  globalForPg.__pgPool = pool;
}

export const query = (text, params) => pool.query(text, params);
