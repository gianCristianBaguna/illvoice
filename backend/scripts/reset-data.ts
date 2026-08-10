import { prisma } from '../src/prisma';

async function applyMigrations() {
  const { execSync } = await import('child_process');
  console.log('Applying pending migrations...');
  try {
    const result = execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    console.log('Migration output:', result);
    console.log('Migrations applied successfully');
  } catch (err: any) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || '';
    if (stdout.includes('not doing anything') || stderr.includes('not doing anything')) {
      console.log('No pending migrations to apply, continuing...');
    } else {
      console.error('Migration failed:', stdout, stderr);
      throw err;
    }
  }
}

async function resetData() {
  console.log('Starting data reset...');

  // Delete in order respecting foreign key constraints
  console.log('Deleting multimedia...');
  await prisma.multimedia.deleteMany();

  console.log('Deleting notifications...');
  await prisma.notification.deleteMany();

  console.log('Deleting severity datasets...');
  await prisma.severityDataset.deleteMany();

  console.log('Deleting sessions...');
  await prisma.session.deleteMany();

  console.log('Deleting severity keywords...');
  await prisma.severityKeyword.deleteMany();

  console.log('Deleting announcements...');
  await prisma.announcement.deleteMany();

  console.log('Deleting emergency numbers...');
  await prisma.emergencyNumber.deleteMany();

  console.log('Deleting all reports...');
  await prisma.report.deleteMany();

  console.log('Deleting resident users...');
  const residentDeleteResult = await prisma.user.deleteMany({
    where: {
      role: 'RESIDENT',
    },
  });
  console.log(`Deleted ${residentDeleteResult.count} resident users`);

  const remainingUsers = await prisma.user.count();
  console.log(`Remaining users (admin/barangay): ${remainingUsers}`);

  console.log('Data reset complete!');
  await prisma.$disconnect();
}

async function main() {
  await applyMigrations();
  await resetData();
}

main().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
