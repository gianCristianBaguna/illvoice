const { Pool } = require('pg');
const connStr = process.env.DATABASE_URL;
if (!connStr) { console.log('No DATABASE_URL'); process.exit(1); }
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
pool.query('ALTER TABLE "SeverityDataset" ALTER COLUMN "severity" TYPE "Severity" USING "severity"::"Severity"').then(r => {
  console.log('Fixed severity column type to Severity enum');
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
});