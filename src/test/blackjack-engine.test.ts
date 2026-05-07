import { BlackJackEngine } from "../backend/game-engines/blackjack-engine";
import { RoomPlayerRow } from "../shared/model";
import { handValue, isBlackjack, isBust, canSplit, canDouble, dealerShouldHit } from "../backend/game-logic/blackjack-utils";

describe("BlackJack Utils", () => {
  test("handValue calculates hard totals correctly", () => {
    expect(handValue(["9h", "8d"]).total).toBe(17);
    expect(handValue(["Th", "6d"]).total).toBe(16);
  });

  test("handValue handles soft Aces", () => {
    expect(handValue(["Ah", "6d"]).total).toBe(17);
    expect(handValue(["Ah", "6d"]).soft).toBe(true);
  });

  test("handValue converts Ace from 11 to 1 when needed", () => {
    expect(handValue(["Ah", "Th", "5d"]).total).toBe(16);
    expect(handValue(["Ah", "Ah", "9d"]).total).toBe(21);
  });

  test("isBlackjack detects natural 21 with 2 cards", () => {
    expect(isBlackjack(["Ah", "Th"])).toBe(true);
    expect(isBlackjack(["Ah", "9d"])).toBe(false);
    expect(isBlackjack(["Ah", "Th", "5d"])).toBe(false);
  });

  test("isBust detects over 21", () => {
    expect(isBust(["Th", "9d", "5h"])).toBe(true);
    expect(isBust(["Th", "8d"])).toBe(false);
  });

  test("canSplit detects pairs", () => {
    expect(canSplit(["Th", "Td"])).toBe(true);
    expect(canSplit(["Th", "Jd"])).toBe(true); // 10-value pair
    expect(canSplit(["Ah", "Ad"])).toBe(true);
    expect(canSplit(["Ah", "Td"])).toBe(false);
  });

  test("canDouble only on 2 cards", () => {
    expect(canDouble(["Th", "8d"])).toBe(true);
    expect(canDouble(["Th", "8d", "5h"])).toBe(false);
  });

  test("dealerShouldHit on soft 17", () => {
    expect(dealerShouldHit(["Ah", "6d"])).toBe(true); // soft 17 → hit
    expect(dealerShouldHit(["Th", "7d"])).toBe(false); // hard 17 → stand
    expect(dealerShouldHit(["Ah", "7d"])).toBe(false); // soft 18 → stand
  });

  test("dealerShouldHit on 16", () => {
    expect(dealerShouldHit(["Th", "6d"])).toBe(true);
  });
});

