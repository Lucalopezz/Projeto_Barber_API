import { UseCaseContract } from '@/shared/application/usecases/use-case';
import {
  ServicesOutput,
  ServicesOutputMapper,
} from '../dtos/services-output.dto';
import { ServicesRepository } from '@/services/domain/repositories/services.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace GetServicesUseCase {
  export type Input = {
    id: string;
  };
  export type Output = ServicesOutput;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(private servicesRepository: ServicesRepository.Repository) {}

    async execute(input: Input): Promise<ServicesOutput> {
      const entity = await this.servicesRepository.findById(input.id);
      return ServicesOutputMapper.toOutput(entity);
    }
  }
}
