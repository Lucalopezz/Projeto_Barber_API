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
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { ServicePresenter } from './presenters/barberShop.presenter';

@Controller('services')
@UseGuards(AuthGuard)
export class ServicesController {
  @Inject(CreateServicesUseCase.UseCase)
  private createServicesUseCase: CreateServicesUseCase.UseCase;

  static serviceToResponse(output: CreateServicesUseCase.Output) {
    return new ServicePresenter(output);
  }

  @Post()
  async create(
    @Body() createServiceDto: CreateServiceDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.createServicesUseCase.execute({
      barberShopOwnerId: userId,
      ...createServiceDto,
    });
    return ServicesController.serviceToResponse(model);
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
