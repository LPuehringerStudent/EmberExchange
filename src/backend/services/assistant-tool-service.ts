import { AssistantLlmService } from './assistant-llm-service';
import { Unit } from '../utils/unit';

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

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

  async handle(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'navigate_to':
        return this.navigateTo(requireString(args, 'route'));
      case 'highlight_element':
        return { target: requireString(args, 'target'), selector: this.targetToSelector(requireString(args, 'target')) };
      case 'trigger_action':
        return { action: requireString(args, 'action'), acknowledged: true };
      case 'get_player_summary':
        return await this.getPlayerSummary();
      case 'divine_intervention':
        return await this.divineIntervention(requireString(args, 'question'));
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
    const stmt = this.unit.prepare<{ coins: number; sparks: number }, { playerId: number }>(
      `SELECT coins, sparks FROM Player WHERE playerId = @playerId`,
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
