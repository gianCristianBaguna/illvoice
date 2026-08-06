const { Pool } = require('pg');
const connStr = process.env.DATABASE_URL;
if (!connStr) { console.log('No DATABASE_URL'); process.exit(1); }
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
pool.query(`CREATE TABLE IF NOT EXISTS "SeverityDataset" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL UNIQUE,
  "source" TEXT NOT NULL DEFAULT 'credible_severity_dataset',
  "severity" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "address" TEXT,
  "barangayId" TEXT,
  "analysis" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeverityDataset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SeverityDataset_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`).then(r => {
  console.log('SeverityDataset table created');
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
});