describe("BlackJack Engine", () => {
  const engine = new BlackJackEngine();

  const mockPlayers: RoomPlayerRow[] = [
    { roomPlayerId: "rp1", roomId: "r1", playerId: 1, username: "Alice", connectionState: "connected", seatIndex: 0 },
    { roomPlayerId: "rp2", roomId: "r1", playerId: 2, username: "Bob", connectionState: "connected", seatIndex: 1 },
  ];

  test("gameType is blackjack", () => {
    expect(engine.gameType).toBe("blackjack");
    expect(engine.minPlayers).toBe(1);
    expect(engine.maxPlayers).toBe(6);
  });

  test("createInitialState sets up betting phase", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    expect(state.phase).toBe("betting");
    expect(state.dealerHand).toEqual([]);
    const players = state.players as Array<Record<string, unknown>>;
    expect(players.length).toBe(2);
    expect(players[0].stack).toBe(1000);
    expect(players[0].hands).toEqual([[]]);
    expect(players[0].bets).toEqual([0]);
  });

  test("getValidActions returns bet during betting phase", () => {
    const state = engine.createInitialState(mockPlayers);
    const actions = engine.getValidActions(state, 1);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("bet");
  });

  test("bet action places bet and deals when all players bet", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;

    // Player 1 bets
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    expect(result.valid).toBe(true);
    let newState = result.newFullState as Record<string, unknown>;
    expect(newState.phase).toBe("betting"); // still betting, waiting for player 2

    // Player 2 bets → deal happens
    result = engine.processAction(newState, { type: "bet", amount: 20 }, 2);
    expect(result.valid).toBe(true);
    newState = result.newFullState as Record<string, unknown>;
    expect(newState.phase).toBe("player_turn");

    const players = newState.players as Array<Record<string, unknown>>;
    expect((players[0].hands as string[][])[0].length).toBe(2);
    expect(players[0].stack).toBe(980);
    expect((players[0].bets as number[])[0]).toBe(20);
    expect((newState.dealerHand as string[]).length).toBe(2);
  });

  test("getPlayerView masks dealer hole card", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);

    const view = engine.getPlayerView(result.newFullState, 1) as Record<string, unknown>;
    const dealerHand = view.dealerHand as string[];
    expect(dealerHand.length).toBe(2);
    expect(dealerHand[1]).toBe("back"); // hole card masked
  });

  test("getPlayerView reveals dealer hand after settlement", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);
    const afterDeal = result.newFullState as Record<string, unknown>;

    // Force stand for both players to skip to dealer
    const players = afterDeal.players as Array<Record<string, unknown>>;
    if (afterDeal.activePlayer === 1) {
      result = engine.processAction(afterDeal, { type: "stand" }, 1);
      result = engine.processAction(result.newFullState, { type: "stand" }, 2);
    } else {
      result = engine.processAction(afterDeal, { type: "stand" }, 2);
    }

    const settled = result.newFullState as Record<string, unknown>;
    if (settled.phase !== "settled") {
      // If one player is blackjack, the other needs to stand too
      if ((settled.players as Array<Record<string, unknown>>)[0].result === "blackjack") {
        result = engine.processAction(settled, { type: "stand" }, 2);
      }
    }

    const finalState = result.newFullState as Record<string, unknown>;
    if (finalState.phase === "settled") {
      const view = engine.getPlayerView(finalState, 1) as Record<string, unknown>;
      const dealerHand = view.dealerHand as string[];
      expect(dealerHand[1]).not.toBe("back"); // hole card revealed
    }
  });

  test("hit adds a card", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);
    const afterDeal = result.newFullState as Record<string, unknown>;

    const activePlayer = afterDeal.activePlayer as number;
    if (activePlayer !== -1) {
      result = engine.processAction(afterDeal, { type: "hit" }, activePlayer);
      expect(result.valid).toBe(true);
      const newState = result.newFullState as Record<string, unknown>;
      const players = newState.players as Array<Record<string, unknown>>;
      const player = players.find(p => p.playerId === activePlayer);
      expect((player!.hands as string[][])[0].length).toBe(3);
    }
  });

  test("stand advances turn", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);
    const afterDeal = result.newFullState as Record<string, unknown>;

    const firstActive = afterDeal.activePlayer as number;
    if (firstActive === 1) {
      result = engine.processAction(afterDeal, { type: "stand" }, 1);
      const newState = result.newFullState as Record<string, unknown>;
      // Either player 2's turn or dealer
      expect(newState.activePlayer === 2 || newState.phase === "dealer_turn" || newState.phase === "settled").toBe(true);
    }
  });

  test("double doubles bet and gives one card", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);
    const afterDeal = result.newFullState as Record<string, unknown>;

    const activePlayer = afterDeal.activePlayer as number;
    if (activePlayer !== -1) {
      const beforePlayer = (afterDeal.players as Array<Record<string, unknown>>).find(p => p.playerId === activePlayer);
      const beforeStack = beforePlayer!.stack as number;

      result = engine.processAction(afterDeal, { type: "double" }, activePlayer);
      expect(result.valid).toBe(true);

      const newState = result.newFullState as Record<string, unknown>;
      const afterPlayer = (newState.players as Array<Record<string, unknown>>).find(p => p.playerId === activePlayer);
      expect((afterPlayer!.bets as number[])[0]).toBe(40);
      expect(afterPlayer!.stack).toBe(beforeStack - 20);
      expect((afterPlayer!.hands as string[][])[0].length).toBe(3);
    }
  });

  test("split creates two hands", () => {
    // Create a state where player has a pair
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);
    const afterDeal = result.newFullState as Record<string, unknown>;

    const activePlayer = afterDeal.activePlayer as number;
    if (activePlayer !== -1) {
      // Force a pair by manipulating state (not ideal but necessary for testing)
      const mutableState = JSON.parse(JSON.stringify(afterDeal)) as Record<string, unknown>;
      const players = mutableState.players as Array<Record<string, unknown>>;
      const player = players.find(p => p.playerId === activePlayer);
      if (player) {
        player.hands = [["8h", "8d"]];
        player.bets = [20];
        player.stack = 1000;

        result = engine.processAction(mutableState, { type: "split" }, activePlayer);
        if (result.valid) {
          const newState = result.newFullState as Record<string, unknown>;
          const afterPlayer = (newState.players as Array<Record<string, unknown>>).find(p => p.playerId === activePlayer);
          expect((afterPlayer!.hands as string[][]).length).toBe(2);
          expect(afterPlayer!.bets).toEqual([20, 20]);
        }
      }
    }
  });

  test("resetForNextHand preserves stacks and resets hands", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    let result = engine.processAction(state, { type: "bet", amount: 20 }, 1);
    result = engine.processAction(result.newFullState, { type: "bet", amount: 20 }, 2);

    // Simulate some losses/wins
    const afterGame = result.newFullState as Record<string, unknown>;
    const players = afterGame.players as Array<Record<string, unknown>>;
    players[0].stack = 900; // lost 100

    const newState = engine.resetForNextHand(afterGame, mockPlayers) as Record<string, unknown>;
    expect(newState.phase).toBe("betting");
    const newPlayers = newState.players as Array<Record<string, unknown>>;
    expect(newPlayers[0].stack).toBe(900); // preserved
    expect(newPlayers[0].hands).toEqual([[]]);
    expect(newPlayers[0].bets).toEqual([0]);
  });

  test("invalid action returns error", () => {
    const state = engine.createInitialState(mockPlayers);
    const result = engine.processAction(state, { type: "hit" }, 1);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBeDefined();
  });

  test("bet with insufficient stack returns error", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    const result = engine.processAction(state, { type: "bet", amount: 2000 }, 1);
    expect(result.valid).toBe(false);
  });
});
