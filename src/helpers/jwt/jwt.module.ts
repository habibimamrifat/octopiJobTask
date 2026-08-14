import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { providerNames } from '../../consts/providerNames.const';
import { JwtHelperService } from './jwt.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
  ],

  providers: [
    {
      provide: providerNames.JWT_ACCESS_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: configService.getOrThrow<string>(
          'JWT_ACCESS_EXPIRES_IN',
        ),
      }),
    },
    {
      provide: providerNames.JWT_REFRESH_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: configService.getOrThrow<string>(
          'JWT_REFRESH_EXPIRES_IN',
        ),
      }),
    },

    JwtHelperService,
  ],

  exports: [JwtHelperService],
})
export class JwtHelperModule {}