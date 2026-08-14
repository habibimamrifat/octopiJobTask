import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { providerNames } from '../../consts/providerNames.const';
import { JwtSignOptions } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: providerNames.JWT_ACCESS_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtSignOptions => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: configService.getOrThrow(
          'JWT_ACCESS_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
        issuer: configService.getOrThrow<string>('JWT_ISSUER'),
        audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
      }),
    },
    {
      provide: providerNames.JWT_REFRESH_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtSignOptions => ({
        secret: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: configService.getOrThrow(
          'JWT_REFRESH_EXPIRES_IN',
        ) as JwtSignOptions['expiresIn'],
        issuer: configService.getOrThrow<string>('JWT_ISSUER'),
        audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
      }),
    },
  ],
  exports: [providerNames.JWT_ACCESS_CONFIG, providerNames.JWT_REFRESH_CONFIG],
})
export class JwtHelperModule {}
