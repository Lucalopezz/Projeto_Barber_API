import {
  AssistantInput,
  AssistantOutput,
  AssistantProvider,
  AssistantReadTools,
  Availability,
  PublicService,
  PublicShop,
  ToolCall,
} from '../ports/assistant';
import { ToolRegistry, validateInput } from '../services/tool-registry';
import { BadRequestError } from '@/shared/application/errors/bad-request-error';
import { UseCaseContract } from '@/shared/application/usecases/use-case';
export class ChatUseCase implements UseCaseContract<
  AssistantInput,
  AssistantOutput
> {
  constructor(
    private readonly provider: AssistantProvider,
    private readonly tools: AssistantReadTools,
  ) {}
  async execute(input: AssistantInput): Promise<AssistantOutput> {
    validateInput(input);
    const plan = this.provider.plan(input);
    if ('answer' in plan)
      return { answer: plan.answer, provider: 'simulated', toolCalls: [] };
    try {
      const call = await new ToolRegistry(this.tools).execute(plan);
      return {
        answer: this.describe(call),
        provider: 'simulated',
        toolCalls: [call],
      };
    } catch (error) {
      if (
        error instanceof BadRequestError &&
        [
          'Invalid assistant tool',
          'Invalid tool arguments',
          'Invalid context identifier',
          'Invalid calendar date',
          'Catalog filter is too long',
        ].includes(error.message)
      )
        throw error;
      return {
        answer:
          'Não foi possível consultar os dados agora. Confira a barbearia, o serviço e a data selecionados ou tente novamente.',
        provider: 'simulated',
        toolCalls: [],
      };
    }
  }
  private describe(call: ToolCall): string {
    if (call.name === 'search_catalog') {
      const { items, total } = call.result as {
        items: PublicShop[];
        total: number;
      };
      return items.length
        ? `Barbearias encontradas (${items.length} de ${total}): ${items.map((x) => `${JSON.stringify(x.name)} — ${JSON.stringify(x.address)}`).join('; ')}. Selecione uma barbearia para consultar serviços.`
        : 'Nenhuma barbearia encontrada. Tente outro nome.';
    }
    if (call.name === 'list_services') {
      const { items, total } = call.result as {
        items: PublicService[];
        total: number;
      };
      return items.length
        ? `Serviços (${items.length} de ${total}): ${items.map((x) => `${JSON.stringify(x.name)} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(x.price)}, ${x.duration} min`).join('; ')}. Selecione serviço e data para consultar horários.`
        : 'Nenhum serviço cadastrado nesta barbearia.';
    }
    const result = call.result as Availability;
    if (!result.slots.length)
      return `Nenhum horário disponível em ${result.date} (${result.timezone}).`;
    const format = new Intl.DateTimeFormat('pt-BR', {
      timeZone: result.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    return `Horários disponíveis em ${result.date} (${result.timezone}): ${result.slots.map((s) => format.format(new Date(s.startsAt))).join(', ')}. A disponibilidade pode mudar; confirme na tela de agendamento.`;
  }
}
