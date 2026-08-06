const { Pool } = require('pg');
const connStr = process.env.DATABASE_URL;
if (!connStr) { console.log('No DATABASE_URL'); process.exit(1); }
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    await pool.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "isFlagged" BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "flagType" TEXT`);
    await pool.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "flagReason" TEXT`);
    await pool.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "fraudCheck" JSONB`);
    await pool.query(`ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "flaggedAt" TIMESTAMP(3)`);
    console.log('Fraud detection migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
