import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@/users/domain/entities/role.enum';

type GenerateJwtProps = {
  accessToken: string;
  accessTokenExpiresAt: string;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: EnvConfigService,
  ) {}
  async generateJwt(
    userId: string,
    role: Role,
    sessionId: string,
    sessionExpiresAt: Date,
  ): Promise<GenerateJwtProps> {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = Math.min(
      now + this.configService.getJtwExpiresInSeconds(),
      Math.floor(sessionExpiresAt.getTime() / 1000),
    );
    const accessToken = await this.jwtService.signAsync(
      { id: userId, role, sid: sessionId, iat: now },
      { expiresIn: expiresAt - now },
    );
    return {
      accessToken,
      accessTokenExpiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  async verifyJwt(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.getJwtSecret(),
      algorithms: ['HS256'],
    });
  }
}
