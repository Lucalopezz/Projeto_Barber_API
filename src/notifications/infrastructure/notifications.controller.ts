import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import {
  ApiPaginatedResponse,
  ApiProtected,
} from '@/shared/infrastructure/openapi/openapi.decorators';
import { ListNotificationsUseCase } from '../application/usecases/list-notifications.usecase';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import {
  NotificationCollectionPresenter,
  NotificationPresenter,
} from './presenters/notification.presenter';

@Controller('notifications')
@UseGuards(AuthGuard)
@ApiTags('Notificações')
export class NotificationsController {
  constructor(
    @Inject(ListNotificationsUseCase.UseCase)
    private readonly list: ListNotificationsUseCase.UseCase,
  ) {}

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
