import { GameEngine, EngineResult, PlayerAction, ValidAction } from "./types";
import { RoomPlayerRow } from "../../shared/model";

/**
 * TestEngine is a minimal game engine for infrastructure testing.
 * It accepts any action from any player and simply appends to a log.
 * It does not enforce turn order, betting rules, or card games.
 */
export class TestEngine implements GameEngine {
  gameType = "test";
  minPlayers = 1;
  maxPlayers = 10;

  createInitialState(players: RoomPlayerRow[]): Record<string, unknown> {
    return {
      status: "active",
      players: players.map((p) => ({
        playerId: p.playerId,
        username: p.username,
        connectionState: p.connectionState,
        seatIndex: p.seatIndex,
      })),
      log: [],
    };
  }

  processAction(
    fullState: Record<string, unknown>,
    action: PlayerAction,
    playerId: number
  ): EngineResult {
    const state = JSON.parse(JSON.stringify(fullState)) as Record<string, unknown>;
    const log = Array.isArray(state.log) ? state.log : [];
    log.push({
      playerId,
      action: action.type,
      amount: action.amount,
      timestamp: Date.now(),
    });
    state.log = log;

    const playerViews = new Map<number, Record<string, unknown>>();
    const players = (state.players as Array<{ playerId: number }>) || [];
    for (const p of players) {
      playerViews.set(p.playerId, state);
    }

    return {
      valid: true,
      newFullState: state,
      playerViews,
    };
  }

  getPlayerView(
    fullState: Record<string, unknown>,
    _playerId: number
  ): Record<string, unknown> {
    return fullState;
  }

  resetForNextHand(
    fullState: Record<string, unknown>,
    _players: RoomPlayerRow[]
  ): Record<string, unknown> {
    const state = JSON.parse(JSON.stringify(fullState)) as Record<string, unknown>;
    const log = Array.isArray(state.log) ? state.log : [];
    log.push({ action: "new_hand", timestamp: Date.now() });
    state.log = log;
    return state;
  }

  getValidActions(
    _fullState: Record<string, unknown>,
    _playerId: number
  ): ValidAction[] {
    return [
      { type: "fold" },
      { type: "check" },
      { type: "call" },
      { type: "raise" },
      { type: "all_in" },
    ];
  }
}
