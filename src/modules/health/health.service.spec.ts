import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const config = {
    get: jest.fn((_key: string, fallback?: string) => fallback),
  } as unknown as ConfigService;

  it('returns readiness when database responds', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const service = new HealthService(config, prisma as never);

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: 'ok',
      check: 'readiness',
      database: 'ok',
    });
  });

  it('throws service unavailable when database fails', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('db down')) };
    const service = new HealthService(config, prisma as never);

    await expect(service.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
