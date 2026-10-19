import { Test, TestingModule } from '@nestjs/testing';
import { EnvConfigService } from '../../env-config.service';
import { EnvConfigModule } from '../../env-config.module';
import { ConfigService } from '@nestjs/config';

describe('EnvConfigService', () => {
  let sut: EnvConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EnvConfigModule.forRoot()],
      providers: [EnvConfigService],
    }).compile();

    sut = module.get<EnvConfigService>(EnvConfigService);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('should return variable PORT', () => {
    expect(sut.getAppPort()).toBe(3000);
  });

  it('should return variable ENV', () => {
    expect(sut.getNodeEnv()).toBe('test');
  });

  it('should return configured CORS origins', () => {
    const configService = {
      get: jest.fn(
        (key: string) =>
          ({
            NODE_ENV: 'production',
            CORS_ALLOWED_ORIGINS:
              'https://app.example.com, https://admin.example.com',
          })[key],
      ),
    } as unknown as ConfigService;
    const service = new EnvConfigService(configService);

    expect(service.getCorsAllowedOrigins()).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('should reject wildcard CORS origins outside development', () => {
    const configService = {
      get: jest.fn(
        (key: string) =>
          ({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' })[key],
      ),
    } as unknown as ConfigService;
    const service = new EnvConfigService(configService);

    expect(() => service.getCorsAllowedOrigins()).toThrow(
      'CORS_ALLOWED_ORIGINS cannot contain "*" for session authentication',
    );
  });
});

describe('Session configuration validation', () => {
  const make = (values: Record<string, unknown>) =>
    new EnvConfigService({
      get: (key: string) => values[key],
    } as ConfigService);
  it('defaults access/session TTL to 900/604800 and Secure to production only', () => {
    const config = make({ NODE_ENV: 'production' });
    expect(config.getJtwExpiresInSeconds()).toBe(900);
    expect(config.getAuthSessionTtlSeconds()).toBe(604800);
    expect(config.getAuthCookieSecure()).toBe(true);
    expect(make({ NODE_ENV: 'test' }).getAuthCookieSecure()).toBe(false);
  });
  it.each(['0', '-1', 'NaN', '1.5', 'Infinity', '2147483648'])(
    'rejects invalid TTL %s',
    (value) => {
      expect(() =>
        make({ JWT_EXPIRES_IN: value }).getJtwExpiresInSeconds(),
      ).toThrow();
      expect(() =>
        make({ AUTH_SESSION_TTL_SECONDS: value }).getAuthSessionTtlSeconds(),
      ).toThrow();
    },
  );
  it('rejects wildcard even in development and noncanonical origins', () => {
    expect(() =>
      make({
        NODE_ENV: 'development',
        CORS_ALLOWED_ORIGINS: '*',
      }).getCorsAllowedOrigins(),
    ).toThrow();
    expect(() =>
      make({
        CORS_ALLOWED_ORIGINS: 'https://example.com/path',
      }).getCorsAllowedOrigins(),
    ).toThrow();
    expect(() =>
      make({ AUTH_COOKIE_SECURE: 'yes' }).getAuthCookieSecure(),
    ).toThrow();
  });
});
