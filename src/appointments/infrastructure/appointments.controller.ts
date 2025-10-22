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
  Put,
} from '@nestjs/common';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CreateAppointmentsUseCase } from '../application/usecases/create-appointment.usecase';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { AppointmentOutput } from '../application/dto/appointments-output.dto';
import { AppointmentPresenter } from './presenters/appointment.presenter';
import { AuthGuard } from '@/auth/auth.guard';
import { UpdateStatusUseCase } from '../application/usecases/update-status.usecase';
import { UpdateAppointmentUseCase } from '../application/usecases/update-appointment.usecase';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  @Inject(CreateAppointmentsUseCase.UseCase)
  private createAppointmentsUseCase: CreateAppointmentsUseCase.UseCase;
  @Inject(UpdateStatusUseCase.UseCase)
  private updateStatusUseCase: UpdateStatusUseCase.UseCase;
  @Inject(UpdateAppointmentUseCase.UseCase)
  private updateAppointmentUseCase: UpdateAppointmentUseCase.UseCase;

  static appointmentToResponse(output: AppointmentOutput) {
    return new AppointmentPresenter(output);
  }

  @Post()
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
  findAll() {
    //return this.appointmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    //return this.appointmentsService.findOne(+id);
  }

  @Patch(':id')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateStatusDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.updateStatusUseCase.execute({
      id,
      ...updateAppointmentDto,
      barberId: userId,
    });
    return AppointmentsController.appointmentToResponse(model);
  }
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
    @CurrentUserId() userId: string,
  ) {
    const model = await this.updateAppointmentUseCase.execute({
      id,
      ...updateAppointmentDto,
      barberId: userId,
    });
    return AppointmentsController.appointmentToResponse(model);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    //return this.appointmentsService.remove(+id);
  }
}
