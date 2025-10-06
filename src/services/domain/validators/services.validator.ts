import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { ServiceProps } from '../entities/services.entity';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';

export class ServicesRules {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  duration: number;

  @IsNotEmpty()
  @IsUUID()
  barberShopId: string;

  constructor(data: ServiceProps) {
    Object.assign(this, data);
  }
}

export class ServiceValidator extends ClassValidatorFields<ServicesRules> {
  validate(data: ServiceProps): boolean {
    // invoke the validate method of the parent class
    // to filter the data, if there are errors, they will be in this.errors
    return super.validate(new ServicesRules(data ?? ({} as ServiceProps)));
  }
}

export class ServiceValidatorFactory {
  static create(): ServiceValidator {
    return new ServiceValidator();
  }
}
