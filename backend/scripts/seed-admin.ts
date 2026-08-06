import 'dotenv/config';
import { prisma } from '../src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@illvoice.local';
  const name = 'Illvoice Admin';
  const password = await bcrypt.hash('admin123', 10);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password, authMethod: 'USERNAME_PASSWORD', role: 'ADMIN', emailVerified: true, name },
    });
    console.log('Updated admin:', email);
  } else {
    await prisma.user.create({
      data: { email, password, name, authMethod: 'USERNAME_PASSWORD', role: 'ADMIN', emailVerified: true },
    });
    console.log('Created admin:', email);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
