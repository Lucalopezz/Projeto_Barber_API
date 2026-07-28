/* eslint-disable @typescript-eslint/no-namespace */

import { BarberAvailabilityRepository } from '@/appointments/domain/repositories/barber-availability.repository';
import { UnauthorizedError } from '@/shared/application/errors/unauthorized-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

export namespace DeleteBarberTimeOffUseCase {
  export type Input = {
    id: string;
    userId: string;
  };

  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private userRepository: UserRepository.Repository,
      private availabilityRepository: BarberAvailabilityRepository.Repository,
    ) {}

    async execute({ id, userId }: Input): Promise<void> {
      const [user, timeOff] = await Promise.all([
        this.userRepository.findById(userId),
        this.availabilityRepository.findTimeOffById(id),
      ]);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      if (!timeOff) {
        throw new NotFoundError('Time off not found');
      }
      if (
        !user.barberShopId ||
        ![Role.owner, Role.barber].includes(user.role) ||
        timeOff.barberId !== user.id
      ) {
        throw new UnauthorizedError(
          'You are not authorized to delete this time off',
        );
      }

      await this.availabilityRepository.deleteTimeOff(id);
    }
  }
}
