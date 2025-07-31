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

  static userToResponse(output: UserOutput) {
    return new UserPresenter(output);
  }

  static listUsersToResponse(output: ListUsersUseCase.Output) {
    return new UserCollectionPresenter(output);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.createUserUseCase.execute(createUserDto);
  }

  @Get()
  async search(@Query() searchParams: ListUsersDto) {
    const output = await this.listUsersUseCase.execute(searchParams);
    return UsersController.listUsersToResponse(output);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const output = await this.getUserUsecase.execute({ id });
    return UsersController.userToResponse(output);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const output = await this.updateUserUseCase.execute({
      id,
      ...updateUserDto,
    });
    return UsersController.userToResponse(output);
  }

  @Patch(':id')
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    const output = await this.updatePasswordUseCase.execute({
      id,
      ...updatePasswordDto,
    });
    return UsersController.userToResponse(output);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deleteUserUseCase.execute({ id });
  }
}
