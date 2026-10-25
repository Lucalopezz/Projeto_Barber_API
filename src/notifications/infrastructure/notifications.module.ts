import { Module } from '@nestjs/common';
import { AuthModule } from '@/auth/auth.module';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { NotificationRepository } from '../domain/repositories/notification.repository';
import { ListNotificationsUseCase } from '../application/usecases/list-notifications.usecase';
import { NotificationPrismaRepository } from './database/prisma/notification-prisma.repository';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: 'NotificationRepository',
      useFactory: (prisma: PrismaService) =>
        new NotificationPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ListNotificationsUseCase.UseCase,
      useFactory: (repository: NotificationRepository) =>
        new ListNotificationsUseCase.UseCase(repository),
      inject: ['NotificationRepository'],
    },
  ],
})
export class NotificationsModule {}
