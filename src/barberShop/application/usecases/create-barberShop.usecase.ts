/* eslint-disable @typescript-eslint/no-namespace */

import { Address } from '@/barberShop/domain/value-objects/address.vo';
import { BarberShopOutput } from '../dtos/barberShop-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';

export namespace CreateBarberShopUseCase {
  export type Input = {
    name: string;
    address: Address;
  };
  export type Output = BarberShopOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute(input: Input): BarberShopOutput | Promise<BarberShopOutput> {
      throw new Error('Method not implemented.');
    }
  }
}
