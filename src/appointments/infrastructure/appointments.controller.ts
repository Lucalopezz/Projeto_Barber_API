import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Inject,
  UseGuards,
  Put,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CreateAppointmentsUseCase } from '../application/usecases/create-appointment.usecase';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { AppointmentOutput } from '../application/dto/appointments-output.dto';
import {
  AppointmentCollectionPresenter,
  AppointmentPresenter,
} from './presenters/appointment.presenter';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { UpdateStatusUseCase } from '../application/usecases/update-status.usecase';
import { UpdateAppointmentUseCase } from '../application/usecases/update-appointment.usecase';
import { UpdateStatusDto } from './dto/update-status.dto';
import { GetAppointmentUseCase } from '../application/usecases/get-appointment.usecase';
import { ListAppointmentsUseCase } from '../application/usecases/list-appointments.usecase';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { RoleGuard } from '@/auth/guard/role.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { Role } from '@/users/domain/entities/role.enum';
import { GetBarberAvailabilityUseCase } from '../application/usecases/get-barber-availability.usecase';
import { UpdateBarberScheduleUseCase } from '../application/usecases/update-barber-schedule.usecase';
import { CreateBarberTimeOffUseCase } from '../application/usecases/create-barber-time-off.usecase';
import { DeleteBarberTimeOffUseCase } from '../application/usecases/delete-barber-time-off.usecase';
import { UpdateBarberScheduleDto } from './dto/update-barber-schedule.dto';
import { CreateBarberTimeOffDto } from './dto/create-barber-time-off.dto';
import {
  BarberAvailabilityPresenter,
  BarberSchedulePresenter,
  BarberTimeOffPresenter,
} from './presenters/barber-availability.presenter';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiDataArrayResponse,
  ApiDataResponse,
  ApiPaginatedResponse,
  ApiProtected,
} from '@/shared/infrastructure/openapi/openapi.decorators';

@Controller('appointments')
@UseGuards(AuthGuard)
@ApiTags('Agendamentos e disponibilidade')
export class AppointmentsController {
  @Inject(CreateAppointmentsUseCase.UseCase)
  private createAppointmentsUseCase: CreateAppointmentsUseCase.UseCase;
  @Inject(UpdateStatusUseCase.UseCase)
  private updateStatusUseCase: UpdateStatusUseCase.UseCase;
  @Inject(UpdateAppointmentUseCase.UseCase)
  private updateAppointmentUseCase: UpdateAppointmentUseCase.UseCase;
  @Inject(GetAppointmentUseCase.UseCase)
  private getAppointmentUseCase: GetAppointmentUseCase.UseCase;
  @Inject(ListAppointmentsUseCase.UseCase)
  private listAppointmentsUseCase: ListAppointmentsUseCase.UseCase;
  @Inject(GetBarberAvailabilityUseCase.UseCase)
  private getBarberAvailabilityUseCase: GetBarberAvailabilityUseCase.UseCase;
  @Inject(UpdateBarberScheduleUseCase.UseCase)
  private updateBarberScheduleUseCase: UpdateBarberScheduleUseCase.UseCase;
  @Inject(CreateBarberTimeOffUseCase.UseCase)
  private createBarberTimeOffUseCase: CreateBarberTimeOffUseCase.UseCase;
  @Inject(DeleteBarberTimeOffUseCase.UseCase)
  private deleteBarberTimeOffUseCase: DeleteBarberTimeOffUseCase.UseCase;

  static appointmentToResponse(output: AppointmentOutput) {
    return new AppointmentPresenter(output);
  }
  static listAppointmentsToResponse(output: ListAppointmentsUseCase.Output) {
    return new AppointmentCollectionPresenter(output);
  }

