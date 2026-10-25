import {
  BookingTransactionContext,
  ProfessionalBookingTransaction,
} from '@/appointments/application/ports/professional-booking-transaction';
import { AppointmentAvailabilityService } from '@/appointments/application/services/appointment-availability.service';
import { AppointmentBookingPolicy } from '@/appointments/application/services/appointment-booking-policy';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { AppointmentsPrismaRepository } from './repositories/appointments-prisma.repository';
import { BarberAvailabilityPrismaRepository } from './repositories/barber-availability-prisma.repository';
import { NotificationOutboxPrismaWriter } from '@/notifications/infrastructure/database/prisma/notification-outbox-prisma.repository';

export class ProfessionalBookingPrismaTransaction implements ProfessionalBookingTransaction {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: AppointmentBookingPolicy,
  ) {}

  run<T>(
    barberId: string,
    work: (context: BookingTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${barberId} FOR UPDATE`;
      const appointments = new AppointmentsPrismaRepository(tx);
      const availability = new AppointmentAvailabilityService(
        appointments,
        new BarberAvailabilityPrismaRepository(tx),
        this.policy,
      );
      return work({
        appointments,
        availability,
        notificationOutbox: new NotificationOutboxPrismaWriter(tx),
      });
    });
  }
}
