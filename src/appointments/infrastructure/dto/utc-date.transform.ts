import { Transform } from 'class-transformer';

const ISO_DATE_WITH_TIMEZONE = /(Z|[+-]\d{2}:\d{2})$/i;

export function ToUtcDate() {
  return Transform(({ value }) => {
    if (
      typeof value !== 'string' ||
      !ISO_DATE_WITH_TIMEZONE.test(value.trim())
    ) {
      return new Date(Number.NaN);
    }
    return new Date(value);
  });
}
