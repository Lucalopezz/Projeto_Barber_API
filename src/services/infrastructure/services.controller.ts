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
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { CreateServicesUseCase } from '../application/usecases/create-services.usecase';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import {
  ServicePresenter,
  ServicesCollectionPresenter,
} from './presenters/barberShop.presenter';
import { GetServicesUseCase } from '../application/usecases/get-services.usecase';
import { UpdateServicesUseCase } from '../application/usecases/update-services.usecase';
import { DeleteServicesUseCase } from '../application/usecases/delete-services.usecase';
import { ListServicesByBarberShopUseCase } from '../application/usecases/list-services-by-barberShop.usecase';
import { RoleGuard } from '@/auth/guard/role.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '@/users/domain/entities/role.enum';
import { ListServicesDto } from './dto/list-services.dto';

@Controller('services')
export class ServicesController {
  @Inject(CreateServicesUseCase.UseCase)
  private createServicesUseCase: CreateServicesUseCase.UseCase;
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

  static servicesToResponse(output: ListServicesByBarberShopUseCase.Output) {
    return new ServicesCollectionPresenter(output);
  }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
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
  async findAll(@Query() query: ListServicesDto) {
    const output = await this.listServicesByBarberShopUseCase.execute(query);
    return ServicesController.servicesToResponse(output);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const model = await this.getServicesUseCase.execute({ id });
    return ServicesController.serviceToResponse(model);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  async remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    await this.deleteServicesUseCase.execute({
      id,
      barberShopOwnerId: userId,
    });
  }
}
