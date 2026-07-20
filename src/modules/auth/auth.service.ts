import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import {
  USERS_REPOSITORY,
  type SafeUser,
  type UsersRepository,
} from '../users/repositories/users.repository';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SignUpDto } from './dto/signup.dto';

export type JwtPayload = {
  sub: string;
  email: string;
  tokenVersion: number;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly passwordSaltRounds = 12;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly emailService: EmailService,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: UsersRepository,
  ) {}

  async signUp(dto: SignUpDto) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.passwordSaltRounds);
    const user = await this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (!user || !user.active) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    return this.buildAuthResponse(this.toSafeUser(user));
  }

  async logout(userId: string) {
    await this.usersRepository.incrementTokenVersion(userId);
    await this.usersRepository.revokeUserRefreshTokens(userId);

    return {
      message: 'Signed out successfully',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    const refreshToken = await this.usersRepository.findValidRefreshToken(tokenHash, new Date());

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenWasRevoked = await this.usersRepository.revokeRefreshToken(refreshToken.id);

    if (!tokenWasRevoked) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(this.toSafeUser(refreshToken.user));
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (user && user.active) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

      await this.usersRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      await this.sendPasswordResetEmail(user.email, rawToken);
    }

    return {
      message: 'If the email exists, password reset instructions will be sent',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const tokenHash = this.hashResetToken(dto.token);
    const resetToken = await this.usersRepository.findValidPasswordResetToken(tokenHash, new Date());

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.passwordSaltRounds);

    const tokenWasUsed = await this.usersRepository.markPasswordResetTokenAsUsed(resetToken.id);

    if (!tokenWasUsed) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    await this.usersRepository.update(resetToken.userId, { passwordHash });
    await this.usersRepository.incrementTokenVersion(resetToken.userId);
    await this.usersRepository.revokeUserRefreshTokens(resetToken.userId);

    return {
      message: 'Password updated successfully',
    };
  }

  private async buildAuthResponse(user: SafeUser) {
    const refreshToken = randomBytes(32).toString('hex');

    await this.usersRepository.createRefreshToken({
      userId: user.id,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
      refreshExpiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
      user,
    };
  }

  private hashResetToken(token: string) {
    return this.hashToken(token);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getRefreshTokenExpiresAt() {
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers = {
      s: 1000,
      m: 1000 * 60,
      h: 1000 * 60 * 60,
      d: 1000 * 60 * 60 * 24,
    };

    return new Date(Date.now() + amount * multipliers[unit as keyof typeof multipliers]);
  }

  private toSafeUser(user: SafeUser & { passwordHash?: string }): SafeUser {
    const safeUser = { ...user };
    delete safeUser.passwordHash;

    return safeUser;
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.config.get<string>('APP_WEB_URL', 'https://app.ledgerflow.local')}/reset-password?token=${token}`;

    try {
      await this.emailService.send({
        to: email,
        subject: 'Recuperacao de senha LedgerFlow',
        text: `Use o link para redefinir sua senha: ${resetUrl}`,
      });
    } catch (error) {
      this.logger.warn(
        `Password reset email could not be sent to ${email}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}
