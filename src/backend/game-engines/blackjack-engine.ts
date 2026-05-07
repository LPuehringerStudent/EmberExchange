import { GameEngine, EngineResult, PlayerAction, ValidAction } from "./types";
import { RoomPlayerRow } from "../../shared/model";
import {
  BlackjackState,
  BlackjackPhase,
  BlackjackPlayerState,
  BlackjackStateView,
  Card,
} from "../game-logic/blackjack-types";
import {
  createDeck,
  shuffleDeck,
  handValue,
  isBlackjack,
  isBust,
  canSplit,
  canDouble,
  dealerShouldHit,
  handName,
} from "../game-logic/blackjack-utils";

const DEFAULT_BET = 20;

export class BlackJackEngine implements GameEngine {
  gameType = "blackjack";
  minPlayers = 1;
  maxPlayers = 6;

  createInitialState(players: RoomPlayerRow[]): Record<string, unknown> {
    const state: BlackjackState = {
      status: "active",
      phase: "betting",
      deck: shuffleDeck(createDeck()),
      dealerHand: [],
      players: players.map((p) => ({
        playerId: p.playerId,
        username: p.username,
        hands: [[]],
        bets: [0],
        stack: p.coins ?? 1000, // starting stack from player coins
        result: "playing",
      })),
      activePlayer: -1,
      activeHandIndex: 0,
      currentBet: DEFAULT_BET,
      log: [],
    };
    return state as unknown as Record<string, unknown>;
  }

  processAction(
    fullState: Record<string, unknown>,
    action: PlayerAction,
    playerId: number
  ): EngineResult {
    const state = this._cloneState(fullState);

    // Validate player exists
    const player = state.players.find((p) => p.playerId === playerId);
    if (!player) {
      return this._invalid("Player not in game", fullState);
    }

    // Validate phase
    if (state.phase === "settled") {
      return this._invalid("Hand is settled", fullState);
    }

    // Handle next_hand meta-action
    if (action.type === "next_hand") {
      return this._invalid(
        "Use resetForNextHand instead",
        fullState
      );
    }

    // Handle bet action
    if (action.type === "bet") {
      if (state.phase !== "betting") {
        return this._invalid("Not in betting phase", fullState);
      }
      const amount = action.amount ?? state.currentBet;
      if (amount <= 0) {
        return this._invalid("Bet must be positive", fullState);
      }
      if (amount > player.stack) {
        return this._invalid("Insufficient stack", fullState);
      }
      player.bets[0] = amount;
      player.stack -= amount;
      state.log.push({
        playerId,
        action: "bet",
        amount,
        timestamp: Date.now(),
      });

      // If all players have bet, deal cards
      if (state.players.every((p) => p.bets[0] > 0)) {
        this._dealCards(state);
      }

      return this._success(state);
    }

    // Player turn actions
    if (state.phase !== "player_turn") {
      return this._invalid("Not your turn phase", fullState);
    }
    if (state.activePlayer !== playerId) {
      return this._invalid("Not your turn", fullState);
    }

    const handIdx = state.activeHandIndex;
    const hand = player.hands[handIdx];

    switch (action.type) {
      case "hit": {
        hand.push(state.deck.pop()!);
        state.log.push({
          playerId,
          action: "hit",
          handIndex: handIdx,
          timestamp: Date.now(),
        });
        if (isBust(hand)) {
          this._advanceToNextPlayerOrDealer(state);
        }
        break;
      }

      case "stand": {
        state.log.push({
          playerId,
          action: "stand",
          handIndex: handIdx,
          timestamp: Date.now(),
        });
        this._advanceToNextPlayerOrDealer(state);
        break;
      }

      case "double": {
        if (!canDouble(hand)) {
          return this._invalid("Can only double on first two cards", fullState);
        }
        const bet = player.bets[handIdx];
        if (bet > player.stack) {
          return this._invalid("Insufficient stack to double", fullState);
        }
        player.bets[handIdx] = bet * 2;
        player.stack -= bet;
        hand.push(state.deck.pop()!);
        state.log.push({
          playerId,
          action: "double",
          amount: bet,
          handIndex: handIdx,
          timestamp: Date.now(),
        });
        this._advanceToNextPlayerOrDealer(state);
        break;
      }

      case "split": {
        if (!canSplit(hand)) {
          return this._invalid("Can only split a pair", fullState);
        }
        const bet = player.bets[handIdx];
        if (bet > player.stack) {
          return this._invalid("Insufficient stack to split", fullState);
        }
        player.stack -= bet;
        const cardA = hand[0];
        const cardB = hand[1];
        player.hands[handIdx] = [cardA, state.deck.pop()!];
        player.hands.splice(handIdx + 1, 0, [cardB, state.deck.pop()!]);
        player.bets.splice(handIdx + 1, 0, bet);
        state.log.push({
          playerId,
          action: "split",
          handIndex: handIdx,
          timestamp: Date.now(),
        });
        // After split, continue with the first new hand
        break;
      }

      default:
        return this._invalid(`Unknown action: ${action.type}`, fullState);
    }

    return this._success(state);
  }

