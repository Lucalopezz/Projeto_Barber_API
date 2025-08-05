import { PartialType } from '@nestjs/mapped-types';
import { CreateBarberShopDto } from './create-barber-shop.dto';

export class UpdateBarberShopDto extends PartialType(CreateBarberShopDto) {}
