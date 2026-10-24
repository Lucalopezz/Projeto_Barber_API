import {
  ShopBarberOutput,
  ShopInvitationOutput,
} from '@/barberShop/application/dtos/shop-staff-output.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ShopBarberPresenter implements ShopBarberOutput {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['owner', 'barber'] }) role: 'owner' | 'barber';

  constructor(output: ShopBarberOutput) {
    Object.assign(this, output);
  }
}

export class ShopInvitationPresenter implements ShopInvitationOutput {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) barberShopId: string;
  @ApiProperty() shopName: string;
  @ApiProperty({ format: 'uuid' }) barberId: string;
  @ApiProperty() barberName: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;

  constructor(output: ShopInvitationOutput) {
    Object.assign(this, output);
  }
}

export class JoinedBarberPresenter extends ShopBarberPresenter {
  @ApiProperty({ format: 'uuid' }) barberShopId: string;

  constructor(output: ShopBarberOutput & { barberShopId: string }) {
    super(output);
    this.barberShopId = output.barberShopId;
  }
}
