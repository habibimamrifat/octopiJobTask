import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtHelperService } from '../helpers/jwt/jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtHelper: JwtHelperService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = authorization.substring(7);

    try {
      request.user = await this.jwtHelper.verifyAccessToken(token);

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
