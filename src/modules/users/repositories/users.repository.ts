import type { User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

export type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  passwordHash?: string;
};

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepository {
  create(input: CreateUserInput): Promise<SafeUser>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, input: UpdateUserInput): Promise<SafeUser>;
  incrementTokenVersion(id: string): Promise<void>;
  createPasswordResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findValidPasswordResetToken(tokenHash: string, now: Date): Promise<{
    id: string;
    userId: string;
    usedAt: Date | null;
    expiresAt: Date;
  } | null>;
  markPasswordResetTokenAsUsed(id: string): Promise<boolean>;
  createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findValidRefreshToken(tokenHash: string, now: Date): Promise<{
    id: string;
    user: User;
  } | null>;
  revokeRefreshToken(id: string): Promise<boolean>;
  revokeUserRefreshTokens(userId: string): Promise<void>;
}
