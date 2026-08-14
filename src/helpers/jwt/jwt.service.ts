import { Inject, Injectable } from '@nestjs/common';
import {
  JwtService,
  type JwtSignOptions,
  type JwtVerifyOptions,
} from '@nestjs/jwt';
import { providerNames } from '../../consts/providerNames.const';
import type { JwtPayload } from '../../types/jwt-payload.type';

@Injectable()
export class JwtHelperService {
  constructor(
    private readonly jwtService: JwtService,

    @Inject(providerNames.JWT_ACCESS_CONFIG)
    private readonly accessConfig: JwtSignOptions,

    @Inject(providerNames.JWT_REFRESH_CONFIG)
    private readonly refreshConfig: JwtSignOptions,
  ) {}

  async createAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, this.accessConfig);
  }

  async createRefreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, this.refreshConfig);
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const options: JwtVerifyOptions = {
      secret: this.accessConfig.secret,
      issuer: this.accessConfig.issuer,
      audience: this.accessConfig.audience as string,
    };

    return this.jwtService.verifyAsync<JwtPayload>(token, options);
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const options: JwtVerifyOptions = {
      secret: this.refreshConfig.secret,
      issuer: this.refreshConfig.issuer,
      audience: this.refreshConfig.audience as string,
    };

    return this.jwtService.verifyAsync<JwtPayload>(token, options);
  }
}
