const { Pool } = require('pg');
const connStr = process.env.DATABASE_URL;
if (!connStr) { console.log('No DATABASE_URL'); process.exit(1); }
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
pool.query("SELECT enumtypid::regtype AS enum_name FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid GROUP BY enumtypid::regtype ORDER BY enum_name").then(r => {
  console.log('Enums:', r.rows.map(r => r.enum_name).join(', '));
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
});