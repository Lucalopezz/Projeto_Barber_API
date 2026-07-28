/* eslint-disable @typescript-eslint/no-namespace */

import {
  SearchableRepositoryInterface,
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { AppointmentEntity } from '../entities/appointment.entity';

export namespace AppointmentsRepository {
  export type Filter = {
    dateTo?: Date;
    dateFrom?: Date;
    barberShopId?: string;
    serviceId?: string;
    barberShopOwnerId?: string;
    barberId?: string;
    customerId?: string;
  };

  export class AppointmentsSearchParams extends SearchParams<Filter> {}

  export class AppointmentsSearchResult extends SearchResult<
    AppointmentEntity,
    Filter
  > {}

  export interface Repository
    extends SearchableRepositoryInterface<
      AppointmentEntity,
      Filter,
      AppointmentsSearchParams,
      AppointmentsSearchResult
    > {
    findOverlappingScheduled(
      startsAt: Date,
      endsAt: Date,
      barberId: string,
      excludeAppointmentId?: string,
    ): Promise<AppointmentEntity | null>;
  }
}
