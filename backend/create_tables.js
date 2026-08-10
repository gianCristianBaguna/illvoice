const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.qbrflasjchmignldxlfd:asadaweqwe123@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const sql = `
    CREATE TABLE IF NOT EXISTS "Announcement" (
        id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'NORMAL',
        "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Announcement_pkey" PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS "EmergencyNumber" (
        id TEXT NOT NULL,
        category TEXT NOT NULL,
        number TEXT NOT NULL,
        label TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EmergencyNumber_pkey" PRIMARY KEY (id)
    );

    CREATE INDEX IF NOT EXISTS "Announcement_createdById_idx" ON "Announcement"("createdById");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'Announcement' AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'Announcement_createdById_fkey'
      ) THEN
        ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `;

  await client.query(sql);
  await client.end();
  console.log('Tables created successfully!');
}

main().catch(e => { console.error(e); process.exit(1); });
