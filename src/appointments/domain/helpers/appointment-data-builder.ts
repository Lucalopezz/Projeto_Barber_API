import { faker } from '@faker-js/faker';
import { AppointmentProps } from '../entities/appointment.entity';
import { AppointmentStatus } from '../entities/appointmentStatus.enum';

type Props = Partial<AppointmentProps>;

export function AppointmentDataBuilder(props: Props): AppointmentProps {
  const date = props.date ?? faker.date.future();
  return {
    date,
    endDate: props.endDate ?? new Date(date.getTime() + 30 * 60 * 1000),
    status: props.status ?? AppointmentStatus.scheduled,
    clientId: props.clientId ?? faker.string.uuid(),
    serviceId: props.serviceId ?? faker.string.uuid(),
    barberId: props.barberId ?? faker.string.uuid(),
    barberShopId: props.barberShopId ?? faker.string.uuid(),
    createdAt: props.createdAt ?? faker.date.past(),
  };
}
