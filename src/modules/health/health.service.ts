import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getHealth() {
    return {
      status: 'ok',
      service: this.config.get<string>('APP_NAME') ?? 'api-ledgerflow',
      timestamp: new Date().toISOString(),
    };
  }

  getLiveness() {
    return {
      status: 'ok',
      check: 'liveness',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        check: 'readiness',
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        check: 'readiness',
        database: 'error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
