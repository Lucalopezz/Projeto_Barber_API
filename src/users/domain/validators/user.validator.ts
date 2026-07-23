import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ClassValidatorFields } from '@/shared/domain/validators/class-validator-fields';
import { UserProps } from '../entities/user.entity';
import { Role } from '../entities/role.enum';

export class UserRules {
  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  name: string;

  @MaxLength(255)
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @MaxLength(100)
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  @IsEnum(Role)
  role: Role;

  @IsUUID()
  @IsOptional()
  barberShopId?: string | null;

  @IsDate()
  @IsOptional()
  createdAt?: Date;

  constructor({
    email,
    name,
    password,
    role,
    barberShopId,
    createdAt,
  }: UserProps) {
    Object.assign(this, {
      email,
      name,
      password,
      role,
      barberShopId,
      createdAt,
    });
  }
}

// This validator class uses ClassValidatorFields to validate UserProps
export class UserValidator extends ClassValidatorFields<UserRules> {
  validate(data: UserProps): boolean {
    return super.validate(new UserRules(data ?? ({} as UserProps)));
  }
}

// Factory to create an instance of UserValidator
// This is useful for dependency injection or when you need to create a new instance
// without directly instantiating the class.
export class UserValidatorFactory {
  static create(): UserValidator {
    return new UserValidator();
  }
}
