import { GameEngine, EngineResult, PlayerAction, ValidAction } from "./types";
import { RoomPlayerRow } from "../../shared/model";

// European roulette number colors
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getNumberColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

function isEven(n: number): boolean {
  return n !== 0 && n % 2 === 0;
}

function isHigh(n: number): boolean {
  return n >= 19 && n <= 36;
}

function getColumn(n: number): 1 | 2 | 3 | null {
  if (n === 0) return null;
  const col = ((n - 1) % 3) + 1;
  return col as 1 | 2 | 3;
}

function getDozen(n: number): 1 | 2 | 3 | null {
  if (n === 0) return null;
  if (n <= 12) return 1;
  if (n <= 24) return 2;
  return 3;
}

export type RoulettePhase = "betting" | "spinning" | "settled";

export interface RouletteBet {
  playerId: number;
  betType: string;
  number?: number;
  amount: number;
}

export interface RoulettePlayer {
  playerId: number;
  username?: string;
  activeTitle?: { titleId?: string; label: string; animation?: string } | null;
  activeBanner?: { bannerId?: number; name: string; cssClass?: string } | null;
  stack: number;
  bets: RouletteBet[];
  result: "won" | "lost" | "playing";
}

export interface RouletteState {
  status: string;
  phase: RoulettePhase;
  players: RoulettePlayer[];
  winningNumber: number | null;
  winningColor: "red" | "black" | "green" | null;
  bets: RouletteBet[];
  log: Array<{ playerId: number; action: string; timestamp: number; details?: Record<string, unknown> }>;
  winners: Array<{ playerId: number; amount: number; betType: string }>;
  activePlayer: number;
}

export class RouletteEngine implements GameEngine {
  gameType = "roulette";
  minPlayers = 1;
  maxPlayers = 6;

  createInitialState(players: RoomPlayerRow[]): Record<string, unknown> {
    const state: RouletteState = {
      status: "active",
      phase: "betting",
      players: players.map((p) => ({
        playerId: p.playerId,
        username: p.username,
        activeTitle: p.activeTitle ?? null,
        activeBanner: p.activeBanner ?? null,
        stack: p.coins ?? 1000,
        bets: [],
        result: "playing",
      })),
      winningNumber: null,
      winningColor: null,
      bets: [],
      log: [],
      winners: [],
      activePlayer: -1,
    };
    return state as unknown as Record<string, unknown>;
  }

  processAction(
    fullState: Record<string, unknown>,
    action: PlayerAction,
    playerId: number
  ): EngineResult {
    const state = this._cloneState(fullState);

    const player = state.players.find((p) => p.playerId === playerId);
    if (!player) {
      return this._invalid("Player not in game", fullState);
    }

    if (state.phase === "settled") {
      return this._invalid("Round is settled", fullState);
    }

    if (action.type === "next_hand") {
      return this._invalid("Use resetForNextHand instead", fullState);
    }

    if (action.type === "bet") {
      if (state.phase !== "betting") {
        return this._invalid("Can only bet during betting phase", fullState);
      }

      const amount = action.amount ?? 0;
      if (amount <= 0) {
        return this._invalid("Bet must be positive", fullState);
      }

      const totalBet = player.bets.reduce((sum, b) => sum + b.amount, 0);
      if (totalBet + amount > player.stack) {
        return this._invalid("Insufficient stack", fullState);
      }

      const betType = action.betType ?? "";
      const number = action.number;

      if (!betType) {
        return this._invalid("Missing bet type", fullState);
      }

      // Validate bet type
      const validTypes = ["red", "black", "even", "odd", "high", "low", "straight", "dozen1", "dozen2", "dozen3", "column1", "column2", "column3"];
      if (!validTypes.includes(betType)) {
        return this._invalid(`Invalid bet type: ${betType}`, fullState);
      }

      if (betType === "straight" && (number === undefined || number < 0 || number > 36)) {
        return this._invalid("Straight bet requires a number 0-36", fullState);
      }

      player.stack -= amount;
      const bet: RouletteBet = { playerId, betType, amount };
      if (betType === "straight") bet.number = number;
      player.bets.push(bet);
      state.bets.push(bet);

      state.log.push({
        playerId,
        action: "bet",
        timestamp: Date.now(),
        details: { betType, amount, number },
      });

      return this._success(state);
    }

    if (action.type === "spin") {
      if (state.phase !== "betting") {
        return this._invalid("Can only spin during betting phase", fullState);
      }
      if (state.bets.length === 0) {
        return this._invalid("No bets placed", fullState);
      }

      state.phase = "spinning";
      state.log.push({ playerId, action: "spin", timestamp: Date.now() });

      // After a short conceptual "spin", immediately resolve
      // (the frontend shows the animation; backend just resolves)
      this._resolveSpin(state);
      return this._success(state);
    }

    return this._invalid(`Unknown action: ${action.type}`, fullState);
  }

