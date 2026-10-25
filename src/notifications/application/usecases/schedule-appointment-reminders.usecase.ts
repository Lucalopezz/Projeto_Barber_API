import { Clock, systemClock } from '@/shared/application/providers/clock';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
import { AppointmentReminderRepository } from '../ports/appointment-reminder.repository';
import { isAppointmentReminderDue } from '../services/appointment-reminder-policy';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ScheduleAppointmentRemindersUseCase {
  export type Input = void;
  export type Output = void;

  export class UseCase implements UseCaseContract<Input, Output> {
    constructor(
      private readonly repository: AppointmentReminderRepository,
      private readonly clock: Clock = systemClock,
    ) {}

    async execute(): Promise<Output> {
      // A single scan uses one time boundary so later pages do not shift during catch-up.
      const now = this.clock.now();
      let afterId: string | undefined;
      for (;;) {
        const candidates = await this.repository.findCandidates(
          now,
          afterId,
          100,
        );
        if (!candidates.length) return;
        // The repository bounds dates for efficiency; this policy also excludes bookings
        // created less than 24 hours before their current start time.
        const due = candidates.filter((candidate) =>
          isAppointmentReminderDue(
            candidate.startsAt,
            candidate.createdAt,
            now,
          ),
        );
        if (due.length) await this.repository.recordReminders(due);
        // Advance over the source page, including reservations too recent for a reminder.
        afterId = candidates[candidates.length - 1].appointmentId;
      }
    }
  }
}
