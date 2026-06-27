import { AssistantLlmService } from '../../backend/services/assistant-llm-service';

describe('AssistantLlmService', () => {
  beforeAll(() => {
    process.env.KIMI_API_KEY = 'test-api-key';
  });

  it('builds tool definitions', () => {
    const service = new AssistantLlmService();
    expect(service.getTools().length).toBeGreaterThan(0);
  });
});
