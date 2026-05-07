import { GameEngine, EngineResult, PlayerAction } from "./types";
import {
  PokerState,
  PokerPlayerState,
  PokerPhase,
  PokerStateView,
} from "../game-logic/poker-types";
import {
  createDeck,
  shuffleDeck,
  dealHands,
  dealCommunityCards,
  evaluateHand,
  getHandName,
} from "../game-logic/poker-utils";
import { RoomPlayerRow } from "../../shared/model";

const STARTING_STACK = 1000;
const SMALL_BLIND = 10;
const BIG_BLIND = 20;

export class PokerEngine implements GameEngine {
  gameType = "poker";
  minPlayers = 2;
  maxPlayers = 6;

  createInitialState(players: RoomPlayerRow[]): Record<string, unknown> {
    return this._createHandState(players, 0, STARTING_STACK);
  }

  resetForNextHand(
    fullState: Record<string, unknown>,
    players: RoomPlayerRow[]
  ): Record<string, unknown> {
    const prevState = fullState as unknown as PokerState;
    const prevPlayerMap = new Map(prevState.players.map((p) => [p.playerId, p]));

    // Keep only players with chips who are still in the room
    const eligible = players.filter(
      (p) => (prevPlayerMap.get(p.playerId)?.stack ?? 0) > 0
    );

    if (eligible.length < this.minPlayers) {
      return {
        status: "waiting",
        phase: "waiting",
        deck: [],
        communityCards: [],
        pots: [],
        currentBet: 0,
        dealerPosition: prevState.dealerPosition,
        activePlayer: -1,
        players: prevState.players.map((p) => ({
          ...p,
          hand: [],
          bet: 0,
          totalBet: 0,
          folded: false,
          allIn: false,
        })),
        playersToAct: [],
        log: [
          ...prevState.log,
          { playerId: -1, action: "game_over", timestamp: Date.now() },
        ],
      } as unknown as Record<string, unknown>;
    }

    const nextDealer =
      (prevState.dealerPosition + 1) % prevState.players.length;
    return this._createHandState(
      eligible,
      nextDealer,
      undefined,
      prevState
    );
  }

  private _createHandState(
    players: RoomPlayerRow[],
    dealerPosition: number,
    fallbackStack?: number,
    prevState?: PokerState
  ): Record<string, unknown> {
    const deck = shuffleDeck(createDeck());
    const { hands, remaining } = dealHands(deck, players.length);

    const pokerPlayers: PokerPlayerState[] = players.map((p, i) => ({
      playerId: p.playerId,
      username: p.username,
      hand: hands[i],
      stack:
        prevState?.players.find((op) => op.playerId === p.playerId)?.stack ??
        fallbackStack ??
        STARTING_STACK,
      bet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
    }));

    const { sb, bb } = this._getBlindIndices(dealerPosition, players.length);
    const sbPlayer = pokerPlayers[sb];
    const bbPlayer = pokerPlayers[bb];

    // Post small blind
    const sbAmount = Math.min(SMALL_BLIND, sbPlayer.stack);
    sbPlayer.stack -= sbAmount;
    sbPlayer.bet = sbAmount;
    sbPlayer.totalBet = sbAmount;
    if (sbPlayer.stack === 0) sbPlayer.allIn = true;

    // Post big blind
    const bbAmount = Math.min(BIG_BLIND, bbPlayer.stack);
    bbPlayer.stack -= bbAmount;
    bbPlayer.bet = bbAmount;
    bbPlayer.totalBet = bbAmount;
    if (bbPlayer.stack === 0) bbPlayer.allIn = true;

    const firstActor = this._getFirstToActPreflop(
      dealerPosition,
      players.length
    );

    const state: PokerState = {
      status: "active",
      phase: "preflop",
      deck: remaining,
      communityCards: [],
      pots: [
        {
          amount: sbAmount + bbAmount,
          eligiblePlayers: players.map((p) => p.playerId),
        },
      ],
      currentBet: bbAmount,
      dealerPosition,
      activePlayer: pokerPlayers[firstActor].playerId,
      players: pokerPlayers,
      playersToAct: pokerPlayers
        .filter((p) => !p.folded && !p.allIn)
        .map((p) => p.playerId),
      log: prevState
        ? [
            ...prevState.log,
            { playerId: -1, action: "new_hand", timestamp: Date.now() },
          ]
        : [],
    };

    return state as unknown as Record<string, unknown>;
  }

