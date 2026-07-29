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
      get: jest.fn((key: string) =>
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
      get: jest.fn((key: string) =>
        ({ NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: '*' })[key],
      ),
    } as unknown as ConfigService;
    const service = new EnvConfigService(configService);

    expect(() => service.getCorsAllowedOrigins()).toThrow(
      'CORS_ALLOWED_ORIGINS cannot contain "*" outside development',
    );
  });
});
