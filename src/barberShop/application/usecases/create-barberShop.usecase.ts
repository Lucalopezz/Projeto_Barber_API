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

export namespace CreateBarberShopUseCase {
  export type Input = {
    name: string;
    address: string;
  };
  export type Output = BarberShopOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}

    async execute(input: Input): Promise<BarberShopOutput> {
      const { address, name } = input;

      if (!address || !name) {
        throw new BadRequestError('Input data not provided');
      }
      const addressVo = new Address(address);
      const entity = new BarberShopEntity(
        Object.assign(input, { address: addressVo }),
      );

      await this.barberShopRepository.insert(entity);

      return BarberShopOutputMapper.toOutput(entity);
    }
  }
}
