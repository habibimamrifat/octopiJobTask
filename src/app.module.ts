import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './configs/configEnv.module';
import { PrismaModule } from './prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { RoleGuard } from './guards/role.guard';
import { MailModule } from './helpers/mail/mail.module';
import { AuthGuard } from './guards/auth.guard';
import { JwtHelperModule } from './helpers/jwt/jwt.module';
import { AuthModule } from './modules/auth/auth.module';
import { JobsModule } from './jobs/job.module';
import { BcryptModule } from './helpers/bcrypt/bcrypt.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    MailModule,
    JwtHelperModule,
    BcryptModule,
    AuthModule,
    JobsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuthGuard,
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
})
export class AppModule {}
