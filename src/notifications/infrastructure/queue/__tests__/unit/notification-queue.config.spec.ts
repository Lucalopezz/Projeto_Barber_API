import { ConfigService } from '@nestjs/config';
import { notificationQueueConfig } from '../../notification-queue.config';

describe('Configuração isolada da fila de notificações', () => {
  it('usa banco e prefixo exclusivos nos testes sem exigir alterar env existente', () => {
    expect(
      notificationQueueConfig(new ConfigService({ NODE_ENV: 'test' })),
    ).toEqual(
      expect.objectContaining({
        prefix: 'barber-test-notifications',
        connection: expect.objectContaining({
          db: 1,
          host: '127.0.0.1',
          port: 6380,
        }),
      }),
    );
  });

  it.each([
    { REDIS_DB: '0' },
    { REDIS_DB: '16' },
    { REDIS_DB: 'invalid' },
    { REDIS_PORT: '0' },
    { REDIS_PORT: '65536' },
    { REDIS_PORT: 'invalid' },
    { NOTIFICATIONS_QUEUE_PREFIX: 'barber-notifications' },
    { NOTIFICATIONS_QUEUE_PREFIX: 'barber-test:invalid' },
  ])('recusa configuração inválida ou compartilhada: %p', (config) => {
    expect(() =>
      notificationQueueConfig(
        new ConfigService({ NODE_ENV: 'test', ...config }),
      ),
    ).toThrow();
  });
});
