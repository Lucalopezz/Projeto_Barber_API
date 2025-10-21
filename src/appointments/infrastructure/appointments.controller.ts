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
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CreateAppointmentsUseCase } from '../application/usecases/create-appointment.usecase';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { AppointmentOutput } from '../application/dto/appointments-output.dto';
import { AppointmentPresenter } from './presenters/appointment.presenter';
import { AuthGuard } from '@/auth/auth.guard';

@Controller('appointments')
@UseGuards(AuthGuard)
export class AppointmentsController {
  @Inject(CreateAppointmentsUseCase.UseCase)
  private createAppointmentsUseCase: CreateAppointmentsUseCase.UseCase;

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
  update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ) {
    //return this.appointmentsService.update(+id, updateAppointmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    //return this.appointmentsService.remove(+id);
  }
}
