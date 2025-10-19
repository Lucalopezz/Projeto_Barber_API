/* eslint-disable @typescript-eslint/no-namespace */

import {
  SearchableRepositoryInterface,
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { AppointmentEntity } from '../entities/appointment.entity';

export namespace AppointmentsRepository {
  export type Filter = {
    date?: Date;
    serviceId?: string;
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
    verifyAvailability(date: Date, serviceId: string): Promise<boolean>;
  }
}