  getPlayerView(
    fullState: Record<string, unknown>,
    playerId: number
  ): Record<string, unknown> {
    const state = fullState as unknown as BlackjackState;
    const validActions = this.getValidActions(fullState, playerId);

    const view: BlackjackStateView = {
      status: state.status,
      phase: state.phase,
      dealerHand:
        state.phase === "settled" || state.phase === "dealer_turn"
          ? state.dealerHand
          : this._maskDealerHand(state.dealerHand),
      players: state.players.map((p) => ({
        playerId: p.playerId,
        username: p.username,
        hands: p.hands,
        bets: p.bets,
        stack: p.stack,
        result: p.result,
      })),
      activePlayer: state.activePlayer,
      activeHandIndex: state.activeHandIndex,
      currentBet: state.currentBet,
      validActions,
      log: state.log,
      winners: state.winners,
    };
    return view as unknown as Record<string, unknown>;
  }

  getValidActions(
    fullState: Record<string, unknown>,
    playerId: number
  ): ValidAction[] {
    const state = fullState as unknown as BlackjackState;
    const player = state.players.find((p) => p.playerId === playerId);
    if (!player) return [];

    if (state.phase === "betting") {
      return [
        {
          type: "bet",
          amount: state.currentBet,
          minAmount: state.currentBet,
          maxAmount: player.stack,
        },
      ];
    }

    if (
      state.phase !== "player_turn" ||
      state.activePlayer !== playerId
    ) {
      return [];
    }

    const handIdx = state.activeHandIndex;
    const hand = player.hands[handIdx];
    const actions: ValidAction[] = [
      { type: "hit" },
      { type: "stand" },
    ];

    if (canDouble(hand) && player.bets[handIdx] <= player.stack) {
      actions.push({ type: "double" });
    }

    if (canSplit(hand) && player.bets[handIdx] <= player.stack) {
      actions.push({ type: "split" });
    }

    return actions;
  }

  resetForNextHand(
    fullState: Record<string, unknown>,
    players: RoomPlayerRow[]
  ): Record<string, unknown> {
    const state = fullState as unknown as BlackjackState;

    const newState: BlackjackState = {
      status: "active",
      phase: "betting",
      deck: shuffleDeck(createDeck()),
      dealerHand: [],
      players: state.players
        .filter((p) => players.some((rp) => rp.playerId === p.playerId))
        .map((p) => ({
          playerId: p.playerId,
          username:
            players.find((rp) => rp.playerId === p.playerId)?.username ??
            p.username,
          hands: [[]],
          bets: [0],
          stack: p.stack,
          result: "playing",
        })),
      activePlayer: -1,
      activeHandIndex: 0,
      currentBet: state.currentBet,
      log: [],
    };

    return newState as unknown as Record<string, unknown>;
  }

  // --- Private helpers ---

