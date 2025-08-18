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
import { CreateBarberShopDto } from './dto/create-barber-shop.dto';
import { UpdateBarberShopDto } from './dto/update-barber-shop.dto';
import { CreateBarberShopUseCase } from '../application/usecases/create-barberShop.usecase';
import { ListBarberShopUseCase } from '../application/usecases/list-barberShop.usecase';
import { BarberShopOutput } from '../application/dtos/barberShop-output.dto';
import { ListBarberShopDto } from './dto/list-barberShop.dto';
import {
  BarberShopCollectionPresenter,
  BarberShopPresenter,
} from './presenters/barberShop.presenter';
import { GetBarberShopUseCase } from '../application/usecases/get-barberShop.usecase';
import { UpdateBarberShopUseCase } from '../application/usecases/update-barberShop.usecase';
import { DeleteBarberShopUseCase } from '../application/usecases/delete-barberShop.usecase';

@Controller('barber-shop')
export class BarberShopController {
  @Inject(ListBarberShopUseCase.UseCase)
  private listBarberShopUseCase: ListBarberShopUseCase.UseCase;

  @Inject(GetBarberShopUseCase.UseCase)
  private getBarberShopUseCase: GetBarberShopUseCase.UseCase;

  @Inject(CreateBarberShopUseCase.UseCase)
  private createBarberShopUseCase: CreateBarberShopUseCase.UseCase;

  @Inject(UpdateBarberShopUseCase.UseCase)
  private updateBarberShopUseCase: UpdateBarberShopUseCase.UseCase;

  @Inject(DeleteBarberShopUseCase.UseCase)
  private deleteBarberShopUseCase: DeleteBarberShopUseCase.UseCase;

  static barberShopToResponse(output: BarberShopOutput) {
    return new BarberShopPresenter(output);
  }

  static listBarberShopToResponse(output: ListBarberShopUseCase.Output) {
    return new BarberShopCollectionPresenter(output);
  }

  @Post()
  async create(@Body() createBarberShopDto: CreateBarberShopDto) {
    const model =
      await this.createBarberShopUseCase.execute(createBarberShopDto);
    return BarberShopController.barberShopToResponse(model);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const output = await this.getBarberShopUseCase.execute({ id });
    return BarberShopController.barberShopToResponse(output);
  }

  @Get()
  async search(@Query() searchParams: ListBarberShopDto) {
    const output = await this.listBarberShopUseCase.execute(searchParams);
    return BarberShopController.listBarberShopToResponse(output);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBarberShopDto: UpdateBarberShopDto,
  ) {
    const model = await this.updateBarberShopUseCase.execute({
      id,
      ...updateBarberShopDto,
    });
    return BarberShopController.barberShopToResponse(model);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const ownerId = 'e38821fa-c39e-40e6-a268-a401a1d6f1da'; // This should be replaced with the actual ownerId logic, e.g., from the token
    return this.deleteBarberShopUseCase.execute({ id, ownerId });
  }
}
