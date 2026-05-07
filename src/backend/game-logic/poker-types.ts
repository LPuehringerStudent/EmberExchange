export type Card = string; // e.g. "Ah", "Td", "2s"

export type PokerPhase =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

export interface PokerPlayerState {
  playerId: number;
  username?: string;
  hand: Card[];
  stack: number;
  bet: number; // amount committed in current betting round
  totalBet: number; // total amount contributed this hand (for side pots)
  folded: boolean;
  allIn: boolean;
}

export interface PokerPot {
  amount: number;
  eligiblePlayers: number[]; // playerIds who can win this pot
}

export interface PokerState {
  status: "active"; // backward compatibility with generic state blob consumers
  phase: PokerPhase;
  deck: Card[];
  communityCards: Card[];
  pots: PokerPot[];
  currentBet: number; // current bet to call
  dealerPosition: number; // index into players array
  activePlayer: number; // playerId whose turn it is
  players: PokerPlayerState[];
  playersToAct: number[]; // playerIds who still need to act this betting round
  log: Array<{
    playerId: number;
    action: string;
    amount?: number;
    timestamp: number;
  }>;
  winners?: Array<{ playerId: number; amount: number; handName: string }>;
}

export interface PokerAction {
  type: "fold" | "check" | "call" | "raise" | "all_in";
  amount?: number;
}

export interface ValidActionHint {
  type: string;
  amount?: number;
  minAmount?: number;
  maxAmount?: number;
}

export interface PokerStateView {
  status: "active"; // backward compatibility
  phase: PokerPhase;
  communityCards: Card[];
  pots: PokerPot[];
  currentBet: number;
  dealerPosition: number;
  activePlayer: number;
  players: Array<{
    playerId: number;
    username?: string;
    hand: Card[] | ["back", "back"]; // masked for opponents
    handName?: string; // best 5-card hand name (e.g. "Two Pair", "Flush")
    stack: number;
    bet: number;
    totalBet: number;
    folded: boolean;
    allIn: boolean;
  }>;
  validActions: ValidActionHint[];
  log: PokerState["log"];
  winners?: PokerState["winners"];
}

export interface EngineResult {
  valid: boolean;
  errorMessage?: string;
  newFullState?: Record<string, unknown>;
  playerViews?: Map<number, Record<string, unknown>>;
}
