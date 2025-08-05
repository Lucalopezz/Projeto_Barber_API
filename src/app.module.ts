import { Module } from '@nestjs/common';
import { EnvConfigModule } from './shared/infrastructure/env-config/env-config.module';
import { UsersModule } from './users/infrastructure/users.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { BarberShopModule } from './barberShop/infrastructure/barber-shop.module';

@Module({
  imports: [EnvConfigModule, UsersModule, DatabaseModule, BarberShopModule],
})
export class AppModule {}
