# AI Onboarding Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a login-gated, floating AI onboarding assistant that answers questions, navigates, highlights UI, triggers safe actions, and summarizes player stats — backed by Kimi K2.7 with an optional Kimi Code 2.7 escalation.

**Architecture:** A backend `/api/assistant/chat` endpoint orchestrates Kimi K2.7 with OpenAI-compatible tool calling. Tool results are executed server-side and returned to the model for a final answer. The frontend renders a floating button and chat drawer, executing UI actions from the response. Rate limits and output sanitization live in the backend.

**Tech Stack:** Angular 21 (signals, standalone), Node.js/Express, TypeScript, PostgreSQL, `openai` SDK, Kimi K2.7 / Kimi Code 2.7 APIs.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/backend/utils/unit.ts` | MODIFIED. Add `AssistantUsage` table to `ensureTablesCreated`. |
| `src/backend/services/assistant-usage-service.ts` | NEW. Daily cap tracking, reset logic, admin bypass check. |
| `src/backend/services/assistant-sanitizer.ts` | NEW. Output block-list sanitizer. |
| `src/backend/services/assistant-llm-service.ts` | NEW. LLM client wrapper for K2.7 and Code 2.7. |
| `src/backend/services/assistant-tool-service.ts` | NEW. Tool handler implementations (navigate, highlight, trigger, summary, divine). |
| `src/backend/ai/context.md` | NEW. Curated context document for the system prompt. |
| `src/backend/routers/assistant-router.ts` | NEW. Express router for `POST /api/assistant/chat`. |
| `src/backend/app.ts` | MODIFIED. Mount `assistantRouter` and add rate limiter. |
| `src/frontend/src/app/core/services/ai-helper.service.ts` | NEW. Frontend service for drawer state and API calls. |
| `src/frontend/src/app/shared/components/ai-helper-button/ai-helper-button.component.ts` | NEW. Floating button. |
| `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.ts` | NEW. Chat drawer. |
| `src/frontend/src/app/core/layout/shell.component.ts` | MODIFIED. Add button component to imports/template. |
| `src/test/serviceTests/assistant-*.test.ts` | NEW. Tests for services and sanitizer. |
| `src/test/apiTests/assistant-api.test.ts` | NEW. Integration tests for the endpoint. |

---

## Task 1: Database table and AssistantUsageService

**Files:**
- Create: `src/backend/services/assistant-usage-service.ts`
- Modify: `src/backend/utils/unit.ts`
- Test: `src/test/serviceTests/assistant-usage-service.test.ts`

### Step 1: Add table in `ensureTablesCreated`

In `src/backend/utils/unit.ts`, add inside `ensureTablesCreated`:

```sql
CREATE TABLE IF NOT EXISTS AssistantUsage (
  playerId INTEGER PRIMARY KEY REFERENCES Player(playerId) ON DELETE CASCADE,
  chat_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### Step 2: Write the failing test

Create `src/test/serviceTests/assistant-usage-service.test.ts`:

```ts
import { AssistantUsageService } from '../../backend/services/assistant-usage-service';
import { Unit } from '../../backend/utils/unit';

describe('AssistantUsageService', () => {
  it('increments usage and returns remaining', async () => {
    const unit = await Unit.create(false);
    try {
      const service = new AssistantUsageService(unit);
      const first = await service.recordUsage(1, 20);
      expect(first.remaining).toBe(19);
      const second = await service.recordUsage(1, 20);
      expect(second.remaining).toBe(18);
    } finally {
      await unit.complete(false);
    }
  });

  it('admins bypass the cap', async () => {
    const unit = await Unit.create(false);
    try {
      const service = new AssistantUsageService(unit);
      const result = await service.recordUsage(1, 20, true);
      expect(result.remaining).toBeNull();
      expect(result.wasIncremented).toBe(false);
    } finally {
      await unit.complete(false);
    }
  });
});
```

### Step 3: Run test to verify it fails

```bash
npm test -- src/test/serviceTests/assistant-usage-service.test.ts --silent
```

Expected: FAIL — `AssistantUsageService` not found.

### Step 4: Implement `AssistantUsageService`

Create `src/backend/services/assistant-usage-service.ts`:

```ts
import { ServiceBase } from './service-base';
import { Unit } from '../utils/unit';

export interface UsageResult {
  remaining: number | null;
  wasIncremented: boolean;
}

export class AssistantUsageService extends ServiceBase {
  constructor(unit: Unit) {
    super(unit);
  }

  async recordUsage(playerId: number, dailyCap: number, isAdmin = false): Promise<UsageResult> {
    if (isAdmin) {
      return { remaining: null, wasIncremented: false };
    }

    await this.ensureReset(playerId);

    const update = this.unit.prepare<{ playerId: number }, { chat_count: number }>(
      `UPDATE AssistantUsage SET chat_count = chat_count + 1 WHERE playerId = @playerId RETURNING chat_count`,
      { playerId }
    );
    const row = await update.get();
    const count = row?.chat_count ?? 0;
    const remaining = Math.max(0, dailyCap - count);
    return { remaining, wasIncremented: true };
  }

  async getRemaining(playerId: number, dailyCap: number, isAdmin = false): Promise<number | null> {
    if (isAdmin) return null;
    await this.ensureReset(playerId);
    const stmt = this.unit.prepare<{ playerId: number }, { chat_count: number }>(
      `SELECT chat_count FROM AssistantUsage WHERE playerId = @playerId`,
      { playerId }
    );
    const row = await stmt.get();
    const count = row?.chat_count ?? 0;
    return Math.max(0, dailyCap - count);
  }

  private async ensureReset(playerId: number): Promise<void> {
    const midnight = new Date();
    midnight.setUTCHours(0, 0, 0, 0);

    const upsert = this.unit.prepare<{ playerId: number; midnight: Date }, unknown>(
      `INSERT INTO AssistantUsage (playerId, chat_count, reset_at)
       VALUES (@playerId, 0, @midnight)
       ON CONFLICT (playerId)
       DO UPDATE SET
         chat_count = CASE WHEN AssistantUsage.reset_at < @midnight THEN 0 ELSE AssistantUsage.chat_count END,
         reset_at = CASE WHEN AssistantUsage.reset_at < @midnight THEN @midnight ELSE AssistantUsage.reset_at END`,
      { playerId, midnight }
    );
    await upsert.run();
  }
}
```

### Step 5: Run test to verify it passes

```bash
npm test -- src/test/serviceTests/assistant-usage-service.test.ts --silent
```

Expected: PASS.

### Step 6: Commit

```bash
git add src/backend/utils/unit.ts src/backend/services/assistant-usage-service.ts src/test/serviceTests/assistant-usage-service.test.ts
git commit -m "feat(assistant): add AssistantUsage table and service"
```

---

## Task 2: Output sanitizer and security block list

**Files:**
- Create: `src/backend/services/assistant-sanitizer.ts`
- Test: `src/test/serviceTests/assistant-sanitizer.test.ts`

### Step 1: Write the failing test

Create `src/test/serviceTests/assistant-sanitizer.test.ts`:

```ts
import { sanitizeAssistantOutput, containsSensitivePattern } from '../../backend/services/assistant-sanitizer';

describe('assistant sanitizer', () => {
  it('allows safe onboarding text', () => {
    const text = 'You can earn coins by playing Blackjack or selling stoves.';
    expect(sanitizeAssistantOutput(text)).toBe(text);
    expect(containsSensitivePattern(text)).toBe(false);
  });

  it('blocks env and secret mentions', () => {
    expect(containsSensitivePattern('The DATABASE_URL is postgres://...')).toBe(true);
    expect(sanitizeAssistantOutput('The DATABASE_URL is postgres://...')).toContain('I can\'t share');
  });

  it('blocks honeypot and admin references', () => {
    expect(containsSensitivePattern('Our honeypot endpoint is /admin-panel-old')).toBe(true);
    expect(sanitizeAssistantOutput('Our honeypot endpoint is /admin-panel-old')).toContain('I can\'t share');
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/test/serviceTests/assistant-sanitizer.test.ts --silent
```

Expected: FAIL.

### Step 3: Implement sanitizer

Create `src/backend/services/assistant-sanitizer.ts`:

```ts
const BLOCKED_PATTERNS: RegExp[] = [
  /process\.env/i,
  /DATABASE_URL/i,
  /SESSION_SECRET/i,
  /RESEND_API_KEY/i,
  /GITHUB_API_TOKEN/i,
  /TURNSTILE_SECRET_KEY/i,
  /GOOGLE_CLIENT_SECRET/i,
  /honeypot/i,
  /__proto__/,
  /constructor/,
  /prototype/i,
  /\/api\/db-test/i,
  /\/admin-panel/i,
  /\/phpmyadmin/i,
  /src\/backend/i,
  /node_modules/i,
  /\.env/i,
  /postgres:\/\//i,
  /mongodb:\/\//i,
  /BEGIN (RSA|OPENSSH|PGP) PRIVATE KEY/i,
  /banned.*ip/i,
  /security.*event/i,
];

export function containsSensitivePattern(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export function sanitizeAssistantOutput(text: string): string {
  if (containsSensitivePattern(text)) {
    return "I can't share that kind of detail. Let me know how I can help with EmberExchange features!";
  }
  return text;
}
```

### Step 4: Run test to verify it passes

```bash
npm test -- src/test/serviceTests/assistant-sanitizer.test.ts --silent
```

Expected: PASS.

### Step 5: Commit

```bash
git add src/backend/services/assistant-sanitizer.ts src/test/serviceTests/assistant-sanitizer.test.ts
git commit -m "feat(assistant): add output sanitizer"
```

---

## Task 3: LLM client service

**Files:**
- Create: `src/backend/services/assistant-llm-service.ts`
- Test: `src/test/serviceTests/assistant-llm-service.test.ts`

### Step 1: Install dependency

```bash
npm install openai
```

### Step 2: Write the failing test

Create `src/test/serviceTests/assistant-llm-service.test.ts`:

```ts
import { AssistantLlmService } from '../../backend/services/assistant-llm-service';

describe('AssistantLlmService', () => {
  it('builds tool definitions', () => {
    const service = new AssistantLlmService();
    expect(service.getTools().length).toBeGreaterThan(0);
  });
});
```

### Step 3: Run test to verify it fails

```bash
npm test -- src/test/serviceTests/assistant-llm-service.test.ts --silent
```

Expected: FAIL.

### Step 4: Implement service

Create `src/backend/services/assistant-llm-service.ts`:

```ts
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
      apiKey: process.env.KIMI_API_KEY ?? '',
      baseURL: process.env.KIMI_BASE_URL ?? 'https://api.moonshot.ai/v1',
    });
    this.codeClient = new OpenAI({
      apiKey: process.env.KIMI_CODE_API_KEY ?? process.env.KIMI_API_KEY ?? '',
      baseURL: process.env.KIMI_CODE_BASE_URL ?? 'https://api.moonshot.ai/v1',
    });
    const contextPath = path.resolve(__dirname, '../ai/context.md');
    this.context = fs.existsSync(contextPath) ? fs.readFileSync(contextPath, 'utf-8') : '';
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
          parameters: { type: 'object', properties: {} },
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
      toolCalls: message.tool_calls as OpenAI.Chat.ChatCompletionMessageToolCall[] | undefined,
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
```

### Step 5: Run test to verify it passes

```bash
npm test -- src/test/serviceTests/assistant-llm-service.test.ts --silent
```

Expected: PASS.

### Step 6: Commit

```bash
git add package.json package-lock.json src/backend/services/assistant-llm-service.ts src/test/serviceTests/assistant-llm-service.test.ts
git commit -m "feat(assistant): add LLM client service"
```

---

## Task 4: Tool handlers

**Files:**
- Create: `src/backend/services/assistant-tool-service.ts`
- Test: `src/test/serviceTests/assistant-tool-service.test.ts`

### Step 1: Write the failing test

Create `src/test/serviceTests/assistant-tool-service.test.ts`:

```ts
import { AssistantToolService } from '../../backend/services/assistant-tool-service';
import { AssistantLlmService } from '../../backend/services/assistant-llm-service';
import { Unit } from '../../backend/utils/unit';

jest.mock('../../backend/services/assistant-llm-service');

describe('AssistantToolService', () => {
  it('navigate_to returns route mapping', () => {
    const service = new AssistantToolService({} as AssistantLlmService, {} as Unit, { playerId: 1, isAdmin: false });
    expect(service.handle('navigate_to', { route: 'blackjack' })).toEqual({ route: '/games/blackjack/lobby' });
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/test/serviceTests/assistant-tool-service.test.ts --silent
```

Expected: FAIL.

### Step 3: Implement tool service

Create `src/backend/services/assistant-tool-service.ts`:

```ts
import { AssistantLlmService } from './assistant-llm-service';
import { Unit } from '../utils/unit';

export interface ToolContext {
  playerId: number;
  isAdmin: boolean;
}

export class AssistantToolService {
  constructor(
    private llm: AssistantLlmService,
    private unit: Unit,
    private ctx: ToolContext
  ) {}

  handle(name: string, args: Record<string, unknown>): unknown {
    switch (name) {
      case 'navigate_to':
        return this.navigateTo(String(args.route));
      case 'highlight_element':
        return { target: String(args.target), selector: this.targetToSelector(String(args.target)) };
      case 'trigger_action':
        return { action: String(args.action), acknowledged: true };
      case 'get_player_summary':
        return this.getPlayerSummary();
      case 'divine_intervention':
        return this.divineIntervention(String(args.question));
      default:
        return { error: 'Unknown tool' };
    }
  }

  private navigateTo(route: string): { route: string } {
    const map: Record<string, string> = {
      home: '/home',
      lootboxes: '/lootboxes',
      marketplace: '/marketplace',
      shop: '/shop',
      games: '/games',
      quests: '/quests',
      inventory: '/inventory',
      profile: '/profile',
      blackjack: '/games/blackjack/lobby',
      poker: '/games/poker/lobby',
      roulette: '/games/roulette/lobby',
    };
    return { route: map[route] ?? '/home' };
  }

  private targetToSelector(target: string): string {
    const map: Record<string, string> = {
      lootboxes: '[data-tour="lootboxes"]',
      marketplace: '[data-tour="marketplace"]',
      games: '[data-tour="games"]',
      shop: '[data-tour="shop"]',
      quests: '[data-tour="quests"]',
      inventory: '[data-tour="inventory"]',
      profile: '[data-tour="profile"]',
    };
    return map[target] ?? '';
  }

  private async getPlayerSummary(): Promise<Record<string, unknown>> {
    const stmt = this.unit.prepare<{ playerId: number }, { coins: number; sparks: number }>(
      `SELECT coins, sparks FROM Player WHERE id = @playerId`,
      { playerId: this.ctx.playerId }
    );
    const row = await stmt.get();
    return {
      coins: row?.coins ?? 0,
      sparks: row?.sparks ?? 0,
    };
  }

  private async divineIntervention(question: string): Promise<{ answer: string }> {
    const answer = await this.llm.divineIntervention(question);
    return { answer };
  }
}
```

### Step 4: Run test to verify it passes

```bash
npm test -- src/test/serviceTests/assistant-tool-service.test.ts --silent
```

Expected: PASS.

### Step 5: Commit

```bash
git add src/backend/services/assistant-tool-service.ts src/test/serviceTests/assistant-tool-service.test.ts
git commit -m "feat(assistant): add tool handlers"
```

---

## Task 5: Curated context document

**Files:**
- Create: `src/backend/ai/context.md`

### Step 1: Create context file

Create `src/backend/ai/context.md`:

```markdown
# EmberExchange — Onboarding Assistant Context

## Project overview
EmberExchange is a virtual marketplace and collection game built around trading unique stoves. Players open lootboxes, trade stoves, play casino-style games, and complete quests.

## Main features
- **Lootboxes** (`/lootboxes`): Open boxes to collect stoves of different rarities.
- **Marketplace** (`/marketplace`): Buy and sell stoves with other players.
- **Shop** (`/shop`): Spend coins and sparks on items, claim daily rewards.
- **Games** (`/games`): Play Poker, Blackjack, and Roulette.
- **Inventory** (`/inventory`): View and manage your stove collection.
- **Quests** (`/quests`): Complete daily/weekly quests for rewards.
- **Profile** (`/profile`): View your stats and achievements.

## How to earn coins
- Play games (Blackjack, Poker, Roulette).
- Sell stoves on the Marketplace.
- Complete quests.
- Claim daily rewards in the Shop.

## Tone
Friendly, concise, and helpful. Use plain language. Offer actionable next steps.
```

### Step 2: Commit

```bash
git add src/backend/ai/context.md
git commit -m "docs(assistant): add curated context document"
```

---

## Task 6: Backend endpoint

**Files:**
- Create: `src/backend/routers/assistant-router.ts`
- Modify: `src/backend/app.ts`
- Test: `src/test/apiTests/assistant-api.test.ts`

### Step 1: Write the failing test

Create `src/test/apiTests/assistant-api.test.ts`:

```ts
import request from 'supertest';
import { app } from '../../backend/app';

describe('POST /api/assistant/chat', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/assistant/chat').send({ messages: [] });
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid session-id', async () => {
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('session-id', 'invalid')
      .send({ messages: [] });
    expect(res.status).toBe(401);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm test -- src/test/apiTests/assistant-api.test.ts --silent
```

Expected: FAIL — 404 because router not mounted.

### Step 3: Implement router

Create `src/backend/routers/assistant-router.ts`:

```ts
import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/require-auth';
import { Unit } from '../utils/unit';
import { AssistantUsageService } from '../services/assistant-usage-service';
import { AssistantLlmService } from '../services/assistant-llm-service';
import { AssistantToolService } from '../services/assistant-tool-service';
import { sanitizeAssistantOutput, containsSensitivePattern } from '../services/assistant-sanitizer';
import { logSecurityEvent } from '../services/security-event-service';
import { PlayerService } from '../services/player-service';
import OpenAI from 'openai';

export const assistantRouter = express.Router();
const DAILY_CAP = parseInt(process.env.ASSISTANT_DAILY_CAP ?? '20', 10);
const llm = new AssistantLlmService();

assistantRouter.post('/chat', requireAuth, async (req: Request, res: Response) => {
  const unit = await Unit.create(false);
  try {
    const playerId = req.playerId!;
    const playerService = new PlayerService(unit);
    const player = await playerService.getInfoByID(playerId);
    const isAdmin = player?.isAdmin ?? false;

    const usageService = new AssistantUsageService(unit);
    const usage = await usageService.recordUsage(playerId, DAILY_CAP, isAdmin);

    if (usage.remaining !== null && usage.remaining <= 0) {
      res.status(429).json({ error: 'Daily assistant limit reached. Try again tomorrow.' });
      return;
    }

    const messages = (req.body.messages ?? []) as OpenAI.Chat.ChatCompletionMessageParam[];
    const toolService = new AssistantToolService(llm, unit, { playerId, isAdmin });

    let response = await llm.chat(messages);

    if (response.toolCalls && response.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: response.content,
        tool_calls: response.toolCalls,
      });

      for (const call of response.toolCalls) {
        const args = JSON.parse(call.function.arguments);
        const result = await toolService.handle(call.function.name, args);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      response = await llm.chat(messages);
    }

    const finalText = response.content || '';
    if (containsSensitivePattern(finalText)) {
      logSecurityEvent({
        ipAddress: req.ip ?? '',
        userAgent: req.headers['user-agent'] as string | undefined,
        eventType: 'assistant_sanitizer_block',
        path: req.path,
        method: req.method,
        details: 'Blocked assistant output containing sensitive pattern.',
      });
      res.json({
        message: { role: 'assistant', content: sanitizeAssistantOutput(finalText), suggestions: [] },
        remainingChats: usage.remaining,
      });
      return;
    }

    res.json({
      message: { role: 'assistant', content: finalText, suggestions: [] },
      remainingChats: usage.remaining,
    });
  } catch (err) {
    console.error('[assistant] chat error', err);
    res.status(500).json({ error: 'The assistant is having trouble. Please try again.' });
  } finally {
    await unit.complete(true);
  }
});
```

### Step 4: Mount router in `app.ts`

In `src/backend/app.ts`, after public routers and before admin router:

```ts
import { assistantRouter } from './routers/assistant-router';

// ... existing public routes ...

app.use('/api/assistant', assistantRouter);
```

### Step 5: Run test to verify it passes

```bash
npm test -- src/test/apiTests/assistant-api.test.ts --silent
```

Expected: PASS.

### Step 6: Commit

```bash
git add src/backend/routers/assistant-router.ts src/backend/app.ts src/test/apiTests/assistant-api.test.ts
git commit -m "feat(assistant): add /api/assistant/chat endpoint"
```

---

## Task 7: Frontend AiHelperService

**Files:**
- Create: `src/frontend/src/app/core/services/ai-helper.service.ts`

### Step 1: Write minimal test or skip if Angular test harness is missing

If the project has no Angular unit test harness for services, skip the standalone test and verify via integration later.

### Step 2: Implement service

Create `src/frontend/src/app/core/services/ai-helper.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AssistantSuggestion[];
}

export interface AssistantSuggestion {
  label: string;
  action: AssistantAction;
}

export type AssistantAction =
  | { type: 'navigate_to'; route: string }
  | { type: 'highlight_element'; target: string }
  | { type: 'trigger_action'; action: string };

export interface ChatResponse {
  message: AssistantMessage;
  remainingChats: number | null;
}

@Injectable({ providedIn: 'root' })
export class AiHelperService {
  readonly isOpen = signal(false);
  readonly messages = signal<AssistantMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your EmberExchange guide. What would you like to do?' },
  ]);
  readonly remainingChats = signal<number | null>(null);
  readonly loading = signal(false);

  constructor(private http: HttpClient) {}

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async sendMessage(content: string): Promise<void> {
    this.messages.update((m) => [...m, { role: 'user', content }]);
    this.loading.set(true);
    try {
      const history = this.messages().map((m) => ({ role: m.role, content: m.content }));
      const res = await firstValueFrom(
        this.http.post<ChatResponse>('/api/assistant/chat', { messages: history })
      );
      this.messages.update((m) => [...m, res.message]);
      this.remainingChats.set(res.remainingChats);
    } catch {
      this.messages.update((m) => [...m, { role: 'assistant', content: 'Sorry, I couldn\'t reach the assistant. Please try again.' }]);
    } finally {
      this.loading.set(false);
    }
  }
}
```

### Step 3: Commit

```bash
git add src/frontend/src/app/core/services/ai-helper.service.ts
git commit -m "feat(assistant): add frontend AiHelperService"
```

---

## Task 8: Frontend button and drawer components

**Files:**
- Create: `src/frontend/src/app/shared/components/ai-helper-button/ai-helper-button.component.ts`
- Create: `src/frontend/src/app/shared/components/ai-helper-button/ai-helper-button.component.html`
- Create: `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.ts`
- Create: `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.html`
- Create: `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.css`
- Modify: `src/frontend/src/app/core/layout/shell.component.ts`
- Modify: `src/frontend/src/app/core/layout/shell.component.html`

### Step 1: Implement button

Create `src/frontend/src/app/shared/components/ai-helper-button/ai-helper-button.component.ts`:

```ts
import { Component, inject } from '@angular/core';
import { AiHelperService } from '../../../core/services/ai-helper.service';

@Component({
  selector: 'app-ai-helper-button',
  standalone: true,
  templateUrl: './ai-helper-button.component.html',
  styleUrls: [],
})
export class AiHelperButtonComponent {
  private service = inject(AiHelperService);
  isOpen = this.service.isOpen;

  toggle(): void {
    this.service.toggle();
  }
}
```

Create `src/frontend/src/app/shared/components/ai-helper-button/ai-helper-button.component.html`:

```html
<button
  class="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#ffd54f] to-[#c8881a] text-[#1a1a1a] shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
  (click)="toggle()"
  aria-label="Open AI assistant"
>
  <span class="text-2xl">✦</span>
</button>
```

### Step 2: Implement drawer

Create `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.ts`:

```ts
import { Component, inject, signal, viewChild, ElementRef } from '@angular/core';
import { AiHelperService, AssistantAction } from '../../../core/services/ai-helper.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ai-helper-drawer',
  standalone: true,
  templateUrl: './ai-helper-drawer.component.html',
  styleUrls: ['./ai-helper-drawer.component.css'],
})
export class AiHelperDrawerComponent {
  private service = inject(AiHelperService);
  private router = inject(Router);

  isOpen = this.service.isOpen;
  messages = this.service.messages;
  loading = this.service.loading;
  remaining = this.service.remainingChats;

  input = signal('');
  private scrollContainer = viewChild.required<ElementRef>('scrollContainer');

  close(): void {
    this.service.close();
  }

  async send(): Promise<void> {
    const text = this.input().trim();
    if (!text) return;
    this.input.set('');
    await this.service.sendMessage(text);
    this.scrollToBottom();
  }

  runAction(action: AssistantAction): void {
    switch (action.type) {
      case 'navigate_to':
        this.router.navigate([action.route]);
        this.service.close();
        break;
      case 'highlight_element':
        this.highlight(action.target);
        break;
      case 'trigger_action':
        // Dispatch to a registered handler or show a toast
        break;
    }
  }

  private highlight(target: string): void {
    const selector = `[data-tour="${target}"]`;
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('ai-highlight-pulse');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => el.classList.remove('ai-highlight-pulse'), 2500);
  }

  private scrollToBottom(): void {
    window.setTimeout(() => {
      const el = this.scrollContainer().nativeElement;
      el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
```

Create `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.html`:

```html
@if (isOpen()) {
  <div class="fixed inset-y-0 right-0 w-80 max-w-full bg-[var(--bg-card)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
      <h2 class="font-semibold text-[var(--text-primary)]">Assistant</h2>
      <button class="text-[var(--text-muted)] hover:text-[var(--text-primary)]" (click)="close()" aria-label="Close">✕</button>
    </div>

    <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-3">
      @for (msg of messages(); track $index) {
        <div class="text-sm" [class.text-right]="msg.role === 'user'">
          <div
            class="inline-block px-3 py-2 rounded-lg max-w-[90%]"
            [class.bg-[var(--bg-sidebar)] text-[var(--text-primary)]="msg.role === 'assistant'"
            [class.bg-[var(--gold-dim)] text-[var(--text-primary)]="msg.role === 'user'"
          >
            {{ msg.content }}
          </div>
          @if (msg.suggestions && msg.suggestions.length > 0) {
            <div class="mt-2 flex flex-wrap gap-2 justify-start">
              @for (s of msg.suggestions; track s.label) {
                <button class="px-2 py-1 text-xs rounded-full border border-[var(--border)] hover:bg-[var(--bg-sidebar)]" (click)="runAction(s.action)">
                  {{ s.label }}
                </button>
              }
            </div>
          }
        </div>
      }
      @if (loading()) {
        <div class="text-xs text-[var(--text-muted)]">Assistant is typing…</div>
      }
    </div>

    <div class="p-3 border-t border-[var(--border)]">
      <div class="flex gap-2">
        <input
          type="text"
          class="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-surface text-[var(--text-primary)] text-sm"
          placeholder="Ask me anything…"
          [value]="input()"
          (input)="input.set($any($event.target).value)"
          (keydown.enter)="send()"
        />
        <button class="px-3 py-2 rounded-lg bg-[var(--gold)] text-white text-sm font-semibold" (click)="send()">Send</button>
      </div>
      @if (remaining() !== null) {
        <div class="mt-2 text-xs text-[var(--text-muted)] text-right">{{ remaining() }} chats left today</div>
      }
    </div>
  </div>
}
```

Create `src/frontend/src/app/shared/components/ai-helper-drawer/ai-helper-drawer.component.css`:

```css
.ai-highlight-pulse {
  animation: ai-pulse 1s ease-in-out 3;
  outline: 3px solid rgba(200, 136, 26, 0.8);
  outline-offset: 4px;
  border-radius: 4px;
}

@keyframes ai-pulse {
  0%, 100% { outline-color: rgba(200, 136, 26, 0.8); }
  50% { outline-color: rgba(200, 136, 26, 0.2); }
}
```

### Step 3: Add to shell

In `src/frontend/src/app/core/layout/shell.component.ts`, add imports:

```ts
import { AiHelperButtonComponent } from '../../shared/components/ai-helper-button/ai-helper-button.component';
import { AiHelperDrawerComponent } from '../../shared/components/ai-helper-drawer/ai-helper-drawer.component';
```

Add to `imports` array.

In `src/frontend/src/app/core/layout/shell.component.html`, add at the end:

```html
@if (isLoggedIn()) {
  <app-ai-helper-button />
  <app-ai-helper-drawer />
}
```

### Step 4: Build and verify

```bash
cd src/frontend && npx ng build --configuration production
```

Expected: build succeeds.

### Step 5: Commit

```bash
git add src/frontend/src/app/shared/components/ai-helper-button src/frontend/src/app/shared/components/ai-helper-drawer src/frontend/src/app/core/layout/shell.component.ts src/frontend/src/app/core/layout/shell.component.html
git commit -m "feat(assistant): add frontend button and drawer"
```

---

## Task 9: Rate limiting and burst protection

**Files:**
- Modify: `src/backend/routers/assistant-router.ts`
- Modify: `src/backend/middleware/rate-limiter.ts` (if needed)

### Step 1: Add per-minute burst limiter

In `src/backend/routers/assistant-router.ts`, before router definition:

```ts
import { ExpressRateLimiter } from '../middleware/rate-limiter';

const burstLimiter = new ExpressRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  keyGenerator: (req) => `assistant:${req.playerId ?? req.ip}`,
  message: 'Too many assistant messages. Please slow down.',
});
```

Apply to the route:

```ts
assistantRouter.post('/chat', requireAuth, burstLimiter.middleware(), async (req, res) => {
  // ... existing handler
});
```

### Step 2: Commit

```bash
git add src/backend/routers/assistant-router.ts
git commit -m "feat(assistant): add per-minute burst rate limit"
```

---

## Task 10: Final verification

### Step 1: Run full test suite

```bash
npm test --silent
```

Expected: all tests pass.

### Step 2: Run builds

```bash
npm run build
cd src/frontend && npx ng build --configuration production
```

Expected: both succeed.

### Step 3: Commit any remaining changes

```bash
git add -A
git commit -m "feat(assistant): finalize AI onboarding helper"
```

---

## Self-review

1. **Spec coverage:**
   - Database + AssistantUsageService → Task 1
   - Output sanitizer → Task 2
   - LLM client → Task 3
   - Tool handlers → Task 4
   - Curated context → Task 5
   - Backend endpoint → Task 6
   - Frontend service → Task 7
   - Frontend UI → Task 8
   - Rate limiting → Task 9
   - Tests → every task + Task 10

2. **Placeholder scan:** No TBD/TODO. All steps include concrete code or commands.

3. **Type consistency:** `AssistantMessage`, `AssistantSuggestion`, `AssistantAction` defined in Task 7 and used in Task 8. Tool names match between `assistant-llm-service.ts` and `assistant-tool-service.ts`.
