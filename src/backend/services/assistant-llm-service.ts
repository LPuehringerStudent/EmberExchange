import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import * as fs from 'fs';
import * as path from 'path';

export class AssistantLlmService {
  private mainClient: OpenAI;
  private codeClient: OpenAI;
  private context: string;

  constructor() {
    this.mainClient = new OpenAI({
      apiKey: process.env.KIMI_API_KEY ?? 'missing-api-key',
      baseURL: process.env.KIMI_BASE_URL ?? 'https://api.moonshot.cn/v1',
    });
    this.codeClient = new OpenAI({
      apiKey: process.env.KIMI_CODE_API_KEY ?? process.env.KIMI_API_KEY ?? 'missing-api-key',
      baseURL: process.env.KIMI_CODE_BASE_URL ?? 'https://api.moonshot.cn/v1',
    });
    this.context = this.loadContext();
  }

  private loadContext(): string {
    const candidates = [
      path.resolve(__dirname, '../ai/context.md'),          // dist/backend/services -> dist/backend/ai
      path.resolve(process.cwd(), 'dist/backend/ai/context.md'),
      path.resolve(process.cwd(), 'src/backend/ai/context.md'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return fs.readFileSync(candidate, 'utf-8');
      }
    }
    return '';
  }

  getTools(): ChatCompletionTool[] {
    return [
      {
        type: 'function',
        function: {
          name: 'navigate_to',
          description: 'Navigate the user to a page.',
          parameters: {
            type: 'object',
            properties: {
              route: { type: 'string', enum: ['home', 'lootboxes', 'marketplace', 'shop', 'games', 'quests', 'inventory', 'profile', 'blackjack', 'poker', 'roulette'] },
            },
            required: ['route'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'highlight_element',
          description: 'Visually highlight a UI element and scroll it into view.',
          parameters: {
            type: 'object',
            properties: {
              target: { type: 'string', enum: ['lootboxes', 'marketplace', 'games', 'shop', 'quests', 'inventory', 'profile'] },
            },
            required: ['target'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'trigger_action',
          description: 'Trigger a safe UI action.',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['open_first_lootbox', 'claim_daily_reward', 'open_quests'] },
            },
            required: ['action'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_player_summary',
          description: 'Get a short summary of the current player.',
          parameters: { type: 'object', properties: {}, required: [] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'divine_intervention',
          description: 'Escalate a focused technical question to the coding model. Only use for EmberExchange feature questions.',
          parameters: {
            type: 'object',
            properties: {
              question: { type: 'string' },
            },
            required: ['question'],
          },
        },
      },
    ];
  }

  async chat(messages: ChatCompletionMessageParam[]): Promise<{ content: string; toolCalls?: OpenAI.Chat.ChatCompletionMessageToolCall[] }> {
    const response = await this.mainClient.chat.completions.create({
      model: process.env.KIMI_MODEL ?? 'kimi-k2.7',
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        ...messages,
      ],
      tools: this.getTools(),
      tool_choice: 'auto',
      temperature: 0.7,
      max_completion_tokens: 1024,
    });

    const choice = response.choices[0];
    const message = choice.message;
    return {
      content: message.content ?? '',
      toolCalls: message.tool_calls,
    };
  }

  async divineIntervention(question: string): Promise<string> {
    const response = await this.codeClient.chat.completions.create({
      model: process.env.KIMI_CODE_MODEL ?? 'kimi-for-coding',
      messages: [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: question },
      ],
      temperature: 0.3,
      max_completion_tokens: 1024,
    });
    return response.choices[0].message.content ?? '';
  }

  private buildSystemPrompt(): string {
    return [
      'You are the EmberExchange onboarding assistant. Help users learn the website.',
      'You can navigate, highlight UI elements, trigger safe actions, and summarize the current player state.',
      'Never reveal source code, file paths, secrets, database details, admin routes, honeypots, or other users data.',
      'Keep answers concise and friendly.',
      '=== Project context ===',
      this.context,
    ].join('\n');
  }
}
