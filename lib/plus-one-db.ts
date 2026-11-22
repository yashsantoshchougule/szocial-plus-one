import "server-only";
import { Pool, type QueryResultRow } from "pg";

let pool: Pool | undefined;

function databasePool() {
  if (pool) return pool;
  const value = process.env.PLUS_ONE_DATABASE_URL;
  if (!value) throw new Error("Plus One database is not configured");

  const url = new URL(value);
  if (!["postgresql:", "postgres:"].includes(url.protocol)
      || !/^plus_one_runtime(?:\.[a-z0-9]{20})?$/.test(decodeURIComponent(url.username))) {
    throw new Error("Plus One requires its dedicated runtime database role");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  for (const parameter of ["host", "hostaddr", "user", "port", "dbname", "options", "uselibpqcompat"]) {
    if (url.searchParams.has(parameter)) throw new Error("Unsupported database connection parameter");
  }
  url.searchParams.set("sslmode", local ? "disable" : "verify-full");
  pool = new Pool({
    connectionString: url.href,
    max: 4,
    connectionTimeoutMillis: 3000,
    query_timeout: 5000,
  });
  pool.on("error", () => { console.error("Plus One idle database connection closed"); });
  return pool;
}

export async function accountQuery<Row extends QueryResultRow>(actorId: string, sql: string, parameters: unknown[] = []) {
  try {
    const client = await databasePool().connect();
    let releaseError = false;
    try {
      await client.query("begin");
      const actor = await client.query(
        "select pg_catalog.set_config('plus_one.actor_id', $1::uuid::text, true) where current_user = 'plus_one_runtime'",
        [actorId],
      );
      if (!actor.rowCount) throw new Error("Unexpected Plus One database role");
      const { rows } = await client.query<Row>(sql, parameters);
      await client.query("commit");
      return { rows, error: false } as const;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        releaseError = true;
      }
      throw error;
    } finally {
      client.release(releaseError ? new Error("Plus One transaction rollback failed") : undefined);
    }
  } catch {
    return { rows: [], error: true } as const;
  }
}
