import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { UsersRepository } from './repositories/users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const now = new Date('2026-07-18T12:00:00.000Z');

  let user: User;
  let usersRepository: jest.Mocked<UsersRepository>;
  let service: UsersService;

  beforeEach(() => {
    user = {
      id: 'user-1',
      email: 'leandro@example.com',
      name: 'Leandro Silva',
      passwordHash: 'hashed-password',
      active: true,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    };
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
    service = new UsersService(usersRepository);
  });

  it('returns the active user profile without passwordHash', async () => {
    usersRepository.findById.mockResolvedValue(user);

    const result = await service.getProfile(user.id);

    expect(result).toMatchObject({
      id: user.id,
      email: user.email,
      name: user.name,
    });
    expect('passwordHash' in result).toBe(false);
  });

  it('throws not found for missing or inactive user profile', async () => {
    usersRepository.findById.mockResolvedValueOnce(null);

    await expect(service.getProfile(user.id)).rejects.toBeInstanceOf(NotFoundException);

    usersRepository.findById.mockResolvedValueOnce({ ...user, active: false });

    await expect(service.getProfile(user.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects empty profile updates', async () => {
    await expect(service.updateProfile(user.id, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(usersRepository.findById.mock.calls).toHaveLength(0);
  });

  it('updates profile fields using the authenticated user id', async () => {
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.update.mockResolvedValue({
      ...user,
      name: 'Leandro Updated',
      email: 'updated@example.com',
    });

    await expect(
      service.updateProfile(user.id, {
        name: 'Leandro Updated',
        email: 'updated@example.com',
      }),
    ).resolves.toMatchObject({
      id: user.id,
      name: 'Leandro Updated',
      email: 'updated@example.com',
    });

    expect(usersRepository.update.mock.calls).toEqual([
      [
        user.id,
        {
          name: 'Leandro Updated',
          email: 'updated@example.com',
          passwordHash: undefined,
        },
      ],
    ]);
  });

  it('rejects profile email already used by another user', async () => {
    usersRepository.findById.mockResolvedValue(user);
    usersRepository.findByEmail.mockResolvedValue({ ...user, id: 'another-user' });

    await expect(
      service.updateProfile(user.id, { email: 'used@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires and validates oldPassword when changing password', async () => {
    const passwordHash = await bcrypt.hash('OldPass123', 4);
    usersRepository.findById.mockResolvedValue({ ...user, passwordHash });

    await expect(
      service.updateProfile(user.id, { password: 'NewStrongPass123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      service.updateProfile(user.id, {
        password: 'NewStrongPass123',
        oldPassword: 'WrongPass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updates password with a new hash when oldPassword is valid', async () => {
    const passwordHash = await bcrypt.hash('OldPass123', 4);
    usersRepository.findById.mockResolvedValue({ ...user, passwordHash });
    usersRepository.update.mockResolvedValue(user);

    await service.updateProfile(user.id, {
      password: 'NewStrongPass123',
      oldPassword: 'OldPass123',
    });

    const updateInput = usersRepository.update.mock.calls[0][1];
    expect(typeof updateInput.passwordHash).toBe('string');
    expect(updateInput.passwordHash).not.toBe('NewStrongPass123');
    await expect(bcrypt.compare('NewStrongPass123', updateInput.passwordHash ?? '')).resolves.toBe(
      true,
    );
  });
});
