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
  providers: [AuthService, AuthGuard, RoleGuard],
  exports: [AuthService, AuthGuard, RoleGuard],
})
export class AuthModule {}
