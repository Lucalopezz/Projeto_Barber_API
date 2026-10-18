import { ApiProperty } from '@nestjs/swagger';
import { AssistantOutput, ToolCall } from '../../application/ports/assistant';
export class ChatPresenter implements AssistantOutput {
  @ApiProperty() answer: string;
  @ApiProperty({ enum: ['simulated'] }) provider: 'simulated';
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          enum: ['search_catalog', 'list_services', 'get_availability'],
        },
        arguments: { type: 'object', additionalProperties: true },
        result: { type: 'object', additionalProperties: true },
      },
    },
  })
  toolCalls: ToolCall[];
  constructor(output: AssistantOutput) {
    Object.assign(this, output);
  }
}
