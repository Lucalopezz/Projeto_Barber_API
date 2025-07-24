import { FieldsError } from '../validators/validators-fields.interface';

export class ValidationError extends Error {}

export class EntityValidationError extends ValidationError {
  constructor(public error: FieldsError) {
    super('Entity validation error');
    this.name = 'EntityValidationError';
  }
}