  private _resolveSpin(state: RouletteState): void {
    state.phase = "settled";
    state.winningNumber = Math.floor(Math.random() * 37);
    state.winningColor = getNumberColor(state.winningNumber);
    state.winners = [];

    for (const p of state.players) {
      if (p.bets.length === 0) {
        p.result = "playing";
        continue;
      }

      let totalNetWin = 0;
      let anyWin = false;

      for (const bet of p.bets) {
        const won = this._betWins(bet, state.winningNumber);
        if (won) {
          const payout = this._calculatePayout(bet);
          p.stack += payout;
          const netWin = payout - bet.amount;
          totalNetWin += netWin;
          anyWin = true;
          state.winners.push({
            playerId: p.playerId,
            amount: netWin,
            betType: bet.betType,
          });
        }
      }

      p.result = anyWin ? "won" : "lost";
    }

    state.log.push({
      playerId: -1,
      action: "result",
      timestamp: Date.now(),
      details: { winningNumber: state.winningNumber, winningColor: state.winningColor },
    });
  }

  private _betWins(bet: RouletteBet, winningNumber: number): boolean {
    switch (bet.betType) {
      case "red":
        return getNumberColor(winningNumber) === "red";
      case "black":
        return getNumberColor(winningNumber) === "black";
      case "even":
        return isEven(winningNumber);
      case "odd":
        return winningNumber !== 0 && !isEven(winningNumber);
      case "high":
        return isHigh(winningNumber);
      case "low":
        return winningNumber >= 1 && winningNumber <= 18;
      case "straight":
        return winningNumber === bet.number;
      case "dozen1":
        return getDozen(winningNumber) === 1;
      case "dozen2":
        return getDozen(winningNumber) === 2;
      case "dozen3":
        return getDozen(winningNumber) === 3;
      case "column1":
        return getColumn(winningNumber) === 1;
      case "column2":
        return getColumn(winningNumber) === 2;
      case "column3":
        return getColumn(winningNumber) === 3;
      default:
        return false;
    }
  }

  private _calculatePayout(bet: RouletteBet): number {
    const base = bet.amount;
    switch (bet.betType) {
      case "straight":
        return base * 36; // 35:1 + original bet
      case "dozen1":
      case "dozen2":
      case "dozen3":
      case "column1":
      case "column2":
      case "column3":
        return base * 3; // 2:1 + original bet
      default:
        return base * 2; // 1:1 + original bet
    }
  }

  getPlayerView(
    fullState: Record<string, unknown>,
    _playerId: number
  ): Record<string, unknown> {
    const state = fullState as unknown as RouletteState;
    const validActions = this.getValidActions(fullState, _playerId);

    // In roulette, everyone sees everything (no hidden info)
    return {
      status: state.status,
      phase: state.phase,
      players: state.players.map((p) => ({
        playerId: p.playerId,
        username: p.username,
        activeTitle: p.activeTitle,
        activeBanner: p.activeBanner,
        stack: p.stack,
        bets: p.bets,
        result: p.result,
      })),
      winningNumber: state.winningNumber,
      winningColor: state.winningColor,
      bets: state.bets,
      winners: state.winners,
      validActions,
      log: state.log,
      activePlayer: state.activePlayer,
    } as unknown as Record<string, unknown>;
  }

  getValidActions(
    fullState: Record<string, unknown>,
    playerId: number
  ): ValidAction[] {
    const state = fullState as unknown as RouletteState;
    const player = state.players.find((p) => p.playerId === playerId);
    if (!player) return [];

    if (state.phase === "betting") {
      const actions: ValidAction[] = [];
      const totalBet = player.bets.reduce((sum, b) => sum + b.amount, 0);
      if (totalBet < player.stack) {
        actions.push({ type: "bet", amount: 10, minAmount: 1, maxAmount: player.stack - totalBet });
      }
      if (state.bets.length > 0) {
        actions.push({ type: "spin" });
      }
      return actions;
    }

    if (state.phase === "settled") {
      return [{ type: "next_hand" }];
    }

    return [];
  }

  resetForNextHand(
    fullState: Record<string, unknown>,
    players: RoomPlayerRow[]
  ): Record<string, unknown> {
    const state = fullState as unknown as RouletteState;

    const newState: RouletteState = {
      status: "active",
      phase: "betting",
      players: state.players
        .filter((p) => players.some((rp) => rp.playerId === p.playerId))
        .map((p) => {
          const rp = players.find((rp) => rp.playerId === p.playerId);
          return {
            playerId: p.playerId,
            username: rp?.username ?? p.username,
            activeTitle: rp?.activeTitle ?? p.activeTitle,
            activeBanner: rp?.activeBanner ?? p.activeBanner,
            stack: p.stack,
            bets: [],
            result: "playing",
          };
        }),
      winningNumber: null,
      winningColor: null,
      bets: [],
      log: [],
      winners: [],
      activePlayer: -1,
    };

    return newState as unknown as Record<string, unknown>;
  }

  // --- Private helpers ---

  private _cloneState(state: Record<string, unknown>): RouletteState {
    return JSON.parse(JSON.stringify(state)) as RouletteState;
  }

  private _invalid(
    errorMessage: string,
    fullState: Record<string, unknown>
  ): EngineResult {
    return {
      valid: false,
      errorMessage,
      newFullState: fullState,
      playerViews: new Map(),
    };
  }

  private _success(state: RouletteState): EngineResult {
    const playerViews = new Map<number, Record<string, unknown>>();
    for (const p of state.players) {
      playerViews.set(
        p.playerId,
        this.getPlayerView(
          state as unknown as Record<string, unknown>,
          p.playerId
        )
      );
    }
    return {
      valid: true,
      newFullState: state as unknown as Record<string, unknown>,
      playerViews,
    };
  }
}
