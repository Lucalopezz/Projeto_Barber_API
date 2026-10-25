import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  SearchParams,
  SearchResult,
} from '@/shared/domain/repositories/searchable.repository';
import { NotificationRepository } from '../../../domain/repositories/notification.repository';
import { NotificationModelMapper } from './notification-model.mapper';

export class NotificationPrismaRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}
  countUnread(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  async markAsRead(userId: string, id: string, readAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      // Conditional update preserves the first read timestamp across concurrent retries.
      // Both operations are scoped to the recipient; absent and foreign IDs look identical.
      await tx.notification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt },
      });
      const row = await tx.notification.findFirst({ where: { id, userId } });
      return row ? NotificationModelMapper.toEntity(row) : null;
    });
  }

  async listByUser(userId: string, params: SearchParams) {
    const where = { userId };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
      }),
    ]);
    return new SearchResult({
      items: rows.map(NotificationModelMapper.toEntity),
      total,
      currentPage: params.page,
      perPage: params.perPage,
    });
  }
}
