import { Prisma } from '@prisma/client';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  AppointmentCreatedNotification,
  AppointmentUpdatedNotification,
  AppointmentCancelledNotification,
  NotificationOutboxRepository,
  NotificationOutboxWriter,
} from '../../../application/ports/notification-outbox.repository';
import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationType } from '../../../domain/entities/notification.props';
import { NotificationModelMapper } from './notification-model.mapper';
import { Clock, systemClock } from '@/shared/application/providers/clock';
import { isAppointmentReminderDue } from '../../../application/services/appointment-reminder-policy';

export class NotificationOutboxPrismaWriter implements NotificationOutboxWriter {
  constructor(private readonly client: Prisma.TransactionClient) {}
  recordCreated(event: AppointmentCreatedNotification): Promise<void> {
    return this.record(
      NotificationType.appointmentCreated,
      event,
      `appointment-created-${event.appointmentId}`,
    );
  }

  recordUpdated(event: AppointmentUpdatedNotification): Promise<void> {
    const { revision, ...snapshot } = event;
    return this.record(
      NotificationType.appointmentUpdated,
      snapshot,
      `appointment-updated-${event.appointmentId}-v${revision}`,
    );
  }

  recordCancelled(event: AppointmentCancelledNotification): Promise<void> {
    const { revision, ...snapshot } = event;
    return this.record(
      NotificationType.appointmentCancelled,
      snapshot,
      `appointment-cancelled-${event.appointmentId}-v${revision}`,
    );
  }

  private async record(
    type: NotificationType,
    event: AppointmentCreatedNotification & {
      previousStartsAt?: Date;
      previousServiceName?: string;
    },
    eventKey: string,
  ): Promise<void> {
    if (!event.recipientIds.length) return;
    // This adapter receives the booking's transaction, never a standalone connection.
    // The revision belongs to the successful optimistic update, making each change unique.
    await this.client.notificationOutbox.create({
      data: {
        ...event,
        recipientIds: [...new Set(event.recipientIds)],
        eventKey,
        type,
      },
    });
  }
}

export class NotificationOutboxPrismaRepository implements NotificationOutboxRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock = systemClock,
  ) {}

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
      let current: {
        clientId: string;
        version: number;
        date: Date;
        createdAt: Date;
        status: string;
      } | null;
      if (event.type === NotificationType.appointmentReminder) {
        // Lock the same appointment row changed by rescheduling/cancellation.
        // Validation and notification persistence cannot race a committed change.
        await tx.$queryRaw`SELECT "id" FROM "Appointment" WHERE "id" = ${event.appointmentId} FOR UPDATE`;
        current = await tx.appointment.findUnique({
          where: { id: event.appointmentId },
          select: {
            clientId: true,
            version: true,
            date: true,
            createdAt: true,
            status: true,
          },
        });
      }
      const now = this.clock.now();
      if (
        event.type === NotificationType.appointmentReminder &&
        (!current ||
          current.status !== 'scheduled' ||
          current.version !== event.appointmentVersion ||
          current.date.getTime() !== event.startsAt.getTime() ||
          event.recipientIds.length !== 1 ||
          event.recipientIds[0] !== current.clientId ||
          !isAppointmentReminderDue(current.date, current.createdAt, now))
      ) {
        // An obsolete reminder is processed without creating an inbox entry.
        // Keeping the marker prevents the outbox publisher from retrying it forever.
        await tx.notificationOutbox.update({
          where: { id: event.id },
          data: { processedAt: now },
        });
        return;
      }
      const {
        appointmentId,
        eventKey,
        serviceName,
        barberShopName,
        startsAt,
        timezone,
        previousStartsAt,
        previousServiceName,
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
            previousStartsAt,
            previousServiceName,
            type: event.type as NotificationType,
            createdAt: now,
          }),
        ),
      );
      // PostgreSQL uniqueness remains authoritative after jobs are retried or removed.
      // Both recipients and the delivery marker commit together, including on retries.
      await tx.notification.createMany({ data, skipDuplicates: true });
      await tx.notificationOutbox.update({
        where: { id: event.id },
        data: { processedAt: now },
      });
    });
  }
}
