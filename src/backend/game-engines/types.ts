import { RoomPlayerRow } from "../../shared/model";

export interface PlayerAction {
  type: string;
  amount?: number;
}

export interface EngineResult {
  valid: boolean;
  errorMessage?: string;
  newFullState: Record<string, unknown>;
  playerViews: Map<number, Record<string, unknown>>;
}

export interface ValidAction {
  type: string;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface GameEngine {
  gameType: string;
  minPlayers: number;
  maxPlayers: number;

  createInitialState(players: RoomPlayerRow[]): Record<string, unknown>;

  processAction(
    fullState: Record<string, unknown>,
    action: PlayerAction,
    playerId: number
  ): EngineResult;

  getPlayerView(
    fullState: Record<string, unknown>,
    playerId: number
  ): Record<string, unknown>;

  resetForNextHand(
    fullState: Record<string, unknown>,
    players: RoomPlayerRow[]
  ): Record<string, unknown>;

  getValidActions(
    fullState: Record<string, unknown>,
    playerId: number
  ): ValidAction[];
}
