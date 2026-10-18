import {
  AssistantInput,
  AssistantProvider,
  Plan,
} from '../../application/ports/assistant';
export class SimulatedAssistantProvider implements AssistantProvider {
  plan(input: AssistantInput): Plan {
    const text = input.message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const ctx = input.context ?? {};
    if (
      /reserv|agend|cancel|remarc|exclu|delet|conclu|senha|token|segredo|ignore|instruc|prompt/.test(
        text,
      )
    )
      return {
        answer:
          'Posso somente consultar barbearias, serviços e horários. Não realizo reservas, alterações nem acesso dados privados.',
      };
    if (/horario|disponib|vaga/.test(text)) {
      if (!ctx.barberShopId || !ctx.serviceId || !ctx.date)
        return {
          answer:
            'Selecione a barbearia, o serviço e uma data para consultar os horários disponíveis.',
        };
      return {
        name: 'get_availability',
        arguments: {
          barberShopId: ctx.barberShopId,
          serviceId: ctx.serviceId,
          date: ctx.date,
        },
      };
    }
    if (/servico|preco|valor|duracao/.test(text)) {
      if (!ctx.barberShopId)
        return {
          answer:
            'Selecione uma barbearia para consultar seus serviços, preços e duração.',
        };
      return {
        name: 'list_services',
        arguments: { barberShopId: ctx.barberShopId },
      };
    }
    if (/barbearia|catalogo|buscar/.test(text)) {
      const filter =
        /^buscar\s+(.+)$/i.exec(input.message.trim())?.[1]?.slice(0, 100) ?? '';
      return { name: 'search_catalog', arguments: { filter } };
    }
    return {
      answer:
        'Sou um simulador de consultas. Você quer consultar barbearias, serviços ou horários? Para buscar pelo nome, escreva “buscar nome”.',
    };
  }
}