  private _cloneState(
    state: Record<string, unknown>
  ): BlackjackState {
    return JSON.parse(JSON.stringify(state)) as BlackjackState;
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

  private _success(state: BlackjackState): EngineResult {
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

  private _dealCards(state: BlackjackState): void {
    // Deal 2 cards to each player
    for (const player of state.players) {
      player.hands[0] = [state.deck.pop()!, state.deck.pop()!];
      if (isBlackjack(player.hands[0])) {
        player.result = "blackjack";
      }
    }
    // Deal 2 to dealer
    state.dealerHand = [state.deck.pop()!, state.deck.pop()!];

    state.phase = "player_turn";

    // Find first player who isn't blackjack
    const firstPlayer = state.players.find((p) => p.result !== "blackjack");
    if (firstPlayer) {
      state.activePlayer = firstPlayer.playerId;
      state.activeHandIndex = 0;
    } else {
      // All players have blackjack — skip to dealer
      this._playDealer(state);
    }
  }

  private _advanceToNextPlayerOrDealer(state: BlackjackState): void {
    const currentPlayer = state.players.find(
      (p) => p.playerId === state.activePlayer
    );
    if (!currentPlayer) {
      this._playDealer(state);
      return;
    }

    // Check if there are more hands for this player (split)
    if (state.activeHandIndex < currentPlayer.hands.length - 1) {
      state.activeHandIndex++;
      return;
    }

    // Find next player who still has hands to act
    const currentIdx = state.players.findIndex(
      (p) => p.playerId === state.activePlayer
    );
    for (let i = currentIdx + 1; i < state.players.length; i++) {
      const nextPlayer = state.players[i];
      if (nextPlayer.result === "playing") {
        state.activePlayer = nextPlayer.playerId;
        state.activeHandIndex = 0;
        return;
      }
    }

    // No more players — dealer's turn
    this._playDealer(state);
  }

  private _playDealer(state: BlackjackState): void {
    state.phase = "dealer_turn";
    state.activePlayer = -1;

    // If all players busted, dealer doesn't need to play
    const anyPlayerAlive = state.players.some(
      (p) =>
        p.result === "playing" ||
        p.result === "blackjack"
    );

    if (anyPlayerAlive) {
      // Reveal hole card (already in state, just advance phase)
      while (dealerShouldHit(state.dealerHand)) {
        state.dealerHand.push(state.deck.pop()!);
      }
    }

    this._settle(state);
  }

  private _settle(state: BlackjackState): void {
    state.phase = "settled";
    const dealerTotal = handValue(state.dealerHand);
    const dealerBust = dealerTotal.bust;
    const dealerBlackjack = dealerTotal.blackjack;
    state.winners = [];

    for (const player of state.players) {
      for (let i = 0; i < player.hands.length; i++) {
        const hand = player.hands[i];
        const bet = player.bets[i];
        const hv = handValue(hand);

        if (player.result === "blackjack") {
          if (dealerBlackjack) {
            player.result = "push";
            player.stack += bet; // return bet
          } else {
            player.result = "won";
            const payout = Math.floor(bet * 2.5); // 3:2 payout
            player.stack += payout;
            state.winners.push({
              playerId: player.playerId,
              amount: payout - bet,
              handName: "Blackjack",
            });
          }
          continue;
        }

        if (hv.bust) {
          player.result = "bust";
          // bet already taken
          continue;
        }

        if (dealerBust) {
          player.result = "won";
          const payout = bet * 2;
          player.stack += payout;
          state.winners.push({
            playerId: player.playerId,
            amount: bet,
            handName: handName(hand),
          });
          continue;
        }

        const dTotal = dealerTotal.total;
        const pTotal = hv.total;

        if (pTotal > dTotal) {
          player.result = "won";
          const payout = bet * 2;
          player.stack += payout;
          state.winners.push({
            playerId: player.playerId,
            amount: bet,
            handName: handName(hand),
          });
        } else if (pTotal < dTotal) {
          player.result = "lost";
          // bet already taken
        } else {
          player.result = "push";
          player.stack += bet; // return bet
        }
      }
    }
  }

  private _maskDealerHand(hand: Card[]): Card[] {
    if (hand.length === 0) return [];
    if (hand.length === 1) return [hand[0]];
    return [hand[0], "back"];
  }
}
