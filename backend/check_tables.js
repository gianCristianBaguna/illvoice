const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.qbrflasjchmignldxlfd:asadaweqwe123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('Announcement', 'EmergencyNumber', '_prisma_migrations')
  `);
  console.log('Tables found:', tables.rows.map(r => r.table_name));

  const mig = await client.query('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at');
  console.log('Migrations applied:', mig.rows.map(r => r.migration_name));

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
