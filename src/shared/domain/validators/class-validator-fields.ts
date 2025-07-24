import {
  FieldsError,
  ValidatorsFieldsInterface,
} from './validators-fields.interface';
import { validateSync } from 'class-validator';

export abstract class ClassValidatorFields<PropsValidated>
  implements ValidatorsFieldsInterface<PropsValidated>
{
  errors: FieldsError = null;

  validatedData: PropsValidated = null;

  validate(data: any): boolean {
    const errors = validateSync(data);

    // if there are errors
    if (errors.length > 0) {
      //initialize errors object
      this.errors = {};
      // loop through each error and map it to the field
      for (const error of errors) {
        const field = error.property;
        this.errors[field] = Object.values(error.constraints);
        // e.g. { name: ['Name is required', 'Name must be at least 3 characters'] }
      }
    } else {
      // if no errors, assign validated data
      this.validatedData = data;
    }
    // return true if there are no errors, false otherwise
    return !errors.length;
  }
}