  @Post()
  @ApiOperation({ summary: 'Criar um agendamento' })
  @ApiDataResponse(AppointmentPresenter, 201, 'Agendamento criado')
  @ApiProtected(403, 404, 409, 422)
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.createAppointmentsUseCase.execute({
      ...createAppointmentDto,
      clientId: userId,
    });
    return AppointmentsController.appointmentToResponse(model);
  }

  @Get()
  @ApiOperation({ summary: 'Listar agendamentos visíveis para o usuário' })
  @ApiPaginatedResponse(AppointmentPresenter)
  @ApiProtected(422)
  async search(
    @Query() searchParams: ListAppointmentsDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.listAppointmentsUseCase.execute({
      ...searchParams,
      userId,
    });
    return AppointmentsController.listAppointmentsToResponse(output);
  }

  @Get('availability/me')
  @UseGuards(RoleGuard)
  @Roles([Role.owner, Role.barber])
  @ApiOperation({ summary: 'Consultar a própria disponibilidade' })
  @ApiDataResponse(BarberAvailabilityPresenter)
  @ApiProtected(403, 404)
  async getAvailability(@CurrentUserId() userId: string) {
    const output = await this.getBarberAvailabilityUseCase.execute({ userId });
    return new BarberAvailabilityPresenter(output);
  }

  @Put('availability/me/schedule')
  @UseGuards(RoleGuard)
  @Roles([Role.owner, Role.barber])
  @ApiOperation({ summary: 'Substituir o próprio expediente semanal' })
  @ApiDataArrayResponse(BarberSchedulePresenter)
  @ApiProtected(403, 404, 422)
  async updateSchedule(
    @Body() dto: UpdateBarberScheduleDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.updateBarberScheduleUseCase.execute({
      userId,
      schedules: dto.schedules,
    });
    return output.map((schedule) => new BarberSchedulePresenter(schedule));
  }

  @Post('availability/me/time-offs')
  @UseGuards(RoleGuard)
  @Roles([Role.owner, Role.barber])
  @ApiOperation({ summary: 'Cadastrar uma folga própria' })
  @ApiDataResponse(BarberTimeOffPresenter, 201, 'Folga cadastrada')
  @ApiProtected(403, 404, 409, 422)
  async createTimeOff(
    @Body() dto: CreateBarberTimeOffDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.createBarberTimeOffUseCase.execute({
      userId,
      ...dto,
    });
    return new BarberTimeOffPresenter(output);
  }

  @Delete('availability/me/time-offs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RoleGuard)
  @Roles([Role.owner, Role.barber])
  @ApiOperation({ summary: 'Remover uma folga própria' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID da folga' })
  @ApiResponse({ status: 204, description: 'Folga removida' })
  @ApiProtected(403, 404)
  async deleteTimeOff(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    await this.deleteBarberTimeOffUseCase.execute({ id, userId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar um agendamento visível' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do agendamento' })
  @ApiDataResponse(AppointmentPresenter)
  @ApiProtected(404)
  async findOne(@Param('id') id: string, @CurrentUserId() userId: string) {
    const model = await this.getAppointmentUseCase.execute({
      id,
      userId,
    });
    return AppointmentsController.appointmentToResponse(model);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cancelar ou concluir um agendamento' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do agendamento' })
  @ApiDataResponse(AppointmentPresenter)
  @ApiProtected(403, 404, 409, 422)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateStatusDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.updateStatusUseCase.execute({
      id,
      ...updateAppointmentDto,
      userId,
    });
    return AppointmentsController.appointmentToResponse(model);
  }
  @Put(':id')
  @UseGuards(RoleGuard)
  @Roles([Role.owner, Role.barber])
  @ApiOperation({ summary: 'Alterar data ou serviço de um agendamento' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do agendamento' })
  @ApiDataResponse(AppointmentPresenter)
  @ApiProtected(403, 404, 409, 422)
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.updateAppointmentUseCase.execute({
      id,
      ...updateAppointmentDto,
      userId,
    });
    return AppointmentsController.appointmentToResponse(model);
  }
}
