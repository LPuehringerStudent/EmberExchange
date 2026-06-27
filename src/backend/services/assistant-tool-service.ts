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
