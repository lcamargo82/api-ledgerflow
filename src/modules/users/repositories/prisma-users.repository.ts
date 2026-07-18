import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../../database/prisma/prisma.service';
import type {
  CreateUserInput,
  SafeUser,
  UpdateUserInput,
  UsersRepository,
} from './users.repository';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateUserInput) {
    const user = await this.prisma.user.create({ data: input });
    return this.toSafeUser(user);
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, input: UpdateUserInput) {
    const user = await this.prisma.user.update({
      where: { id },
      data: input,
    });

    return this.toSafeUser(user);
  }

  async incrementTokenVersion(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  async createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    await this.prisma.passwordResetToken.create({ data: input });
  }

  findValidPasswordResetToken(tokenHash: string, now: Date) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
      },
    });
  }

  async markPasswordResetTokenAsUsed(id: string) {
    const result = await this.prisma.passwordResetToken.updateMany({
      where: {
        id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return result.count === 1;
  }

  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    await this.prisma.refreshToken.create({ data: input });
  }

  findValidRefreshToken(tokenHash: string, now: Date) {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
        user: {
          active: true,
        },
      },
      select: {
        id: true,
        user: true,
      },
    });
  }

  async revokeRefreshToken(id: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count === 1;
  }

  async revokeUserRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private toSafeUser(user: User): SafeUser {
    const safeUser: Omit<User, 'passwordHash'> & { passwordHash?: string } = { ...user };
    delete safeUser.passwordHash;

    return safeUser;
  }
}
