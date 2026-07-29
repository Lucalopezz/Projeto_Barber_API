/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

import { CreateUserUseCase } from '../application/usecases/create-user.usecase';
import { ListUsersUseCase } from '../application/usecases/list-users.usecase';
import { ListUsersDto } from './dto/list-users.dto';
import {
  UserCollectionPresenter,
  UserContextPresenter,
  UserPresenter,
} from './presenters/user.presenter';
import { GetUserUseCase } from '../application/usecases/get-user.usecase';
import { UserOutput } from '../application/dtos/user-output.dto';
import { UpdatePasswordUseCase } from '../application/usecases/update-password.usecase';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserUseCase } from '../application/usecases/update-user.usecase';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserUseCase } from '../application/usecases/delete-user.usecase';
import { AuthGuard } from '@/auth/guard/auth.guard';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { SigninDto } from './dto/signin.dto';
import { SigninUseCase } from '../application/usecases/signin.usecase';
import { AuthService } from '@/auth/auth.service';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
  ApiProtected,
} from '@/shared/infrastructure/openapi/openapi.decorators';
import { AccessTokenResponse } from '@/shared/infrastructure/openapi/openapi.models';

@Controller('users')
@ApiTags('Usuários e autenticação')
export class UsersController {
  @Inject(CreateUserUseCase.UseCase)
  private createUserUseCase: CreateUserUseCase.UseCase;

  @Inject(UpdatePasswordUseCase.UseCase)
  private updatePasswordUseCase: UpdatePasswordUseCase.UseCase;

  @Inject(UpdateUserUseCase.UseCase)
  private updateUserUseCase: UpdateUserUseCase.UseCase;

  @Inject(ListUsersUseCase.UseCase)
  private listUsersUseCase: ListUsersUseCase.UseCase;

  @Inject(GetUserUseCase.UseCase)
  private getUserUsecase: GetUserUseCase.UseCase;

  @Inject(DeleteUserUseCase.UseCase)
  private deleteUserUseCase: DeleteUserUseCase.UseCase;

  @Inject(SigninUseCase.UseCase)
  private signinUseCase: SigninUseCase.UseCase;

  @Inject(AuthService)
  private authService: AuthService;

  static userToResponse(output: UserOutput) {
    return new UserPresenter(output);
  }

  static listUsersToResponse(output: ListUsersUseCase.Output) {
    return new UserCollectionPresenter(output);
  }

  static userContextToResponse(output: GetUserUseCase.Output) {
    return new UserContextPresenter(output);
  }

  @Post()
  @ApiOperation({ summary: 'Criar uma conta' })
  @ApiDataResponse(UserPresenter, 201, 'Conta criada')
  @ApiErrorResponses(409, 422)
  async create(@Body() createUserDto: CreateUserDto) {
    const output = await this.createUserUseCase.execute(createUserDto);
    return UsersController.userToResponse(output);
  }

  @Post('login')
  @ApiOperation({ summary: 'Autenticar e gerar um JWT' })
  @ApiResponse({
    status: 201,
    description: 'Credenciais válidas',
    type: AccessTokenResponse,
  })
  @ApiErrorResponses(400, 422)
  async login(@Body() signinDto: SigninDto) {
    const output = await this.signinUseCase.execute(signinDto);
    return this.authService.generateJwt(output.id, output.role);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Listar usuários' })
  @ApiPaginatedResponse(UserPresenter)
  @ApiProtected(422)
  async search(@Query() searchParams: ListUsersDto) {
    const output = await this.listUsersUseCase.execute(searchParams);
    return UsersController.listUsersToResponse(output);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Consultar o contexto do usuário autenticado' })
  @ApiDataResponse(UserContextPresenter)
  @ApiProtected(404)
  async findOne(@CurrentUserId() id: string) {
    const output = await this.getUserUsecase.execute({ id });
    return UsersController.userContextToResponse(output);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Atualizar o próprio perfil' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiDataResponse(UserPresenter)
  @ApiProtected(403, 404, 422)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.updateUserUseCase.execute({
      id,
      userId,
      ...updateUserDto,
    });
    return UsersController.userToResponse(output);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Atualizar a própria senha' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiDataResponse(UserPresenter)
  @ApiProtected(403, 404, 422)
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.updatePasswordUseCase.execute({
      id,
      userId,
      ...updatePasswordDto,
    });
    return UsersController.userToResponse(output);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Excluir a própria conta' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'ID do usuário' })
  @ApiResponse({ status: 204, description: 'Conta excluída' })
  @ApiProtected(403, 404)
  async remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    await this.deleteUserUseCase.execute({ id, userId });
  }
}
