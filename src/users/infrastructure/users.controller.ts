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
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserUseCase } from '../application/usecases/create-user.usecase';
import { ListUsersUseCase } from '../application/usecases/list-users.usecase';
import { ListUsersDto } from './dto/list-users.dto';
import {
  UserCollectionPresenter,
  UserPresenter,
} from './presenters/user.presenter';
import { GetUserUseCase } from '../application/usecases/get-user.usecase';
import { UserOutput } from '../application/dtos/user-output.dto';

@Controller('users')
export class UsersController {
  @Inject(CreateUserUseCase.UseCase)
  private createUserUseCase: CreateUserUseCase.UseCase;

  @Inject(ListUsersUseCase.UseCase)
  private listUsersUseCase: ListUsersUseCase.UseCase;

  @Inject(GetUserUseCase.UseCase)
  private getUserUsecase: GetUserUseCase.UseCase;

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

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return;
  }
}
