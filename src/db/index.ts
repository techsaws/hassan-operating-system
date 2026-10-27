import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
const globalDb = globalThis as unknown as {
  leadSql?: ReturnType<typeof postgres>;
};
export function getDb() {
  if (!process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is missing. Configure .env.local and run npm run db:migrate.",
    );
  const client =
    globalDb.leadSql ??
    postgres(process.env.DATABASE_URL, { max: 5, connect_timeout: 5 });
  globalDb.leadSql = client;
  return drizzle(client, { schema });
}
