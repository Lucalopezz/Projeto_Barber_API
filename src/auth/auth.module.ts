import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { SessionUseCase } from './application/session.usecase';
import { SessionRepository } from './domain/repositories/session.repository';
import { SessionPrismaRepository } from './infrastructure/database/session-prisma.repository';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { SessionHttpService } from './infrastructure/session-http.service';
import { AuthController } from './infrastructure/auth.controller';
import { Module } from '@nestjs/common';
import { EnvConfigModule } from '@/shared/infrastructure/env-config/env-config.module';
import { JwtModule } from '@nestjs/jwt';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { AuthService } from './auth.service';
import { AuthGuard } from './guard/auth.guard';
import { RoleGuard } from './guard/role.guard';

@Module({
  imports: [
    EnvConfigModule,
    JwtModule.registerAsync({
      imports: [EnvConfigModule],
      useFactory: async (configService: EnvConfigService) => ({
        global: true,
        secret: configService.getJwtSecret(),
        signOptions: { expiresIn: configService.getJtwExpiresInSeconds() },
      }),
      inject: [EnvConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    RoleGuard,
    SessionHttpService,
    {
      provide: 'SessionRepository',
      useFactory: (prisma: PrismaService) =>
        new SessionPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: SessionUseCase,
      useFactory: (repository: SessionRepository, config: EnvConfigService) => {
        config.getAuthCookieSecure();
        return new SessionUseCase(
          repository,
          {
            id: randomUUID,
            token: () => randomBytes(32).toString('base64url'),
            hash: (value: string) =>
              createHash('sha256').update(value).digest('hex'),
          },
          config.getAuthSessionTtlSeconds(),
        );
      },
      inject: ['SessionRepository', EnvConfigService],
    },
  ],
  exports: [
    AuthService,
    AuthGuard,
    RoleGuard,
    SessionHttpService,
    'SessionRepository',
  ],
})
export class AuthModule {}
