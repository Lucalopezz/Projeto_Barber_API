import { DynamicModule, Module } from '@nestjs/common';
import { EnvConfigModule } from './shared/infrastructure/env-config/env-config.module';
import { ConfigModule, ConfigModuleOptions } from '@nestjs/config';
import { join } from 'path';

@Module({
  imports: [EnvConfigModule],
})
export class AppModule extends ConfigModule {
  static async forRoot(
    options: ConfigModuleOptions = {},
  ): Promise<DynamicModule> {
    return super.forRoot({
      ...options,
      envFilePath: [
        join(__dirname, `../../../../.env.${process.env.NODE_ENV}`),
      ],
    });
  }
}
