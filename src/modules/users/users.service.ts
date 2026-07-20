import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { USERS_REPOSITORY, type SafeUser, type UsersRepository } from './repositories/users.repository';

@Injectable()
export class UsersService {
  private readonly passwordSaltRounds = 12;

  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async getProfile(userId: string): Promise<SafeUser> {
    const user = await this.usersRepository.findById(userId);

    if (!user || !user.active) {
      throw new NotFoundException('User not found');
    }

    return this.toSafeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    if (!dto.name && !dto.email && !dto.password) {
      throw new BadRequestException('At least one profile field must be provided');
    }

    const user = await this.usersRepository.findById(userId);

    if (!user || !user.active) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.usersRepository.findByEmail(dto.email);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    let passwordHash: string | undefined;

    if (dto.password) {
      if (!dto.oldPassword) {
        throw new UnauthorizedException('Current password is required');
      }

      const passwordMatches = await bcrypt.compare(dto.oldPassword, user.passwordHash);

      if (!passwordMatches) {
        throw new UnauthorizedException('Current password is invalid');
      }

      passwordHash = await bcrypt.hash(dto.password, this.passwordSaltRounds);
    }

    return this.usersRepository.update(userId, {
      name: dto.name,
      email: dto.email,
      passwordHash,
    });
  }

  private toSafeUser(user: SafeUser & { passwordHash?: string }): SafeUser {
    const safeUser = { ...user };
    delete safeUser.passwordHash;

    return safeUser;
  }
}
