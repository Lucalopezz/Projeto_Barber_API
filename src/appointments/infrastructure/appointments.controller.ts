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
import { DeleteAppointmentUseCase } from '../application/usecases/delete-appointment.usecase';
import { GetAppointmentUseCase } from '../application/usecases/get-appointment.usecase';

@Controller('appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  @Inject(CreateAppointmentsUseCase.UseCase)
  private createAppointmentsUseCase: CreateAppointmentsUseCase.UseCase;
  @Inject(UpdateStatusUseCase.UseCase)
  private updateStatusUseCase: UpdateStatusUseCase.UseCase;
  @Inject(UpdateAppointmentUseCase.UseCase)
  private updateAppointmentUseCase: UpdateAppointmentUseCase.UseCase;
  @Inject(DeleteAppointmentUseCase.UseCase)
  private deleteAppointmentUseCase: DeleteAppointmentUseCase.UseCase;
  @Inject(GetAppointmentUseCase.UseCase)
  private getAppointmentUseCase: GetAppointmentUseCase.UseCase;

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
  async findOne(@Param('id') id: string, @CurrentUserId() userId: string) {
    const model = await this.getAppointmentUseCase.execute({
      id,
      userId,
    });
    return AppointmentsController.appointmentToResponse(model);
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
  async remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    await this.deleteAppointmentUseCase.execute({ id, userId });
  }
}
