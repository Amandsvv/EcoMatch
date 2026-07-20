import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  console.log("Running database migrations...");

  await migrate(db, {
    migrationsFolder: "./migrations",
  });

  console.log("✅ Migrations completed.");

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});