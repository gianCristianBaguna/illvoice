require('dotenv/config');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    const result = await pool.query(
      'alter table "Report" add column if not exists "address" text'
    );
    console.log('Result:', result.command, result.rowCount);
    const columns = await pool.query(
      "select column_name from information_schema.columns where table_name='Report' order by ordinal_position"
    );
    console.log('Report columns:', columns.rows.map((row) => row.column_name).join(', '));
  } catch (error) {
    console.error('Error applying schema change:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
