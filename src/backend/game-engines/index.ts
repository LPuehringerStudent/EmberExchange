import { GameEngine } from "./types";
import { PokerEngine } from "./poker-engine";
import { BlackJackEngine } from "./blackjack-engine";
import { RouletteEngine } from "./roulette-engine";
import { TestEngine } from "./test-engine";

class EngineRegistry {
  private engines = new Map<string, GameEngine>();

  register(engine: GameEngine): void {
    this.engines.set(engine.gameType, engine);
  }

  get(gameType: string): GameEngine {
    const engine = this.engines.get(gameType);
    if (!engine) {
      throw new Error(`No game engine registered for type: ${gameType}`);
    }
    return engine;
  }

  has(gameType: string): boolean {
    return this.engines.has(gameType);
  }
}

export const engineRegistry = new EngineRegistry();

// Register all engines
engineRegistry.register(new TestEngine());
engineRegistry.register(new PokerEngine());
engineRegistry.register(new BlackJackEngine());
engineRegistry.register(new RouletteEngine());