  private _getBlindIndices(
    dealerPosition: number,
    playerCount: number
  ): { sb: number; bb: number } {
    if (playerCount === 2) {
      return {
        sb: dealerPosition,
        bb: (dealerPosition + 1) % playerCount,
      };
    }
    return {
      sb: (dealerPosition + 1) % playerCount,
      bb: (dealerPosition + 2) % playerCount,
    };
  }

  private _getFirstToActPreflop(
    dealerPosition: number,
    playerCount: number
  ): number {
    if (playerCount === 2) {
      // Heads-up: dealer (SB) acts first
      return dealerPosition;
    }
    // Multiway: UTG (player after BB) acts first
    return (dealerPosition + 3) % playerCount;
  }

  private _getFirstToActPostflop(
    dealerPosition: number,
    playerCount: number
  ): number {
    if (playerCount === 2) {
      // Heads-up: dealer (SB) acts first
      return dealerPosition;
    }
    // Multiway: SB acts first
    return (dealerPosition + 1) % playerCount;
  }

  processAction(
    fullState: Record<string, unknown>,
    action: PlayerAction,
    playerId: number
  ): EngineResult {
    const state = this._cloneState(fullState as unknown as PokerState);
    const player = state.players.find((p) => p.playerId === playerId);

    if (!player) {
      return {
        valid: false,
        errorMessage: "Player not in game",
        newFullState: fullState,
        playerViews: new Map(),
      };
    }

    if (state.phase === "showdown" || state.phase === "waiting") {
      return {
        valid: false,
        errorMessage: "Game is not active",
        newFullState: fullState,
        playerViews: new Map(),
      };
    }

    if (player.folded || player.allIn) {
      return {
        valid: false,
        errorMessage: "Player cannot act",
        newFullState: fullState,
        playerViews: new Map(),
      };
    }

    if (state.activePlayer !== playerId) {
      return {
        valid: false,
        errorMessage: "Not your turn",
        newFullState: fullState,
        playerViews: new Map(),
      };
    }

    const toCall = state.currentBet - player.bet;

    switch (action.type) {
      case "fold": {
        player.folded = true;
        state.playersToAct = state.playersToAct.filter(
          (pid) => pid !== playerId
        );
        state.log.push({
          playerId,
          action: "fold",
          timestamp: Date.now(),
        });
        break;
      }

      case "check": {
        if (toCall > 0) {
          return {
            valid: false,
            errorMessage: "Cannot check, must call or raise",
            newFullState: fullState,
            playerViews: new Map(),
          };
        }
        state.playersToAct = state.playersToAct.filter(
          (pid) => pid !== playerId
        );
        state.log.push({
          playerId,
          action: "check",
          timestamp: Date.now(),
        });
        break;
      }

      case "call": {
        const callAmount = Math.min(toCall, player.stack);
        player.stack -= callAmount;
        player.bet += callAmount;
        player.totalBet += callAmount;
        state.pots[0].amount += callAmount;
        if (player.stack === 0) {
          player.allIn = true;
        }
        state.playersToAct = state.playersToAct.filter(
          (pid) => pid !== playerId
        );
        state.log.push({
          playerId,
          action: "call",
          amount: callAmount,
          timestamp: Date.now(),
        });
        break;
      }

      case "raise": {
        const raiseAmount = action.amount ?? 0;
        const totalNeeded = toCall + raiseAmount;

        if (raiseAmount <= 0) {
          return {
            valid: false,
            errorMessage: "Raise amount must be positive",
            newFullState: fullState,
            playerViews: new Map(),
          };
        }

        if (totalNeeded > player.stack) {
          return {
            valid: false,
            errorMessage: "Insufficient stack",
            newFullState: fullState,
            playerViews: new Map(),
          };
        }

        player.stack -= totalNeeded;
        player.bet += totalNeeded;
        player.totalBet += totalNeeded;
        state.pots[0].amount += totalNeeded;
        state.currentBet = player.bet;
        if (player.stack === 0) {
          player.allIn = true;
        }
        state.playersToAct = state.playersToAct.filter(
          (pid) => pid !== playerId
        );
        // Re-open action for others who haven't folded or gone all-in
        state.playersToAct.push(
          ...state.players
            .filter(
              (p) =>
                !p.folded && !p.allIn && p.playerId !== playerId
            )
            .map((p) => p.playerId)
        );
        state.log.push({
          playerId,
          action: "raise",
          amount: totalNeeded,
          timestamp: Date.now(),
        });
        break;
      }

      case "all_in": {
        const allInAmount = player.stack;
        player.stack = 0;
        player.bet += allInAmount;
        player.totalBet += allInAmount;
        const wasRaise = player.bet > state.currentBet;
        if (wasRaise) {
          state.currentBet = player.bet;
        }
        player.allIn = true;
        state.pots[0].amount += allInAmount;
        state.playersToAct = state.playersToAct.filter(
          (pid) => pid !== playerId
        );
        if (wasRaise) {
          state.playersToAct.push(
            ...state.players
              .filter(
                (p) =>
                  !p.folded && !p.allIn && p.playerId !== playerId
              )
              .map((p) => p.playerId)
          );
        }
        state.log.push({
          playerId,
          action: "all_in",
          amount: allInAmount,
          timestamp: Date.now(),
        });
        break;
      }

      default: {
        return {
          valid: false,
          errorMessage: `Unknown action: ${action.type}`,
          newFullState: fullState,
          playerViews: new Map(),
        };
      }
    }

    // Check if only one player remains (others folded)
    const activePlayers = state.players.filter((p) => !p.folded);
    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      winner.stack += state.pots[0].amount;
      state.pots[0].amount = 0;
      state.winners = [
        {
          playerId: winner.playerId,
          amount: state.pots[0].amount,
          handName: "Fold",
        },
      ];
      state.phase = "showdown";
      state.activePlayer = -1;

      const playerViews = this._buildAllPlayerViews(state);
      return {
        valid: true,
        newFullState: state as unknown as Record<string, unknown>,
        playerViews,
      };
    }

