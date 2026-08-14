import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import { createTransport } from 'nodemailer';
import { BcryptHelper } from '../src/helpers/bcrypt/bcrypt.helper';

config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env',
});

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export async function seedPlatformAdmin() {
  console.log('seeding admin');
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

  const admin = await prisma.user.create({
    data: {
      name: process.env.PLATFORM_ADMIN_NAME!,
      email: process.env.PLATFORM_ADMIN_EMAIL!,
      password,
      role: UserRole.PLATFORM_ADMIN,
    },
  });

  const transporter = createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: admin.email,
    subject: 'Platform Admin Created',
    html: `
      <h2>Platform Admin Created</h2>
      <p>Hello ${admin.name},</p>
      <p>Your platform admin account has been created successfully.</p>
      <p>This email confirms that the mail configuration is working.</p>
    `,
  });

  console.log('Platform admin seeded successfully');
  console.log('Test email sent successfully');
}
