import { AssistantLlmService } from '../../backend/services/assistant-llm-service';

const createMock = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: createMock,
        },
      },
    })),
  };
});

describe('AssistantLlmService', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const key of ['KIMI_API_KEY', 'KIMI_CODE_API_KEY', 'KIMI_BASE_URL', 'KIMI_CODE_BASE_URL', 'KIMI_MODEL', 'KIMI_CODE_MODEL']) {
      originalEnv[key] = process.env[key];
    }
    process.env.KIMI_API_KEY = 'test-api-key';
    process.env.KIMI_CODE_API_KEY = 'test-code-key';
    delete process.env.KIMI_BASE_URL;
    delete process.env.KIMI_CODE_BASE_URL;
    delete process.env.KIMI_MODEL;
    delete process.env.KIMI_CODE_MODEL;
  });

  afterAll(() => {
    for (const key of Object.keys(originalEnv)) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  beforeEach(() => {
    createMock.mockReset();
  });

  it('builds tool definitions', () => {
    const service = new AssistantLlmService();
    expect(service.getTools().length).toBe(5);
    const names = service.getTools().map((t) => (t as { function: { name: string } }).function.name).sort();
    expect(names).toEqual([
      'divine_intervention',
      'get_player_summary',
      'highlight_element',
      'navigate_to',
      'trigger_action',
    ]);
  });

  it('chat calls the main model with system prompt, messages and tools', async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello!',
            tool_calls: undefined,
          },
        },
      ],
    });

    const service = new AssistantLlmService();
    const result = await service.chat([{ role: 'user', content: 'Hi' }]);

    expect(result.content).toBe('Hello!');
    expect(createMock).toHaveBeenCalledTimes(1);
    const call = createMock.mock.calls[0][0];
    expect(call.model).toBe('kimi-k2.6');
    expect(call.messages[0].role).toBe('system');
    expect(call.messages[1]).toEqual({ role: 'user', content: 'Hi' });
    expect(call.tools).toEqual(service.getTools());
    expect(call.tool_choice).toBe('auto');
  });

  it('divineIntervention calls the code model', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: 'Code answer' } }],
    });

    const service = new AssistantLlmService();
    const answer = await service.divineIntervention('How does lootbox rarity work?');

    expect(answer).toBe('Code answer');
    expect(createMock).toHaveBeenCalledTimes(1);
    const call = createMock.mock.calls[0][0];
    expect(call.model).toBe('kimi-k2.7-code');
    expect(call.messages[0].role).toBe('system');
    expect(call.messages[1]).toEqual({ role: 'user', content: 'How does lootbox rarity work?' });
  });

  it('loads onboarding context from context.md', () => {
    const service = new AssistantLlmService();
    const context = (service as unknown as { context: string }).context;
    expect(context).toContain('EmberExchange');
    expect(context).toContain('/lootboxes');
  });
});
