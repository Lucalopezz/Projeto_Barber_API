import {
  PaginationOutput,
  PaginationOutputMapper,
} from '@/shared/application/dtos/pagination-output';
import {
  AppointmentOutput,
  AppointmentOutputMapper,
} from '../dto/appointments-output.dto';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { AppointmentsRepository } from '@/appointments/domain/repositories/appointments.repository';
import { BarberShopRepository } from '@/barberShop/domain/repositories/barbershop.repository';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ListAppointmentsUseCase {
  export type Input = {
    page?: number;
    perPage?: number;
    sort?: string;
    sortDir?: 'asc' | 'desc';
    //Separed filter in 2 camps for a batter search
    serviceID?: string;
    date?: Date;
    userId: string;
  };

  export type Output = PaginationOutput<AppointmentOutput>;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private appointmentRepository: AppointmentsRepository.Repository,
      private barberShopRepository: BarberShopRepository.Repository,
    ) {}
    async execute(input: Input): Promise<Output> {
      const filter: AppointmentsRepository.Filter = {};

      const barberShop = await this.barberShopRepository.findByOwnerId(
        input.userId,
      );
      if (barberShop) {
        filter.barberShopId = barberShop.id;
      } else {
        filter.customerId = input.userId;
      }
      if (input.serviceID) {
        filter.serviceId = input.serviceID;
      }
      if (input.date) {
        filter.date = input.date;
      }

      const params = new AppointmentsRepository.AppointmentsSearchParams({
        page: input.page,
        perPage: input.perPage,
        sort: input.sort,
        sortDir: input.sortDir,
        filter,
      });

      const searchResult = await this.appointmentRepository.search(params);
      return this.toOutput(searchResult);
    }
    private toOutput(
      searchResult: AppointmentsRepository.AppointmentsSearchResult,
    ): Output {
      const items = searchResult.items.map((appoint) => {
        return AppointmentOutputMapper.toOutput(appoint);
      });
      return PaginationOutputMapper.toOutput<AppointmentOutput>(
        items,
        searchResult,
      );
    }
  }
}
