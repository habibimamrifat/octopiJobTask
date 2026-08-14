import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthCleanupJob {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 * * * *')
  async cleanupExpiredResetTokens() {
    await this.prisma.user.updateMany({
      where: {
        resetToken: {
          not: null,
        },
        resetTokenExpiresAt: {
          lt: new Date(),
        },
      },
      data: {
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }
}
