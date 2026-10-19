import { Injectable } from '@nestjs/common';
import { EnvConfig } from './env-config.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvConfigService implements EnvConfig {
  constructor(private configService: ConfigService) {}

  getAppPort(): number {
    return Number(this.configService.get<number>('APP_PORT'));
  }

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV');
  }

  getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }
  getJtwExpiresInSeconds(): number {
    return this.positiveSeconds('JWT_EXPIRES_IN', 900);
  }

  private positiveSeconds(key: string, fallback: number): number {
    const value = this.configService.get<string | number>(key) ?? fallback;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > 2147483647)
      throw new Error(`${key} must be positive integer seconds`);
    return parsed;
  }
  getAuthSessionTtlSeconds() {
    return this.positiveSeconds('AUTH_SESSION_TTL_SECONDS', 604800);
  }
  getAuthCookieSecure() {
    const value = this.configService.get<string>('AUTH_COOKIE_SECURE');
    if (value === undefined) return this.getNodeEnv() === 'production';
    if (value !== 'true' && value !== 'false')
      throw new Error('AUTH_COOKIE_SECURE must be true or false');
    return value === 'true';
  }
  getCorsAllowedOrigins(): string[] {
    const origins = (
      this.configService.get<string>('CORS_ALLOWED_ORIGINS') ?? ''
    )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.includes('*'))
      throw new Error(
        'CORS_ALLOWED_ORIGINS cannot contain "*" for session authentication',
      );
    for (const origin of origins) {
      try {
        if (new URL(origin).origin !== origin || !/^https?:/.test(origin))
          throw new Error();
      } catch {
        throw new Error(
          'CORS_ALLOWED_ORIGINS must contain exact HTTP(S) origins',
        );
      }
    }
    return origins;
  }
}
