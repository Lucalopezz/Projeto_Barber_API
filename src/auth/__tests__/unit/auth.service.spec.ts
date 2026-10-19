import { AuthService } from '@/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { Role } from '@/users/domain/entities/role.enum';

describe('AuthService access-token issuance', () => {
  it('issues distinct JWTs when refreshed within the same second', async () => {
    const payloads: Array<Record<string, unknown>> = [];
    const jwt = {
      signAsync: jest.fn(async (payload: Record<string, unknown>) => {
        payloads.push(payload);
        return JSON.stringify(payload);
      }),
    } as unknown as JwtService;
    const config = {
      getJtwExpiresInSeconds: () => 900,
    } as unknown as EnvConfigService;
    const auth = new AuthService(jwt, config);
    const sessionExpiresAt = new Date(Date.now() + 60_000);

    const first = await auth.generateJwt(
      'user',
      Role.client,
      'session',
      sessionExpiresAt,
    );
    const second = await auth.generateJwt(
      'user',
      Role.client,
      'session',
      sessionExpiresAt,
    );

    expect(payloads[0].iat).toBe(payloads[1].iat);
    expect(typeof payloads[0].jti).toBe('string');
    expect(payloads[0].jti).not.toBe(payloads[1].jti);
    expect(first.accessToken).not.toBe(second.accessToken);
  });
});
