/* eslint-disable @typescript-eslint/no-namespace */

import { Address } from '@/barberShop/domain/value-objects/address.vo';
import {
  BarberShopOutput,
  BarberShopOutputMapper,
} from '../dtos/barberShop-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { BarberShopEntity } from '@/barberShop/domain/entities/barber-shop.entity';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';
import { UserRepository } from '@/users/domain/repositories/user.repository';
import { Role } from '@/users/domain/entities/role.enum';

export namespace CreateBarberShopUseCase {
  export type Input = {
    name: string;
    address: Address;
    ownerId: string;
  };
  export type Output = BarberShopOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
      private userRepo: UserRepository.Repository,
    ) {}

    async execute(input: Input): Promise<BarberShopOutput> {
      const { address, name, ownerId } = input;

      if (!address || !name || !ownerId) {
        throw new BadRequestError('Input data not provided');
      }
      const [owner, alreadyHasBarberShop] = await Promise.all([
        this.userRepo.findById(ownerId),
        this.barberShopRepository.findByOwnerId(ownerId),
      ]);

      if (alreadyHasBarberShop) {
        throw new BadRequestError('BarberShop already exists for this user');
      }

      if (owner.role !== Role.barber) {
        throw new BadRequestError(
          'Only users with role barber can create a BarberShop',
        );
      }

      const entity = new BarberShopEntity({
        name,
        address,
        ownerId,
      });

      await this.barberShopRepository.insert(entity);

      return BarberShopOutputMapper.toOutput(entity);
    }
  }
}
