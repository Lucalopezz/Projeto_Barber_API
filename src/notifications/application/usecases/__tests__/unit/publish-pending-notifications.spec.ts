import { PublishPendingNotificationsUseCase } from '../../publish-pending-notifications.usecase';

describe('Publicação da outbox', () => {
  const findPending = jest.fn();
  const enqueue = jest.fn();
  const deliver = jest.fn();
  const sut = new PublishPendingNotificationsUseCase.UseCase(
    { findPending, deliver },
    { enqueue },
  );
  beforeEach(() => {
    jest.resetAllMocks();
    enqueue.mockResolvedValue(undefined);
  });

  it('publica todas as páginas usando somente o ID e sem marcar entrega', async () => {
    findPending
      .mockResolvedValueOnce(['event-1', 'event-2'])
      .mockResolvedValueOnce(['event-3'])
      .mockResolvedValueOnce([]);
    await sut.execute();
    expect(enqueue.mock.calls).toEqual([['event-1'], ['event-2'], ['event-3']]);
    expect(findPending.mock.calls).toEqual([
      [undefined, 100],
      ['event-2', 100],
      ['event-3', 100],
    ]);
    expect(deliver).not.toHaveBeenCalled();
  });

  it('propaga falha do Redis e deixa o evento disponível para nova execução', async () => {
    findPending.mockResolvedValue(['event-1']);
    enqueue.mockRejectedValueOnce(new Error('Redis offline'));
    await expect(sut.execute()).rejects.toThrow('Redis offline');
    expect(deliver).not.toHaveBeenCalled();
    findPending.mockResolvedValueOnce(['event-1']).mockResolvedValueOnce([]);
    await sut.execute();
    expect(enqueue).toHaveBeenCalledTimes(2);
  });
});
