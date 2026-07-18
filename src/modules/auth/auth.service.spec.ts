import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import type { UsersRepository } from '../users/repositories/users.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');

  const user: User = {
    id: 'user-1',
    email: 'leandro@example.com',
    name: 'Leandro Silva',
    passwordHash: 'hashed-password',
    active: true,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };

  let usersRepository: jest.Mocked<UsersRepository>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let emailService: jest.Mocked<Pick<EmailService, 'send'>>;
  let service: AuthService;

  beforeEach(() => {
    usersRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      incrementTokenVersion: jest.fn(),
      createPasswordResetToken: jest.fn(),
      findValidPasswordResetToken: jest.fn(),
      markPasswordResetTokenAsUsed: jest.fn(),
      createRefreshToken: jest.fn(),
      findValidRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeUserRefreshTokens: jest.fn(),
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    };
    emailService = {
      send: jest.fn().mockResolvedValue({ messageId: 'email-1' }),
    };

    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        if (key === 'APP_WEB_URL') return 'https://app.ledgerflow.test';
        return fallback;
      }),
    } as unknown as ConfigService;

    service = new AuthService(
      config,
      jwt as unknown as JwtService,
      emailService as unknown as EmailService,
      usersRepository,
    );
  });

  it('creates a user with a hashed password and returns auth data without passwordHash', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation((input) =>
      Promise.resolve({
        id: user.id,
        active: user.active,
        tokenVersion: user.tokenVersion,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        name: input.name,
        email: input.email,
      }),
    );

    const result = await service.signUp({
      name: 'Leandro Silva',
      email: 'leandro@example.com',
      password: 'StrongPass123',
      passwordConfirmation: 'StrongPass123',
    });

    expect(usersRepository.create.mock.calls).toHaveLength(1);
    const createInput = usersRepository.create.mock.calls[0][0];
    expect(createInput).toMatchObject({
      name: 'Leandro Silva',
      email: 'leandro@example.com',
    });
    expect(typeof createInput.passwordHash).toBe('string');
    expect(createInput.passwordHash).not.toBe('StrongPass123');
    await expect(bcrypt.compare('StrongPass123', createInput.passwordHash)).resolves.toBe(true);
    expect(jwt.signAsync.mock.calls).toEqual([
      [
        {
          sub: user.id,
          email: user.email,
          tokenVersion: user.tokenVersion,
        },
      ],
    ]);
    expect(typeof result.refreshToken).toBe('string');
    expect(result).toEqual({
      accessToken: 'signed-jwt',
      refreshToken: result.refreshToken,
      tokenType: 'Bearer',
      expiresIn: '15m',
      refreshExpiresIn: '7d',
      user: {
        id: user.id,
        active: user.active,
        tokenVersion: user.tokenVersion,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        name: 'Leandro Silva',
        email: 'leandro@example.com',
      },
    });
    expect(result.refreshToken).toHaveLength(64);
    expect(usersRepository.createRefreshToken.mock.calls).toHaveLength(1);
    const refreshTokenInput = usersRepository.createRefreshToken.mock.calls[0][0];
    expect(refreshTokenInput.userId).toBe(user.id);
    expect(refreshTokenInput.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(refreshTokenInput.tokenHash).not.toBe(result.refreshToken);
    expect(refreshTokenInput.expiresAt).toBeInstanceOf(Date);
    expect('passwordHash' in result.user).toBe(false);
  });

  it('rejects signup when password confirmation does not match', async () => {
    await expect(
      service.signUp({
        name: 'Leandro Silva',
        email: 'leandro@example.com',
        password: 'StrongPass123',
        passwordConfirmation: 'DifferentPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(usersRepository.create.mock.calls).toHaveLength(0);
  });

  it('rejects signup when email already exists', async () => {
    usersRepository.findByEmail.mockResolvedValue(user);

    await expect(
      service.signUp({
        name: 'Leandro Silva',
        email: 'leandro@example.com',
        password: 'StrongPass123',
        passwordConfirmation: 'StrongPass123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with a valid password and returns generic auth data', async () => {
    const passwordHash = await bcrypt.hash('StrongPass123', 4);
    usersRepository.findByEmail.mockResolvedValue({ ...user, passwordHash });

    const result = await service.login({
      email: 'leandro@example.com',
      password: 'StrongPass123',
    });

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.refreshToken).toHaveLength(64);
    expect(usersRepository.createRefreshToken.mock.calls).toHaveLength(1);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('uses the same generic error for missing user and wrong password', async () => {
    usersRepository.findByEmail.mockResolvedValueOnce(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'StrongPass123' }),
    ).rejects.toMatchObject({
      message: 'Email or password is incorrect',
    });

    const passwordHash = await bcrypt.hash('StrongPass123', 4);
    usersRepository.findByEmail.mockResolvedValueOnce({ ...user, passwordHash });

    await expect(
      service.login({ email: 'leandro@example.com', password: 'WrongPass123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes current tokens on logout', async () => {
    await expect(service.logout(user.id)).resolves.toEqual({
      message: 'Signed out successfully',
    });
    expect(usersRepository.incrementTokenVersion.mock.calls).toEqual([[user.id]]);
    expect(usersRepository.revokeUserRefreshTokens.mock.calls).toEqual([[user.id]]);
  });

  it('rotates a valid refresh token and returns a new token pair', async () => {
    usersRepository.findValidRefreshToken.mockResolvedValue({
      id: 'refresh-token-1',
      user,
    });
    usersRepository.revokeRefreshToken.mockResolvedValue(true);

    const result = await service.refresh({
      refreshToken: 'b'.repeat(64),
    });

    expect(result.accessToken).toBe('signed-jwt');
    expect(result.refreshToken).toHaveLength(64);
    expect(usersRepository.revokeRefreshToken.mock.calls).toEqual([['refresh-token-1']]);
    expect(usersRepository.createRefreshToken.mock.calls).toHaveLength(1);
    expect(usersRepository.createRefreshToken.mock.calls[0][0].userId).toBe(user.id);
  });

  it('rejects refresh when token is invalid or already rotated concurrently', async () => {
    usersRepository.findValidRefreshToken.mockResolvedValueOnce(null);

    await expect(service.refresh({ refreshToken: 'b'.repeat(64) })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    usersRepository.findValidRefreshToken.mockResolvedValueOnce({
      id: 'refresh-token-1',
      user,
    });
    usersRepository.revokeRefreshToken.mockResolvedValueOnce(false);

    await expect(service.refresh({ refreshToken: 'b'.repeat(64) })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not reveal whether an email exists on forgot password', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(service.forgotPassword({ email: 'missing@example.com' })).resolves.toEqual({
      message: 'If the email exists, password reset instructions will be sent',
    });
    expect(usersRepository.createPasswordResetToken.mock.calls).toHaveLength(0);
    expect(emailService.send.mock.calls).toHaveLength(0);
  });

  it('stores only a hashed reset token and sends reset instructions when user exists', async () => {
    usersRepository.findByEmail.mockResolvedValue(user);

    await service.forgotPassword({ email: user.email });

    expect(usersRepository.createPasswordResetToken.mock.calls).toHaveLength(1);
    const resetTokenInput = usersRepository.createPasswordResetToken.mock.calls[0][0];
    expect(resetTokenInput.userId).toBe(user.id);
    expect(resetTokenInput.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(resetTokenInput.expiresAt).toBeInstanceOf(Date);
    expect(emailService.send.mock.calls).toHaveLength(1);
    expect(emailService.send.mock.calls[0][0]).toMatchObject({
      to: user.email,
      subject: 'Recuperacao de senha LedgerFlow',
    });
  });

  it('resets password using a valid one-time token and revokes previous JWTs', async () => {
    usersRepository.findValidPasswordResetToken.mockResolvedValue({
      id: 'reset-token-1',
      userId: user.id,
      usedAt: null,
      expiresAt: new Date('2026-07-18T12:30:00.000Z'),
    });
    usersRepository.markPasswordResetTokenAsUsed.mockResolvedValue(true);

    await expect(
      service.resetPassword({
        token: 'a'.repeat(64),
        password: 'NewStrongPass123',
        passwordConfirmation: 'NewStrongPass123',
      }),
    ).resolves.toEqual({
      message: 'Password updated successfully',
    });

    expect(usersRepository.update.mock.calls).toHaveLength(1);
    const updateInput = usersRepository.update.mock.calls[0][1];
    expect(typeof updateInput.passwordHash).toBe('string');
    await expect(bcrypt.compare('NewStrongPass123', updateInput.passwordHash ?? '')).resolves.toBe(
      true,
    );
    expect(usersRepository.update.mock.calls[0][0]).toBe(user.id);
    expect(usersRepository.incrementTokenVersion.mock.calls).toEqual([[user.id]]);
  });

  it('rejects reset when token is invalid or already consumed concurrently', async () => {
    usersRepository.findValidPasswordResetToken.mockResolvedValueOnce(null);

    await expect(
      service.resetPassword({
        token: 'a'.repeat(64),
        password: 'NewStrongPass123',
        passwordConfirmation: 'NewStrongPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    usersRepository.findValidPasswordResetToken.mockResolvedValueOnce({
      id: 'reset-token-1',
      userId: user.id,
      usedAt: null,
      expiresAt: new Date('2026-07-18T12:30:00.000Z'),
    });
    usersRepository.markPasswordResetTokenAsUsed.mockResolvedValueOnce(false);

    await expect(
      service.resetPassword({
        token: 'a'.repeat(64),
        password: 'NewStrongPass123',
        passwordConfirmation: 'NewStrongPass123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
