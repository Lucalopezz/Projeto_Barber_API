import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import {
  AssistantInput,
  AssistantReadTools,
  Plan,
  ToolCall,
} from '../ports/assistant';
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00.000Z`)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}
export function validateInput(input: AssistantInput) {
  if (
    !input ||
    typeof input.message !== 'string' ||
    !input.message.trim() ||
    input.message.length > 1000
  )
    throw new BadRequestError(
      'Message must contain between 1 and 1000 characters',
    );
  const ctx = input.context;
  if (
    ctx &&
    Object.keys(ctx).some(
      (key) => !['barberShopId', 'serviceId', 'date'].includes(key),
    )
  )
    throw new BadRequestError('Invalid assistant context');
  for (const key of ['barberShopId', 'serviceId'] as const)
    if (
      ctx?.[key] !== undefined &&
      (typeof ctx[key] !== 'string' || !uuid.test(ctx[key]))
    )
      throw new BadRequestError('Invalid context identifier');
  if (
    ctx?.date !== undefined &&
    (typeof ctx.date !== 'string' || !validDate(ctx.date))
  )
    throw new BadRequestError('Invalid calendar date');
}
// One selected read call per turn; no model-controlled loops or arbitrary dispatch.
export class ToolRegistry {
  constructor(private readonly tools: AssistantReadTools) {}
  async execute(plan: Exclude<Plan, { answer: string }>): Promise<ToolCall> {
    const args = plan.arguments;
    if (!args || typeof args !== 'object' || Array.isArray(args))
      throw new BadRequestError('Invalid tool arguments');
    const allowed: Record<string, string[]> = {
      search_catalog: ['filter'],
      list_services: ['barberShopId'],
      get_availability: ['barberShopId', 'serviceId', 'date'],
    };
    const keys = allowed[plan.name];
    if (
      !Object.prototype.hasOwnProperty.call(allowed, plan.name) ||
      !keys ||
      Object.keys(args).some((k) => !keys.includes(k)) ||
      keys.some((k) => typeof args[k] !== 'string')
    )
      throw new BadRequestError('Invalid assistant tool');
    validateInput({
      message: 'tool',
      context: Object.fromEntries(
        Object.entries(args).filter(([k]) => k !== 'filter'),
      ),
    });
    let result: unknown;
    switch (plan.name) {
      case 'search_catalog':
        if ((args.filter as string).length > 100)
          throw new BadRequestError('Catalog filter is too long');
        result = await this.tools.searchCatalog(args.filter as string);
        break;
      case 'list_services':
        result = await this.tools.listServices(args.barberShopId as string);
        break;
      case 'get_availability':
        result = await this.tools.getAvailability(
          args as { barberShopId: string; serviceId: string; date: string },
        );
        break;
      default:
        throw new BadRequestError('Invalid assistant tool');
    }
    return { name: plan.name, arguments: { ...args }, result };
  }
}
