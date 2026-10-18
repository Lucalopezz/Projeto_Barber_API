import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@/auth/guard/auth.guard';
import {
  ApiDataResponse,
  ApiProtected,
} from '@/shared/infrastructure/openapi/openapi.decorators';
import { ChatUseCase } from '../application/usecases/chat.usecase';
import { ChatDto } from './dto/chat.dto';
import { ChatPresenter } from './presenters/chat.presenter';
@ApiTags('Assistente simulado')
@Controller('assistant')
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(@Inject(ChatUseCase) private readonly chat: ChatUseCase) {}
  @Post('chat')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Consultar catálogo e horários pelo simulador determinístico (somente leitura)',
  })
  @ApiDataResponse(ChatPresenter)
  @ApiProtected(400, 422)
  async execute(@Body() input: ChatDto) {
    return new ChatPresenter(await this.chat.execute(input));
  }
}
