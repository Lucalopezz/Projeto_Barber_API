import { AppointmentReminderCandidate } from '../ports/appointment-reminder.repository';

export const REMINDER_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

export function isAppointmentReminderDue(
  startsAt: Date,
  createdAt: Date,
  now: Date,
): boolean {
  const startsAtMs = startsAt.getTime();
  const createdAtMs = createdAt.getTime();
  const nowMs = now.getTime();
  const dueAtMs = startsAtMs - REMINDER_LEAD_TIME_MS;
  // Include the exact 24-hour boundary, but never remind after the appointment starts.
  return (
    Number.isFinite(startsAtMs) &&
    Number.isFinite(createdAtMs) &&
    Number.isFinite(nowMs) &&
    createdAtMs <= dueAtMs &&
    dueAtMs <= nowMs &&
    nowMs < startsAtMs
  );
}

export function appointmentReminderEventKey(
  candidate: Pick<
    AppointmentReminderCandidate,
    'appointmentId' | 'clientId' | 'version' | 'startsAt'
  >,
): string {
  return `appointment-reminder-${candidate.appointmentId}-${candidate.clientId}-v${candidate.version}-${candidate.startsAt.getTime()}`;
}
