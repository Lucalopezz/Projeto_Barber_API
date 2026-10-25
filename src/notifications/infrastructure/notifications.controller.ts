import {
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import {
  ApiPaginatedResponse,
  ApiProtected,
  ApiDataResponse,
} from '@/shared/infrastructure/openapi/openapi.decorators';
import { ListNotificationsUseCase } from '../application/usecases/list-notifications.usecase';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationIdDto } from './dto/notification-id.dto';
import { CountUnreadNotificationsUseCase } from '../application/usecases/count-unread-notifications.usecase';
import { MarkNotificationReadUseCase } from '../application/usecases/mark-notification-read.usecase';
import {
  NotificationCollectionPresenter,
  NotificationPresenter,
  UnreadNotificationsCountPresenter,
} from './presenters/notification.presenter';

@Controller('notifications')
@UseGuards(AuthGuard)
@ApiTags('Notificações')
export class NotificationsController {
  constructor(
    @Inject(ListNotificationsUseCase.UseCase)
    private readonly list: ListNotificationsUseCase.UseCase,
    @Inject(CountUnreadNotificationsUseCase.UseCase)
    private readonly countUnread: CountUnreadNotificationsUseCase.UseCase,
    @Inject(MarkNotificationReadUseCase.UseCase)
    private readonly markRead: MarkNotificationReadUseCase.UseCase,
  ) {}

  @Get('unread-count')
  @ApiOperation({
    summary: 'Contar notificações não lidas do usuário autenticado',
  })
  @ApiDataResponse(UnreadNotificationsCountPresenter)
  @ApiProtected()
  async unreadCount(@CurrentUserId() userId: string) {
    return new UnreadNotificationsCountPresenter(
      await this.countUnread.execute({ userId }),
    );
  }

  @Patch(':id/read')
  @ApiOperation({
    summary:
      'Marcar a própria notificação como lida, preservando a primeira leitura',
  })
  @ApiDataResponse(NotificationPresenter)
  @ApiProtected(404, 422)
  async read(
    @Param() params: NotificationIdDto,
    @CurrentUserId() userId: string,
  ) {
    return new NotificationPresenter(
      await this.markRead.execute({ userId, id: params.id }),
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar notificações do usuário autenticado, da mais recente para a mais antiga',
  })
  @ApiPaginatedResponse(NotificationPresenter)
  @ApiProtected(422)
  async search(
    @Query() query: ListNotificationsDto,
    @CurrentUserId() userId: string,
  ) {
    return new NotificationCollectionPresenter(
      await this.list.execute({ ...query, userId }),
    );
  }
}
