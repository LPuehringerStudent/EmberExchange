export type Card = string; // e.g. "Ah", "Td", "2s" — same format as poker

export type BlackjackPhase =
  | "betting"
  | "dealing"
  | "insurance"
  | "player_turn"
  | "dealer_turn"
  | "settled";

export type HandResult =
  | "playing"
  | "bust"
  | "blackjack"
  | "won"
  | "lost"
  | "push";

export interface BlackjackPlayerState {
  playerId: number;
  username?: string;
  activeTitle?: { titleId?: string; label: string; animation?: string } | null;
  activeBanner?: { bannerId?: number; name: string; cssClass?: string } | null;
  hands: Card[][];      // supports split: each element is one hand
  bets: number[];       // bet per hand, aligned with hands[]
  stack: number;
  result: HandResult;
  insuranceBet?: number;
  handResults?: HandResult[];
}

export interface BlackjackState {
  status: "active";
  phase: BlackjackPhase;
  deck: Card[];
  dealerHand: Card[];
  players: BlackjackPlayerState[];
  activePlayer: number;       // playerId whose turn it is (-1 if none)
  activeHandIndex: number;    // which of their hands is currently acting
  currentBet: number;         // default/min bet for this table
  log: Array<{
    playerId: number;
    action: string;
    amount?: number;
    handIndex?: number;
    timestamp: number;
  }>;
  winners?: Array<{
    playerId: number;
    amount: number;
    handName: string;
  }>;
}

export interface BlackjackPlayerStateView {
  playerId: number;
  username?: string;
  activeTitle?: { titleId?: string; label: string; animation?: string } | null;
  activeBanner?: { bannerId?: number; name: string; cssClass?: string } | null;
  hands: Card[][];
  bets: number[];
  stack: number;
  result: HandResult;
  insuranceBet?: number;
  handResults?: HandResult[];
}

export interface BlackjackStateView {
  status: "active";
  phase: BlackjackPhase;
  dealerHand: Card[] | [string, string]; // masked as ["back"] for hole card
  players: BlackjackPlayerStateView[];
  activePlayer: number;
  activeHandIndex: number;
  currentBet: number;
  validActions: Array<{ type: string; amount?: number; minAmount?: number; maxAmount?: number }>;
  log: BlackjackState["log"];
  winners?: BlackjackState["winners"];
}
