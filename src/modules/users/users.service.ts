import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { JwtPayload } from '../../types/jwt-payload.type';
import { MailService } from '../../helpers/mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: MailService,
  ) {}

async create(organizationId: string, dto: CreateUserDto) {
  const existingUser = await this.prisma.user.findUnique({
    where: {
      email: dto.email,
    },
  });

  if (existingUser) {
    throw new ConflictException(
      'A user with this email already exists',
    );
  }

  const organization = await this.prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!organization) {
    throw new NotFoundException('Organization not found');
  }

  const hashedPassword = await bcrypt.hash(dto.password, 12);

  let user;

  try {
    user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: UserRole.ORGANIZATION_MEMBER,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A user with this email already exists',
      );
    }

    throw error;
  }

  // Send invitation email separately.
  try {
    const loginUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const year = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Octopi</title>
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f7fa;
          font-family:Arial,Helvetica,sans-serif;
          color:#111827;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="background:#f5f7fa;padding:40px 20px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width:600px;
                  background:#ffffff;
                  border-radius:12px;
                  overflow:hidden;
                  border:1px solid #e5e7eb;
                "
              >

                <tr>
                  <td
                    style="
                      padding:28px 32px;
                      border-bottom:1px solid #f0f0f0;
                    "
                  >
                    <div
                      style="
                        font-size:24px;
                        font-weight:700;
                        color:#111827;
                      "
                    >
                      Octopi
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:36px 32px;">

                    <h1
                      style="
                        margin:0 0 16px;
                        font-size:24px;
                        line-height:1.3;
                      "
                    >
                      Welcome to Octopi
                    </h1>

                    <p
                      style="
                        margin:0 0 20px;
                        font-size:15px;
                        line-height:1.7;
                        color:#4b5563;
                      "
                    >
                      Hello ${dto.name},
                    </p>

                    <p
                      style="
                        margin:0 0 20px;
                        font-size:15px;
                        line-height:1.7;
                        color:#4b5563;
                      "
                    >
                      You have been added as a member of your organization
                      on Octopi. Your account has been created successfully.
                    </p>

                    <p
                      style="
                        margin:0 0 12px;
                        font-size:15px;
                        font-weight:600;
                      "
                    >
                      Your login credentials
                    </p>

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      style="
                        margin-bottom:24px;
                        background:#f9fafb;
                        border:1px solid #e5e7eb;
                        border-radius:8px;
                      "
                    >
                      <tr>
                        <td style="padding:16px 18px;">

                          <p
                            style="
                              margin:0 0 8px;
                              font-size:13px;
                              color:#6b7280;
                            "
                          >
                            Email Address
                          </p>

                          <p
                            style="
                              margin:0 0 16px;
                              font-size:15px;
                              font-weight:600;
                            "
                          >
                            ${dto.email}
                          </p>

                          <p
                            style="
                              margin:0 0 8px;
                              font-size:13px;
                              color:#6b7280;
                            "
                          >
                            Initial Password
                          </p>

                          <p
                            style="
                              margin:0;
                              font-size:15px;
                              font-weight:600;
                              word-break:break-all;
                            "
                          >
                            ${dto.password}
                          </p>

                        </td>
                      </tr>
                    </table>

                    <a
                      href="${loginUrl}/login"
                      style="
                        display:inline-block;
                        padding:12px 22px;
                        border-radius:8px;
                        background:#111827;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:14px;
                        font-weight:600;
                      "
                    >
                      Sign In to Octopi
                    </a>

                    <p
                      style="
                        margin:24px 0 0;
                        font-size:13px;
                        line-height:1.6;
                        color:#6b7280;
                      "
                    >
                      For security, please change your password after
                      signing in.
                    </p>

                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:20px 32px;
                      background:#f9fafb;
                      border-top:1px solid #f0f0f0;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:12px;
                        text-align:center;
                        color:#9ca3af;
                      "
                    >
                      © ${year} Octopi. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await this.emailService.sendMail(
      dto.email,
      'You are invited to access Octopi',
      html,
    );

    return {
      ...user,
      invitationEmailSent: true,
    };
  } catch (error) {
    console.error('Failed to send invitation email:', error);

    return {
      ...user,
      invitationEmailSent: false,
    };
  }
}

  async findAll(user: JwtPayload) {
    const where: Prisma.UserWhereInput = {};

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
      if (!user.organizationId) {
        throw new ForbiddenException('Organization context is required');
      }

      where.organizationId = user.organizationId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(user: JwtPayload, userId: string) {
    const where: Prisma.UserWhereInput = {
      id: userId,
    };

    if (user.role === UserRole.ORGANIZATION_ADMIN) {
      if (!user.organizationId) {
        throw new ForbiddenException('Organization context is required');
      }

      where.organizationId = user.organizationId;
    }

    const targetUser = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    return targetUser;
  }

  async update(organizationId: string, userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in your organization');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin cannot be modified');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }

    if (dto.email !== undefined) {
      data.email = dto.email;
    }

    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 12);
    }

    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
        },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  async updateRole(
    organizationId: string,
    userId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in your organization');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin role cannot be changed');
    }

    if (
      dto.role !== UserRole.ORGANIZATION_ADMIN &&
      dto.role !== UserRole.ORGANIZATION_MEMBER
    ) {
      throw new ForbiddenException('Invalid organization role');
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        updatedAt: true,
      },
    });
  }

  async remove(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found in your organization');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Platform admin cannot be removed');
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return {
      message: 'User removed successfully',
    };
  }
}
