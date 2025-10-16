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
import { ListServicesUseCase } from '../application/usecases/list-services.usecase';
import { GetServicesUseCase } from '../application/usecases/get-services.usecase';

@Controller('services')
@UseGuards(AuthGuard)
export class ServicesController {
  @Inject(CreateServicesUseCase.UseCase)
  private createServicesUseCase: CreateServicesUseCase.UseCase;
  @Inject(ListServicesUseCase.UseCase)
  private listServicesUseCase: ListServicesUseCase.UseCase;
  @Inject(GetServicesUseCase.UseCase)
  private getServicesUseCase: GetServicesUseCase.UseCase;

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
  async findAll(@CurrentUserId() userId: string) {
    const models = await this.listServicesUseCase.execute({ userId });
    return models.map((model) => ServicesController.serviceToResponse(model));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const model = await this.getServicesUseCase.execute({ id });
    return ServicesController.serviceToResponse(model);
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
