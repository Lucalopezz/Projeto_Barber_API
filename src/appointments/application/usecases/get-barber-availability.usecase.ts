/* eslint-disable @typescript-eslint/no-namespace */

import {
  BarberAvailabilityOutput,
  BarberAvailabilityOutputMapper,
} from '../dto/barber-availability-output.dto';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

export namespace GetBarberAvailabilityUseCase {
  export type Input = {
    userId: string;
  };

  export type Output = BarberAvailabilityOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private userRepository: UserRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
      private availabilityRepository: BarberAvailabilityRepository.Repository,
    ) {}

    async execute({ userId }: Input): Promise<Output> {
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

      const [barberShop, schedules, timeOffs] = await Promise.all([
        this.barberShopRepository.findById(user.barberShopId),
        this.availabilityRepository.findSchedules(user.id),
        this.availabilityRepository.findTimeOffs(user.id),
      ]);
      if (!barberShop) {
        throw new NotFoundError('BarberShop not found');
      }

      return {
        barberId: user.id,
        timezone: barberShop.timezone,
        schedules: schedules.map(
          BarberAvailabilityOutputMapper.scheduleToOutput,
        ),
        timeOffs: timeOffs.map(BarberAvailabilityOutputMapper.timeOffToOutput),
      };
    }
  }
}
