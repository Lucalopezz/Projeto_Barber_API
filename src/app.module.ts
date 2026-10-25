import { Module } from '@nestjs/common';
import { EnvConfigModule } from './shared/infrastructure/env-config/env-config.module';
import { UsersModule } from './users/infrastructure/users.module';
import { DatabaseModule } from './shared/infrastructure/database/database.module';
import { BarberShopModule } from './barberShop/infrastructure/barber-shop.module';
import { ServicesModule } from './services/infrastructure/services.module';
import { AppointmentsModule } from './appointments/infrastructure/appointments.module';
import { NotificationsModule } from './notifications/infrastructure/notifications.module';

@Module({
  imports: [
    EnvConfigModule,
    UsersModule,
    DatabaseModule,
    BarberShopModule,
    ServicesModule,
    AppointmentsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
