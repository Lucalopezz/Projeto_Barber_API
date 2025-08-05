import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateBarberShopDto } from './dto/create-barber-shop.dto';
import { UpdateBarberShopDto } from './dto/update-barber-shop.dto';
import { BarberShopService } from './barber-shop.service';

@Controller('barber-shop')
export class BarberShopController {
  constructor(private readonly barberShopService: BarberShopService) {}

  @Post()
  create(@Body() createBarberShopDto: CreateBarberShopDto) {
    return this.barberShopService.create(createBarberShopDto);
  }

  @Get()
  findAll() {
    return this.barberShopService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.barberShopService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBarberShopDto: UpdateBarberShopDto,
  ) {
    return this.barberShopService.update(+id, updateBarberShopDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.barberShopService.remove(+id);
  }
}
