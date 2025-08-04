export class Address {
  private readonly street: string;
  private readonly number: string;
  private readonly city: string;
  private readonly state: string;

  constructor(value: string) {
    // “rua, número, cidade – estado”
    // Ex "Rua das Flores, 123, São Paulo – SP"
    const parts = value.split(/\s*[,–-]\s*/).map((p) => p.trim());
    // parts ≈ ["Rua das Flores", "123", "São Paulo", "SP"]

    if (parts.length < 4) {
      throw new Error(
        'Address must include street, number, city and state (e.g.: "Street, 123, City – ST")',
      );
    }

    const [street, number, city, state] = parts;
    if (!street || !number || !city || !state) {
      throw new Error('All address components must be non-empty');
    }

    if (!/^\d+[A-Za-z]?$/.test(number)) {
      throw new Error('Invalid house/building number');
    }

    if (!/^[A-Za-z]{2}$/.test(state)) {
      throw new Error('State must be a 2-letter code');
    }

    this.street = street;
    this.number = number;
    this.city = city;
    this.state = state;
  }

  toString(): string {
    return `${this.street}, ${this.number}, ${this.city} – ${this.state}`;
  }

  getStreet() {
    return this.street;
  }
  getNumber() {
    return this.number;
  }
  getCity() {
    return this.city;
  }
  getState() {
    return this.state;
  }
}
