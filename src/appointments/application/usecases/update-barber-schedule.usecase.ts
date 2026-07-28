/* eslint-disable @typescript-eslint/no-namespace */

import {
  BarberAvailabilityOutputMapper,
  BarberScheduleOutput,
} from '../dto/barber-availability-output.dto';
import { BarberScheduleEntity } from '@/appointments/domain/entities/barber-schedule.entity';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

export namespace UpdateBarberScheduleUseCase {
  export type ScheduleInput = {
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  };

  export type Input = {
    userId: string;
    schedules: ScheduleInput[];
  };

  export type Output = BarberScheduleOutput[];

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private userRepository: UserRepository.Repository,
      private availabilityRepository: BarberAvailabilityRepository.Repository,
    ) {}

    async execute({ userId, schedules }: Input): Promise<Output> {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      if (
        !user.barberShopId ||
        ![Role.owner, Role.barber].includes(user.role)
      ) {
        throw new UnauthorizedError(
          'The professional is not linked to a barber shop',
        );
      }

      const entities = schedules.map(
        (schedule) =>
          new BarberScheduleEntity({
            barberId: user.id,
            ...schedule,
          }),
      );
      this.ensureSchedulesDoNotOverlap(entities);

      await this.availabilityRepository.replaceSchedules(user.id, entities);
      return entities.map(BarberAvailabilityOutputMapper.scheduleToOutput);
    }

    private ensureSchedulesDoNotOverlap(
      schedules: BarberScheduleEntity[],
    ): void {
      // Sort the schedules by dayOfWeek and startMinute to check for overlaps
      const ordered = [...schedules].sort(
        (first, second) =>
          first.dayOfWeek - second.dayOfWeek ||
          first.startMinute - second.startMinute,
      );

      //' Check for overlaps in the ordered schedules
      for (let index = 1; index < ordered.length; index += 1) {
        const previous = ordered[index - 1];
        const current = ordered[index];
        if (
          previous.dayOfWeek === current.dayOfWeek &&
          current.startMinute < previous.endMinute
        ) {
          throw new BadRequestError('Schedule windows must not overlap');
        }
      }
    }
  }
}
