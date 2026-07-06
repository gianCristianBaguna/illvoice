import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { prisma } from './src/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@illvoice.local';
  const password = 'admin123';
  const name = 'Admin User';
  const role = 'ADMIN';

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashedPassword, name, role, authMethod: 'USERNAME_PASSWORD' },
    create: { email, name, password: hashedPassword, role, authMethod: 'USERNAME_PASSWORD' },
  });

  console.log('Admin ready:', user.email);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });