/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Inject,
  Query,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateBarberShopDto } from './dto/create-barber-shop.dto';
import { UpdateBarberShopDto } from './dto/update-barber-shop.dto';
import { CreateBarberShopUseCase } from '../application/usecases/create-barberShop.usecase';
import { ListBarberShopUseCase } from '../application/usecases/list-barberShop.usecase';
import { BarberShopOutput } from '../application/dtos/barberShop-output.dto';
import { ListBarberShopDto } from './dto/list-barberShop.dto';
import {
  BarberShopCollectionPresenter,
  BarberShopPresenter,
} from './presenters/barberShop.presenter';
import { GetBarberShopUseCase } from '../application/usecases/get-barberShop.usecase';
import { UpdateBarberShopUseCase } from '../application/usecases/update-barberShop.usecase';
import { DeleteBarberShopUseCase } from '../application/usecases/delete-barberShop.usecase';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { RoleGuard } from '@/auth/guard/role.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '@/users/domain/entities/role.enum';
import { GetPublicAvailabilityUseCase } from '@/barberShop/application/usecases/get-public-availability.usecase';
import { GetPublicAvailabilityDto } from '@/appointments/infrastructure/dto/get-public-availability.dto';
import { PublicAvailabilityPresenter } from '@/barberShop/infrastructure/presenters/public-availability.presenter';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
  ApiProtected,
} from '@/shared/infrastructure/openapi/openapi.decorators';

@Controller('barber-shops')
@ApiTags('Barbearias')
export class BarberShopController {
  @Inject(ListBarberShopUseCase.UseCase)
  private listBarberShopUseCase: ListBarberShopUseCase.UseCase;

  @Inject(GetBarberShopUseCase.UseCase)
  private getBarberShopUseCase: GetBarberShopUseCase.UseCase;

  @Inject(CreateBarberShopUseCase.UseCase)
  private createBarberShopUseCase: CreateBarberShopUseCase.UseCase;

  @Inject(UpdateBarberShopUseCase.UseCase)
  private updateBarberShopUseCase: UpdateBarberShopUseCase.UseCase;

  @Inject(DeleteBarberShopUseCase.UseCase)
  private deleteBarberShopUseCase: DeleteBarberShopUseCase.UseCase;

  @Inject(GetPublicAvailabilityUseCase.UseCase)
  private getPublicAvailabilityUseCase: GetPublicAvailabilityUseCase.UseCase;

  static barberShopToResponse(output: BarberShopOutput) {
    return new BarberShopPresenter(output);
  }

  static listBarberShopToResponse(output: ListBarberShopUseCase.Output) {
    return new BarberShopCollectionPresenter(output);
  }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.barber])
  @ApiOperation({ summary: 'Criar a barbearia do usuário autenticado' })
  @ApiDataResponse(BarberShopPresenter, 201, 'Barbearia criada')
  @ApiProtected(403, 409, 422)
  async create(
    @Body() createBarberShopDto: CreateBarberShopDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.createBarberShopUseCase.execute({
      ownerId: userId,
      ...createBarberShopDto,
    });
    return BarberShopController.barberShopToResponse(model);
  }

  @Get()
  @ApiOperation({ summary: 'Listar barbearias da vitrine' })
  @ApiPaginatedResponse(BarberShopPresenter)
  @ApiErrorResponses(422)
  async search(@Query() searchParams: ListBarberShopDto) {
    const output = await this.listBarberShopUseCase.execute(searchParams);
    return BarberShopController.listBarberShopToResponse(output);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar uma barbearia' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da barbearia' })
  @ApiDataResponse(BarberShopPresenter)
  @ApiErrorResponses(404)
  async findOne(@Param('id') id: string) {
    const output = await this.getBarberShopUseCase.execute({ id });
    return BarberShopController.barberShopToResponse(output);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Consultar horários disponíveis em uma data' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da barbearia' })
  @ApiDataResponse(PublicAvailabilityPresenter)
  @ApiErrorResponses(404, 422)
  async getAvailability(
    @Param('id') barberShopId: string,
    @Query() query: GetPublicAvailabilityDto,
  ) {
    const output = await this.getPublicAvailabilityUseCase.execute({
      barberShopId,
      ...query,
    });
    return new PublicAvailabilityPresenter(output);
  }

  @Put(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  @ApiOperation({ summary: 'Atualizar a própria barbearia' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da barbearia' })
  @ApiDataResponse(BarberShopPresenter)
  @ApiProtected(403, 404, 422)
  async update(
    @Param('id') id: string,
    @Body() updateBarberShopDto: UpdateBarberShopDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.updateBarberShopUseCase.execute({
      id,
      ownerId: userId,
      ...updateBarberShopDto,
    });
    return BarberShopController.barberShopToResponse(model);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  @ApiOperation({ summary: 'Excluir a própria barbearia' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da barbearia' })
  @ApiResponse({ status: 204, description: 'Barbearia excluída' })
  @ApiProtected(403, 404)
  async remove(@Param('id') id: string, @CurrentUserId() ownerId: string) {
    await this.deleteBarberShopUseCase.execute({ id, ownerId });
  }
}
