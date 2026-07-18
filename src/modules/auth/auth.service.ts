import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

export type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const devEmail = this.config.get<string>('AUTH_DEV_EMAIL') ?? 'dev@api-ledgerflow.local';
    const devPassword = this.config.get<string>('AUTH_DEV_PASSWORD') ?? 'change-me';

    if (dto.email !== devEmail || dto.password !== devPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: 'dev-user',
      email: dto.email,
      roles: ['admin'],
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
    };
  }
}