    // Check if betting round is complete or find next active player
    if (this._isBettingRoundComplete(state)) {
      this._advancePhase(state);
    } else {
      const currentIndex = state.players.findIndex(
        (p) => p.playerId === playerId
      );
      const nextIndex = this._getNextActivePlayerIndex(
        state.players,
        currentIndex
      );
      if (nextIndex !== -1) {
        state.activePlayer = state.players[nextIndex].playerId;
      } else {
        this._advancePhase(state);
      }
    }

    const playerViews = this._buildAllPlayerViews(state);
    return {
      valid: true,
      newFullState: state as unknown as Record<string, unknown>,
      playerViews,
    };
  }

  getValidActions(
    fullState: Record<string, unknown>,
    playerId: number
  ): Array<{ type: string; amount?: number; minAmount?: number; maxAmount?: number }> {
    const state = fullState as unknown as PokerState;
    const player = state.players.find((p) => p.playerId === playerId);
    if (!player || player.folded || player.allIn || state.activePlayer !== playerId) {
      return [];
    }

    const toCall = state.currentBet - player.bet;
    const actions: Array<{ type: string; amount?: number; minAmount?: number; maxAmount?: number }> = [
      { type: "fold" },
    ];

    if (toCall === 0) {
      actions.push({ type: "check" });
    }

    if (toCall > 0 && player.stack >= toCall) {
      actions.push({ type: "call", amount: toCall });
    }

    if (player.stack > toCall) {
      const minRaise = toCall + BIG_BLIND;
      actions.push({
        type: "raise",
        minAmount: Math.min(minRaise, player.stack),
        maxAmount: player.stack,
      });
    }

    if (player.stack > 0) {
      actions.push({ type: "all_in", amount: player.stack });
    }

    return actions;
  }

  getPlayerView(
    fullState: Record<string, unknown>,
    playerId: number
  ): Record<string, unknown> {
    const state = fullState as unknown as PokerState;
    const validActions =
      state.activePlayer === playerId && state.phase !== "showdown" && state.phase !== "waiting"
        ? this.getValidActions(fullState, playerId)
        : [];

    const view: PokerStateView = {
      status: state.status,
      phase: state.phase,
      communityCards: state.communityCards,
      pots: state.pots,
      currentBet: state.currentBet,
      dealerPosition: state.dealerPosition,
      activePlayer: state.activePlayer,
      players: state.players.map((p) => {
        const showHand = p.playerId === playerId || state.phase === "showdown";
        const handName =
          showHand && state.communityCards.length >= 3
            ? getHandName(evaluateHand([...p.hand, ...state.communityCards]))
            : undefined;
        return {
          playerId: p.playerId,
          username: p.username,
          hand: showHand ? p.hand : (["back", "back"] as ["back", "back"]),
          handName,
          stack: p.stack,
          bet: p.bet,
          totalBet: p.totalBet,
          folded: p.folded,
          allIn: p.allIn,
        };
      }),
      validActions,
      log: state.log,
      winners: state.winners,
    };
    return view as unknown as Record<string, unknown>;
  }

  private _cloneState(state: PokerState): PokerState {
    return JSON.parse(JSON.stringify(state)) as PokerState;
  }

  private _getNextActivePlayerIndex(
    players: PokerPlayerState[],
    fromIndex: number
  ): number {
    for (let i = 1; i <= players.length; i++) {
      const idx = (fromIndex + i) % players.length;
      const p = players[idx];
      if (!p.folded && !p.allIn) {
        return idx;
      }
    }
    return -1;
  }

  private _isBettingRoundComplete(state: PokerState): boolean {
    const contenders = state.players.filter((p) => !p.folded);
    if (contenders.length <= 1) return true;

    // All non-folded players are all-in
    if (contenders.every((p) => p.allIn)) return true;

    // Check if anyone still needs to act
    const stillNeedToAct = state.playersToAct.filter((pid) => {
      const p = state.players.find((pl) => pl.playerId === pid);
      return p && !p.folded && !p.allIn;
    });
    if (stillNeedToAct.length > 0) return false;

    // All non-folded players must have matching bets (or be all-in)
    const activeBets = contenders.map((p) => p.bet);
    const maxBet = Math.max(...activeBets);
    return contenders.every((p) => p.bet === maxBet || p.allIn);
  }

  private _advancePhase(state: PokerState): void {
    // Reset bets for the new betting round
    for (const p of state.players) {
      p.bet = 0;
    }
    state.currentBet = 0;

    // Everyone needs to act in the new betting round
    state.playersToAct = state.players
      .filter((p) => !p.folded && !p.allIn)
      .map((p) => p.playerId);

    switch (state.phase) {
      case "preflop": {
        const deal = dealCommunityCards(state.deck, 3);
        state.communityCards = deal.cards;
        state.deck = deal.remaining;
        state.phase = "flop";
        break;
      }
      case "flop": {
        const deal = dealCommunityCards(state.deck, 1);
        state.communityCards.push(...deal.cards);
        state.deck = deal.remaining;
        state.phase = "turn";
        break;
      }
      case "turn": {
        const deal = dealCommunityCards(state.deck, 1);
        state.communityCards.push(...deal.cards);
        state.deck = deal.remaining;
        state.phase = "river";
        break;
      }
      case "river": {
        state.phase = "showdown";
        this._resolveShowdown(state);
        state.activePlayer = -1;
        return;
      }
      default:
        return;
    }

    // If all non-folded players are all-in, fast-forward to showdown
    const nonFolded = state.players.filter((p) => !p.folded);
    const allAllIn = nonFolded.length > 0 && nonFolded.every((p) => p.allIn);
    if (allAllIn) {
      this._advancePhase(state);
      return;
    }

    // Set first active player for new phase
    const firstIndex = this._getFirstToActPostflop(
      state.dealerPosition,
      state.players.length
    );
    if (firstIndex !== -1) {
      let idx = firstIndex;
      for (let i = 0; i < state.players.length; i++) {
        const candidate = state.players[(idx + i) % state.players.length];
        if (!candidate.folded && !candidate.allIn) {
          state.activePlayer = candidate.playerId;
          return;
        }
      }
    }

    // No valid actor found
    state.activePlayer = -1;
  }

  private _resolveShowdown(state: PokerState): void {
    const contenders = state.players.filter((p) => !p.folded);
    if (contenders.length === 0) return;

    // Build side pots from totalBet contributions
    const sidePots = this._buildSidePots(state);
    state.pots = sidePots.length > 0 ? sidePots : state.pots;

    const winners: Array<{ playerId: number; amount: number; handName: string }> = [];

    for (const pot of state.pots) {
      if (pot.amount === 0) continue;

      const eligible = contenders.filter((p) =>
        pot.eligiblePlayers.includes(p.playerId)
      );
      if (eligible.length === 0) continue;

      // Evaluate all eligible hands
      const scored = eligible.map((p) => ({
        player: p,
        score: evaluateHand([...p.hand, ...state.communityCards]),
      }));
      const bestScore = Math.max(...scored.map((s) => s.score));
      const potWinners = scored.filter((s) => s.score === bestScore).map((s) => s.player);

      const share = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount % potWinners.length;

      for (let i = 0; i < potWinners.length; i++) {
        const won = share + (i < remainder ? 1 : 0);
        potWinners[i].stack += won;
        winners.push({
          playerId: potWinners[i].playerId,
          amount: won,
          handName: getHandName(bestScore),
        });
      }

      pot.amount = 0;
    }

    state.winners = winners;
  }

  private _buildSidePots(state: PokerState): Array<{
    amount: number;
    eligiblePlayers: number[];
  }> {
    // Sort all players by totalBet ascending
    const sorted = [...state.players].sort((a, b) => a.totalBet - b.totalBet);
    const pots: Array<{ amount: number; eligiblePlayers: number[] }> = [];
    let prevBet = 0;

    for (const player of sorted) {
      if (player.totalBet === prevBet) continue;

      const diff = player.totalBet - prevBet;
      const contributors = state.players.filter(
        (p) => p.totalBet >= player.totalBet
      ).length;
      const amount = diff * contributors;

      const eligiblePlayers = state.players
        .filter((p) => !p.folded && p.totalBet >= player.totalBet)
        .map((p) => p.playerId);

      if (amount > 0 && eligiblePlayers.length > 0) {
        pots.push({ amount, eligiblePlayers });
      }
      prevBet = player.totalBet;
    }

    return pots;
  }

  private _buildAllPlayerViews(state: PokerState): Map<number, Record<string, unknown>> {
    const views = new Map<number, Record<string, unknown>>();
    for (const p of state.players) {
      views.set(
        p.playerId,
        this.getPlayerView(state as unknown as Record<string, unknown>, p.playerId)
      );
    }
    return views;
  }
}
