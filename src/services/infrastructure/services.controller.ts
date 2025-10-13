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
  UseGuards,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateServicesUseCase } from '../application/usecases/create-services.usecase';
import { AuthGuard } from '@/auth/auth.guard';

@Controller('services')
@UseGuards(AuthGuard)
export class ServicesController {
  @Inject(CreateServicesUseCase.UseCase)
  private createServicesUseCase: CreateServicesUseCase.UseCase;

  @Post()
  create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUserBarberShopId currentUserBarberShopId: string,
  ) {
    const model = await this.createServicesUseCase.execute({
      barberShopId: currentUserBarberShopId,
      ...createServiceDto,
    });
    return model;
  }

  @Get()
  findAll() {
    //return this.servicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    //return this.servicesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    //return this.servicesService.update(+id, updateServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    //return this.servicesService.remove(+id);
  }
}
