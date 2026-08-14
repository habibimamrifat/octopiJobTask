import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import { BcryptHelper } from '../src/helpers/bcrypt/bcrypt.helper';

config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env',
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function seedPlatformAdmin() {
  const platformAdmin = await prisma.user.findFirst({
    where: {
      role: UserRole.PLATFORM_ADMIN,
    },
  });

  if (platformAdmin) {
    return;
  }

  const bcrypt = new BcryptHelper();

  const password = await bcrypt.createHash(
    process.env.PLATFORM_ADMIN_PASSWORD!,
  );

  await prisma.user.create({
    data: {
      name: process.env.PLATFORM_ADMIN_NAME!,
      email: process.env.PLATFORM_ADMIN_EMAIL!,
      password,
      role: UserRole.PLATFORM_ADMIN,
    },
  });

  console.log('Platform admin seeded successfully');
}
