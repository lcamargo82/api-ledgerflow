import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.AUTH_DEV_EMAIL ?? 'dev@api-ledgerflow.local';
  const password = process.env.AUTH_DEV_PASSWORD ?? 'change-me';

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Development User',
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
