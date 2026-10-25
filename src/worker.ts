import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { NotificationWorkerModule } from './notifications/infrastructure/notification-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(
    NotificationWorkerModule,
  );
  app.enableShutdownHooks();
  Logger.log('Worker de notificações iniciado', 'NotificationWorker');
}

bootstrap().catch(() => {
  Logger.error(
    'Falha ao iniciar o worker de notificações. Verifique PostgreSQL e Redis.',
    undefined,
    'NotificationWorker',
  );
  process.exitCode = 1;
});
