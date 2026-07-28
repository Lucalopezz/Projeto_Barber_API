/* eslint-disable @typescript-eslint/no-namespace */

import {
  BarberAvailabilityOutputMapper,
  BarberTimeOffOutput,
} from '../dto/barber-availability-output.dto';
import { BarberTimeOffEntity } from '@/appointments/domain/entities/barber-time-off.entity';
import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

export namespace CreateBarberTimeOffUseCase {
  export type Input = {
    userId: string;
    startsAt: Date;
    endsAt: Date;
    reason?: string;
  };

  export type Output = BarberTimeOffOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private userRepository: UserRepository.Repository,
      private availabilityRepository: BarberAvailabilityRepository.Repository,
    ) {}

    async execute({
      userId,
      startsAt,
      endsAt,
      reason,
    }: Input): Promise<Output> {
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

      const timeOff = new BarberTimeOffEntity({
        barberId: user.id,
        startsAt,
        endsAt,
        reason,
      });
      await this.availabilityRepository.insertTimeOff(timeOff);
      return BarberAvailabilityOutputMapper.timeOffToOutput(timeOff);
    }
  }
}
