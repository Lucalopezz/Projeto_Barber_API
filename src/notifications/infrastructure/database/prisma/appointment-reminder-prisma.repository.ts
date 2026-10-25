import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import {
  AppointmentReminderCandidate,
  AppointmentReminderRepository,
} from '../../../application/ports/appointment-reminder.repository';
import {
  appointmentReminderEventKey,
  REMINDER_LEAD_TIME_MS,
} from '../../../application/services/appointment-reminder-policy';
import { NotificationType } from '../../../domain/entities/notification.props';

export class AppointmentReminderPrismaRepository implements AppointmentReminderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(
    now: Date,
    afterId: string | undefined,
    limit: number,
  ): Promise<AppointmentReminderCandidate[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        // Scan the whole due window, not a one-minute slice, so a stopped worker
        // can catch up on reminders that are still useful.
        status: 'scheduled',
        date: { gt: now, lte: new Date(now.getTime() + REMINDER_LEAD_TIME_MS) },
        ...(afterId && { id: { gt: afterId } }),
      },
      orderBy: { id: 'asc' },
      // Keyset paging keeps progress stable while bookings change concurrently.
      take: limit,
      select: {
        id: true,
        clientId: true,
        version: true,
        date: true,
        createdAt: true,
        service: { select: { name: true } },
        barberShop: { select: { name: true, timezone: true } },
      },
    });
    return rows.map((row) => ({
      appointmentId: row.id,
      clientId: row.clientId,
      version: row.version,
      startsAt: row.date,
      createdAt: row.createdAt,
      serviceName: row.service.name,
      barberShopName: row.barberShop.name,
      timezone: row.barberShop.timezone,
    }));
  }

  async recordReminders(
    candidates: AppointmentReminderCandidate[],
  ): Promise<void> {
    if (!candidates.length) return;
    // The key includes version and start time: concurrent scans may race, while a
    // later reschedule can still create a distinct reminder event.
    await this.prisma.notificationOutbox.createMany({
      skipDuplicates: true,
      data: candidates.map((candidate) => ({
        appointmentId: candidate.appointmentId,
        recipientIds: [candidate.clientId],
        appointmentVersion: candidate.version,
        eventKey: appointmentReminderEventKey(candidate),
        type: NotificationType.appointmentReminder,
        serviceName: candidate.serviceName,
        barberShopName: candidate.barberShopName,
        startsAt: candidate.startsAt,
        timezone: candidate.timezone,
      })),
    });
  }
}
