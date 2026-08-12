import 'dotenv/config';
import { prisma } from '../src/prisma';

async function main() {
  console.log('Clearing database...');

  await prisma.multimedia.deleteMany({});
  console.log('Deleted multimedia');

  await prisma.notification.deleteMany({});
  console.log('Deleted notifications');

  await prisma.severityDataset.deleteMany({});
  console.log('Deleted severity datasets');

  await prisma.session.deleteMany({});
  console.log('Deleted sessions');

  await prisma.report.deleteMany({});
  console.log('Deleted reports');

  await prisma.severityKeyword.deleteMany({});
  console.log('Deleted severity keywords');

  await prisma.announcement.deleteMany({});
  console.log('Deleted announcements');

  await prisma.emergencyNumber.deleteMany({});
  console.log('Deleted emergency numbers');

  await prisma.barangay.deleteMany({});
  console.log('Deleted barangays');

  const deletedUsers = await prisma.user.deleteMany({
    where: { email: { not: 'admin@illvoice.local' } },
  });
  console.log(`Deleted ${deletedUsers.count} users (preserved admin@illvoice.local)`);

  await prisma.$disconnect();
  console.log('Database cleared successfully');
}

main().catch((err) => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
