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
import { NotFoundError } from '@/shared/domain/errors/not-found-error';
import { EntityValidationError } from '@/shared/domain/errors/validation-error';
import { Role } from '@/users/domain/entities/role.enum';

export namespace CreateBarberShopUseCase {
  export type Input = {
    name: string;
    address: string;
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
      const owner = await this.userRepo.findById(ownerId);
      if (!owner) throw new NotFoundError('Owner user not found');

      if (owner.role !== Role.barber) {
        throw new BadRequestError(
          'Only users with role barber can create a BarberShop',
        );
      }

      let addressVo: Address;
      try {
        addressVo = new Address(address);
      } catch (err: any) {
        throw new EntityValidationError({ address: [err.message] });
      }
      const entity = new BarberShopEntity({
        name,
        address: addressVo,
        ownerId,
      });

      await this.barberShopRepository.insert(entity);

      return BarberShopOutputMapper.toOutput(entity);
    }
  }
}
