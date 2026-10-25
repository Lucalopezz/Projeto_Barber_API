import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  AppointmentCreatedNotification,
  NotificationOutboxRepository,
} from '../../../application/ports/notification-outbox.repository';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/entities/notification.props';
import { NotificationModelMapper } from './notification-model.mapper';

export class NotificationOutboxPrismaWriter {
  constructor(private readonly client: Prisma.TransactionClient) {}
  async recordCreated(event: AppointmentCreatedNotification): Promise<void> {
    // This adapter receives the booking's transaction, never a standalone connection.
    await this.client.notificationOutbox.create({
      data: {
        ...event,
        eventKey: `appointment-created-${event.appointmentId}`,
        type: NotificationType.appointmentCreated,
      },
    });
  }
}

export class NotificationOutboxPrismaRepository implements NotificationOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  recordCreated(event: AppointmentCreatedNotification): Promise<void> {
    return new NotificationOutboxPrismaWriter(this.prisma).recordCreated(event);
  }

  async findPending(
    afterId: string | undefined,
    limit: number,
  ): Promise<string[]> {
    const rows = await this.prisma.notificationOutbox.findMany({
      where: { processedAt: null, ...(afterId && { id: { gt: afterId } }) },
      orderBy: { id: 'asc' },
      take: limit,
      select: { id: true },
    });
    return rows.map(({ id }) => id);
  }

  async deliver(eventId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const event = await tx.notificationOutbox.findUnique({
        where: { id: eventId },
      });
      if (!event || event.processedAt) return;
      const {
        appointmentId,
        eventKey,
        serviceName,
        barberShopName,
        startsAt,
        timezone,
      } = event;
      const data = [...new Set(event.recipientIds)].map((userId) =>
        NotificationModelMapper.toModel(
          new NotificationEntity({
            userId,
            appointmentId,
            eventKey,
            serviceName,
            barberShopName,
            startsAt,
            timezone,
            type: event.type as NotificationType,
          }),
        ),
      );
      // PostgreSQL uniqueness remains authoritative after jobs are retried or removed.
      // Both recipients and the delivery marker commit together, including on retries.
      await tx.notification.createMany({ data, skipDuplicates: true });
      await tx.notificationOutbox.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    });
  }
}
