/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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
  UserPresenter,
} from './presenters/user.presenter';
import { GetUserUseCase } from '../application/usecases/get-user.usecase';
import { UserOutput } from '../application/dtos/user-output.dto';
import { UpdatePasswordUseCase } from '../application/usecases/update-password.usecase';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserUseCase } from '../application/usecases/update-user.usecase';
import { UpdateUserDto } from './dto/update-user.dto';
import { DeleteUserUseCase } from '../application/usecases/delete-user.usecase';
import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserId } from '@/shared/infrastructure/decorators/current-user.decorator';
import { SigninDto } from './dto/signin.dto';
import { SigninUseCase } from '../application/usecases/signin.usecase';
import { AuthService } from '@/auth/auth.service';

@Controller('users')
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

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const output = await this.createUserUseCase.execute(createUserDto);
    return UsersController.userToResponse(output);
  }

  @Post('login')
  async login(@Body() signinDto: SigninDto) {
    const output = await this.signinUseCase.execute(signinDto);
    return this.authService.generateJwt(output.id);
  }

  @Get()
  @UseGuards(AuthGuard)
  async search(@Query() searchParams: ListUsersDto) {
    const output = await this.listUsersUseCase.execute(searchParams);
    return UsersController.listUsersToResponse(output);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    const output = await this.getUserUsecase.execute({ id });
    return UsersController.userToResponse(output);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.updateUserUseCase.execute({
      id,
      ...updateUserDto,
    });
    return UsersController.userToResponse(output);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
    @CurrentUserId() userId: string,
  ) {
    const output = await this.updatePasswordUseCase.execute({
      id,
      ...updatePasswordDto,
    });
    return UsersController.userToResponse(output);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @CurrentUserId() userId: string) {
    await this.deleteUserUseCase.execute({ id });
  }
}
