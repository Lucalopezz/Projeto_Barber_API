import { Module } from '@nestjs/common';
import { BarberShopService } from './barber-shop.service';
import { BarberShopController } from './barber-shop.controller';

@Module({
  controllers: [BarberShopController],
  providers: [BarberShopService],
})
export class BarberShopModule {}
