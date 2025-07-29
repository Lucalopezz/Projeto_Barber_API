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
import { UserCollectionPresenter } from './presenters/user.presenter';

@Controller('users')
export class UsersController {
  @Inject(CreateUserUseCase.UseCase)
  private createUserUseCase: CreateUserUseCase.UseCase;

  @Inject(ListUsersUseCase.UseCase)
  private listUsersUseCase: ListUsersUseCase.UseCase;

  static listUsersToResponse(output: ListUsersUseCase.Output) {
    return new UserCollectionPresenter(output);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.createUserUseCase.execute(createUserDto);
  }

  // @Get()
  // findAll() {
  //   return;
  // }

  @Get()
  async search(@Query() searchParams: ListUsersDto) {
    const output = await this.listUsersUseCase.execute(searchParams);
    return UsersController.listUsersToResponse(output);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return;
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
