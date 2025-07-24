export type FieldsError = {
  [field: string]: string[];
};
// field and errors associated with it: Name -> ['Name is required', 'Name must be at least 3 characters']
export interface ValidatorsFieldsInterface<PropsValidated> {
  errors: FieldsError;
  validatedData: PropsValidated;
  validate(data: any): boolean;
}
