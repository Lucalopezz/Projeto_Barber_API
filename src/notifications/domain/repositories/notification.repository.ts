import {
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { NotificationEntity } from '../entities/notification.entity';

export interface NotificationRepository {
  listByUser(
    userId: string,
    params: SearchParams,
  ): Promise<SearchResult<NotificationEntity>>;
}
