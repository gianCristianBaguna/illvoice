const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres.qbrflasjchmignldxlfd:asadaweqwe123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function runSQL(file) {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync(file, 'utf8');
  await client.query(sql);
  await client.end();
  console.log('Applied:', path.basename(path.dirname(file)));
}

async function main() {
  const files = [
    'prisma/migrations/20260801000000_add_address_to_report/migration.sql',
    'prisma/migrations/20260806160122_add_severity_dataset_table/migration.sql',
    'prisma/migrations/20260806160207_add_severity_keyword_table/migration.sql',
    'prisma/migrations/20260806160300_add_flagged_columns_to_report/migration.sql',
    'prisma/migrations/20260807103859_add_remarks_to_report/migration.sql',
    'prisma/migrations/20261101000000_add_email_verification/migration.sql',
    'prisma/migrations/20261201000000_add_announcements_and_emergency_numbers/migration.sql',
  ];

  for (const f of files) {
    await runSQL(f);
  }
  console.log('All migrations applied!');
}

main().catch(e => { console.error(e); process.exit(1); });
