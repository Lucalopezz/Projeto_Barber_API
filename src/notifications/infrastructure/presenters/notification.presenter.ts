import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CollectionPresenter } from '@/shared/infrastructure/presenters/collection.presenter';
import {
  ListNotificationsUseCase,
  NotificationOutput,
} from '../../application/usecases/list-notifications.usecase';
import { NotificationType } from '../../domain/entities/notification.props';

export class NotificationPresenter {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) appointmentId: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty({ example: 'Corte' }) serviceName: string;
  @ApiProperty({ example: 'Barbearia Escola' }) barberShopName: string;
  @ApiProperty({ type: String, format: 'date-time' })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  startsAt: Date;
  @ApiProperty({ example: 'America/Sao_Paulo' }) timezone: string;
  @ApiProperty({ type: String, format: 'date-time' })
  @Transform(({ value }: { value: Date }) => value.toISOString())
  createdAt: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Transform(
    ({ value }: { value: Date | null }) => value?.toISOString() ?? null,
  )
  readAt: Date | null;

  constructor(output: NotificationOutput) {
    Object.assign(this, output);
  }
}

export class NotificationCollectionPresenter extends CollectionPresenter {
  data: NotificationPresenter[];
  constructor(output: ListNotificationsUseCase.Output) {
    const { items, ...meta } = output;
    super(meta);
    this.data = items.map((item) => new NotificationPresenter(item));
  }
}
