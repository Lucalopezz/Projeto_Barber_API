import { EnvConfigService } from '@/shared/infrastructure/env-config/env-config.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@/users/domain/entities/role.enum';

type GenerateJwtProps = {
  accessToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: EnvConfigService,
  ) {}
  async generateJwt(userId: string, role: Role): Promise<GenerateJwtProps> {
    const accessToken = await this.jwtService.signAsync(
      { id: userId, role },
      {},
    );
    return { accessToken };
  }

  async verifyJwt(token: string) {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.getJwtSecret(),
    });
  }
}
