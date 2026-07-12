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
import { UpdateServicesUseCase } from '../application/usecases/update-services.usecase';
import { DeleteServicesUseCase } from '../application/usecases/delete-services.usecase';
import { ListServicesByBarberShopUseCase } from '../application/usecases/list-services-by-barberShop.usecase';

@Controller('services')
export class ServicesController {
  @Inject(CreateServicesUseCase.UseCase)
  private createServicesUseCase: CreateServicesUseCase.UseCase;
  @Inject(ListServicesUseCase.UseCase)
  private listServicesUseCase: ListServicesUseCase.UseCase;
  @Inject(GetServicesUseCase.UseCase)
  private getServicesUseCase: GetServicesUseCase.UseCase;
  @Inject(UpdateServicesUseCase.UseCase)
  private updateServicesUseCase: UpdateServicesUseCase.UseCase;
  @Inject(DeleteServicesUseCase.UseCase)
  private deleteServicesUseCase: DeleteServicesUseCase.UseCase;
  @Inject(ListServicesByBarberShopUseCase.UseCase)
  private listServicesByBarberShopUseCase: ListServicesByBarberShopUseCase.UseCase;

  static serviceToResponse(output: CreateServicesUseCase.Output) {
    return new ServicePresenter(output);
  }

  @Post()
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  async findAll(@CurrentUserId() userId: string) {
    const models = await this.listServicesUseCase.execute({ userId });
    return models.map((model) => ServicesController.serviceToResponse(model));
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    const model = await this.getServicesUseCase.execute({ id });
    return ServicesController.serviceToResponse(model);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.updateServicesUseCase.execute({
      id,
      barberShopOwnerId: userId,
      ...updateServiceDto,
    });
    return ServicesController.serviceToResponse(model);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    return this.deleteServicesUseCase.execute({
      id,
      barberShopOwnerId: userId,
    });
  }

  @Get('catalog/:barberShopId')
  async findAllByBarberShop(@Param('barberShopId') barberShopId: string) {
    const models = await this.listServicesByBarberShopUseCase.execute({
      barberShopId,
    });
    return models.map((model) => ServicesController.serviceToResponse(model));
  }
}
