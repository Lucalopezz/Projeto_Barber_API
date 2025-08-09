/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
} from '@nestjs/common';
import { CreateBarberShopDto } from './dto/create-barber-shop.dto';
import { UpdateBarberShopDto } from './dto/update-barber-shop.dto';
import { CreateBarberShopUseCase } from '../application/usecases/create-barberShop.usecase';

@Controller('barber-shop')
export class BarberShopController {
  @Inject(CreateBarberShopUseCase.UseCase)
  private createBarberShopUseCase: CreateBarberShopUseCase.UseCase;

  @Post()
  create(@Body() createBarberShopDto: CreateBarberShopDto) {
    return this.createBarberShopUseCase.execute(createBarberShopDto);
  }

  @Get()
  findAll() {}

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBarberShopDto: UpdateBarberShopDto,
  ) {}

  @Delete(':id')
  remove(@Param('id') id: string) {}
}
