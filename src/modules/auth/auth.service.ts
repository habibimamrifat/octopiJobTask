import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtHelperService } from '../../helpers/jwt/jwt.service';
import { MailService } from '../../helpers/mail/mail.service';
import { LoginDto } from './dto/logIn.dto';
import { ForgotPasswordDto } from './dto/forget-password.dto';
import { JwtPayload } from '../../types/jwt-payload.type';
import { User } from '@prisma/client';
import { BcryptAbstract } from '../../helpers/bcrypt/bcrypt.abstract';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcrypt: BcryptAbstract,
    private readonly jwtHelper: JwtHelperService,
    private readonly mailService: MailService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.bcrypt.compareHash(
      loginDto.password,
      user.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      id: user.id,
      role: user.role,
      ...(user.organizationId && {
        organizationId: user.organizationId,
      }),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtHelper.createAccessToken(payload),
      this.jwtHelper.createRefreshToken(payload),
    ]);

    const hashedRefreshToken = await this.bcrypt.createHash(refreshToken);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: hashedRefreshToken,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    let payload: JwtPayload;

    try {
      payload = await this.jwtHelper.verifyRefreshToken(
        refreshTokenDto.refreshToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.id,
      },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenValid = await this.bcrypt.compareHash(
      refreshTokenDto.refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newPayload: JwtPayload = {
      id: user.id,
      role: user.role,
      ...(user.organizationId && {
        organizationId: user.organizationId,
      }),
    };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtHelper.createAccessToken(newPayload),
      this.jwtHelper.createRefreshToken(newPayload),
    ]);

    const hashedRefreshToken = await this.bcrypt.createHash(newRefreshToken);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refreshToken: hashedRefreshToken,
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: forgotPasswordDto.email,
      },
    });

    if (!user) {
      return {
        message: 'If the email exists, a password reset link has been sent.',
      };
    }

    const resetToken = randomUUID();

    const hashedResetToken = await this.bcrypt.createHash(resetToken);

    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpiresAt,
      },
    });

    const resetLink = `${process.env.FRONTEND_BASE_URL}/reset-password/${resetToken}`;

    await this.mailService.sendMail(
      user.email,
      'Password Reset',
      `
        <h2>Password Reset</h2>

        <p>Hello ${user.name},</p>

        <p>
          We received a request to reset your password.
        </p>

        <p>
          Your password reset token is:
        </p>

        <strong>${resetLink}</strong>

        <p>
          This token expires in 15 minutes.
        </p>
      `,
    );

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const users = await this.prisma.user.findMany({
      where: {
        resetToken: {
          not: null,
        },
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    let matchedUser: User | null = null;

    for (const user of users) {
      if (!user.resetToken) {
        continue;
      }

      const valid = await this.bcrypt.compareHash(
        resetPasswordDto.token,
        user.resetToken,
      );

      if (valid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const password = await this.bcrypt.createHash(resetPasswordDto.password);

    await this.prisma.user.update({
      where: {
        id: matchedUser.id,
      },
      data: {
        password,
        resetToken: null,
        resetTokenExpiresAt: null,
        refreshToken: null,
      },
    });

    return {
      message: 'Password reset successfully',
    };
  }
}
