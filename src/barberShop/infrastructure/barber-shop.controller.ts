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
import { ListShopBarbersUseCase } from '../application/usecases/list-shop-barbers.usecase';
import { ListShopInvitationsUseCase } from '../application/usecases/list-shop-invitations.usecase';
import { ListMyShopInvitationsUseCase } from '../application/usecases/list-my-shop-invitations.usecase';
import { InviteShopBarberUseCase } from '../application/usecases/invite-shop-barber.usecase';
import { RevokeShopInvitationUseCase } from '../application/usecases/revoke-shop-invitation.usecase';
import { AcceptShopInvitationUseCase } from '../application/usecases/accept-shop-invitation.usecase';
import { DeclineShopInvitationUseCase } from '../application/usecases/decline-shop-invitation.usecase';
import { RemoveShopBarberUseCase } from '../application/usecases/remove-shop-barber.usecase';
import { InviteBarberDto } from './dto/invite-barber.dto';
import {
  JoinedBarberPresenter,
  ShopBarberPresenter,
  ShopInvitationPresenter,
} from './presenters/shop-staff.presenter';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiDataArrayResponse,
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

  @Inject(ListShopBarbersUseCase.UseCase)
  private listShopBarbersUseCase: ListShopBarbersUseCase.UseCase;

  @Inject(ListShopInvitationsUseCase.UseCase)
  private listShopInvitationsUseCase: ListShopInvitationsUseCase.UseCase;

  @Inject(ListMyShopInvitationsUseCase.UseCase)
  private listMyShopInvitationsUseCase: ListMyShopInvitationsUseCase.UseCase;

  @Inject(InviteShopBarberUseCase.UseCase)
  private inviteShopBarberUseCase: InviteShopBarberUseCase.UseCase;

  @Inject(RevokeShopInvitationUseCase.UseCase)
  private revokeShopInvitationUseCase: RevokeShopInvitationUseCase.UseCase;

  @Inject(AcceptShopInvitationUseCase.UseCase)
  private acceptShopInvitationUseCase: AcceptShopInvitationUseCase.UseCase;

  @Inject(DeclineShopInvitationUseCase.UseCase)
  private declineShopInvitationUseCase: DeclineShopInvitationUseCase.UseCase;

  @Inject(RemoveShopBarberUseCase.UseCase)
  private removeShopBarberUseCase: RemoveShopBarberUseCase.UseCase;

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
  @ApiProtected(400, 403, 409, 422)
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

  @Get('invitations/me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Listar convites do barbeiro autenticado' })
  @ApiDataArrayResponse(ShopInvitationPresenter)
  @ApiProtected()
  async myInvitations(@CurrentUserId() userId: string) {
    const invitations = await this.listMyShopInvitationsUseCase.execute({
      barberId: userId,
    });
    return invitations.map(
      (invitation) => new ShopInvitationPresenter(invitation),
    );
  }

  @Post('invitations/:invitationId/accept')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Aceitar convite para trabalhar em uma barbearia' })
  @ApiDataResponse(JoinedBarberPresenter, 201, 'Convite aceito')
  @ApiProtected(404, 409)
  async acceptInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUserId() userId: string,
  ) {
    return new JoinedBarberPresenter(
      await this.acceptShopInvitationUseCase.execute({
        invitationId,
        barberId: userId,
      }),
    );
  }

  @Post('invitations/:invitationId/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Recusar convite para trabalhar em uma barbearia' })
  @ApiResponse({ status: 204, description: 'Convite recusado' })
  @ApiProtected(404)
  async declineInvitation(
    @Param('invitationId') invitationId: string,
    @CurrentUserId() userId: string,
  ) {
    await this.declineShopInvitationUseCase.execute({
      invitationId,
      barberId: userId,
    });
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

  @Get(':id/barbers')
  @ApiOperation({ summary: 'Listar profissionais da barbearia' })
  @ApiDataArrayResponse(ShopBarberPresenter)
  @ApiErrorResponses(404)
  async listBarbers(@Param('id') id: string) {
    const barbers = await this.listShopBarbersUseCase.execute({ shopId: id });
    return barbers.map((barber) => new ShopBarberPresenter(barber));
  }

  @Get(':id/invitations')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  @ApiOperation({ summary: 'Listar convites pendentes da própria barbearia' })
  @ApiDataArrayResponse(ShopInvitationPresenter)
  @ApiProtected(403, 404)
  async listInvitations(
    @Param('id') id: string,
    @CurrentUserId() ownerId: string,
  ) {
    const invitations = await this.listShopInvitationsUseCase.execute({
      shopId: id,
      ownerId,
    });
    return invitations.map(
      (invitation) => new ShopInvitationPresenter(invitation),
    );
  }

  @Post(':id/invitations')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  @ApiOperation({
    summary: 'Convidar uma conta de barbeiro existente por email',
  })
  @ApiDataResponse(ShopInvitationPresenter, 201, 'Convite criado')
  @ApiProtected(403, 404, 409, 422)
  async inviteBarber(
    @Param('id') id: string,
    @CurrentUserId() ownerId: string,
    @Body() dto: InviteBarberDto,
  ) {
    return new ShopInvitationPresenter(
      await this.inviteShopBarberUseCase.execute({
        shopId: id,
        ownerId,
        email: dto.email,
      }),
    );
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  @ApiOperation({ summary: 'Cancelar convite pendente' })
  @ApiResponse({ status: 204, description: 'Convite cancelado' })
  @ApiProtected(403, 404)
  async revokeInvitation(
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @CurrentUserId() ownerId: string,
  ) {
    await this.revokeShopInvitationUseCase.execute({
      shopId: id,
      ownerId,
      invitationId,
    });
  }

  @Delete(':id/barbers/:barberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.owner])
  @ApiOperation({ summary: 'Desvincular profissional sem reservas futuras' })
  @ApiResponse({ status: 204, description: 'Profissional desvinculado' })
  @ApiProtected(400, 403, 404, 409)
  async removeBarber(
    @Param('id') id: string,
    @Param('barberId') barberId: string,
    @CurrentUserId() ownerId: string,
  ) {
    await this.removeShopBarberUseCase.execute({
      shopId: id,
      ownerId,
      barberId,
    });
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Consultar horários disponíveis em uma data' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da barbearia' })
  @ApiDataResponse(PublicAvailabilityPresenter)
  @ApiErrorResponses(400, 404, 422)
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
  @ApiProtected(400, 403, 404, 422)
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
