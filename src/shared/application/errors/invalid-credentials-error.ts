export class InvalidCredentialError extends Error {
  constructor(public message: string) {
    super(message);
    this.name = 'InvalidCredentialError';
  }
}
