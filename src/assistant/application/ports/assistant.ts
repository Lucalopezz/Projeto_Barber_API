export type AssistantInput = {
  message: string;
  context?: { barberShopId?: string; serviceId?: string; date?: string };
};
export type ToolName = 'search_catalog' | 'list_services' | 'get_availability';
export type ToolCall = {
  name: ToolName;
  arguments: Record<string, unknown>;
  result: unknown;
};
export type AssistantOutput = {
  answer: string;
  provider: 'simulated';
  toolCalls: ToolCall[];
};
export type Plan =
  { answer: string } | { name: ToolName; arguments: Record<string, unknown> };
export interface AssistantProvider {
  plan(input: AssistantInput): Plan;
}
export type PublicShop = { id: string; name: string; address: string };
export type PublicService = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  barberShopId: string;
};
export type Availability = {
  date: string;
  timezone: string;
  serviceId: string;
  slots: { startsAt: string; endsAt: string }[];
};
export interface AssistantReadTools {
  searchCatalog(
    filter: string,
  ): Promise<{ items: PublicShop[]; total: number }>;
  listServices(
    barberShopId: string,
  ): Promise<{ items: PublicService[]; total: number }>;
  getAvailability(input: {
    barberShopId: string;
    serviceId: string;
    date: string;
  }): Promise<Availability>;
}
