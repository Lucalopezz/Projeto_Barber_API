import { Injectable } from '@nestjs/common';
import { CreateBarberShopDto } from './dto/create-barber-shop.dto';
import { UpdateBarberShopDto } from './dto/update-barber-shop.dto';

@Injectable()
export class BarberShopService {
  create(createBarberShopDto: CreateBarberShopDto) {
    return 'This action adds a new barberShop';
  }

  findAll() {
    return `This action returns all barberShop`;
  }

  findOne(id: number) {
    return `This action returns a #${id} barberShop`;
  }

  update(id: number, updateBarberShopDto: UpdateBarberShopDto) {
    return `This action updates a #${id} barberShop`;
  }

  remove(id: number) {
    return `This action removes a #${id} barberShop`;
  }
}
