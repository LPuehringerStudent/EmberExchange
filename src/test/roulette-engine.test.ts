import { RouletteEngine } from "../backend/game-engines/roulette-engine";
import { RoomPlayerRow } from "../shared/model";

describe("Roulette Engine", () => {
  const engine = new RouletteEngine();

  const mockPlayers: RoomPlayerRow[] = [
    { playerId: 1, username: "Alice", coins: 1000, activeTitle: null, activeBanner: null } as RoomPlayerRow,
    { playerId: 2, username: "Bob", coins: 1000, activeTitle: null, activeBanner: null } as RoomPlayerRow,
  ];

  test("createInitialState sets up betting phase", () => {
    const state = engine.createInitialState(mockPlayers) as Record<string, unknown>;
    expect(state.phase).toBe("betting");
    expect((state.players as Array<{stack: number}>)[0].stack).toBe(1000);
    expect(state.activePlayer).toBe(-1);
  });

  test("bet action deducts stack and records bet", () => {
    let state = engine.createInitialState(mockPlayers);
    const result = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1);
    expect(result.valid).toBe(true);

    state = result.newFullState;
    const player = (state.players as Array<{stack: number; bets: Array<{amount: number}>}>)[0];
    expect(player.stack).toBe(950);
    expect(player.bets).toHaveLength(1);
    expect(player.bets[0].amount).toBe(50);
  });

  test("multiple bets on same field are allowed", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    const result = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1);
    expect(result.valid).toBe(true);

    state = result.newFullState;
    const player = (state.players as Array<{stack: number; bets: Array<{amount: number}>}>)[0];
    expect(player.stack).toBe(900);
    expect(player.bets).toHaveLength(2);
    expect(player.bets[0].amount).toBe(50);
    expect(player.bets[1].amount).toBe(50);
  });

  test("multiple bets on different fields are allowed", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    state = engine.processAction(state, { type: "bet", amount: 30, betType: "black" }, 1).newFullState;
    state = engine.processAction(state, { type: "bet", amount: 20, betType: "straight", number: 7 }, 1).newFullState;

    const player = (state.players as Array<{stack: number; bets: Array<{amount: number; betType: string}>}>)[0];
    expect(player.stack).toBe(900);
    expect(player.bets).toHaveLength(3);
    expect(player.bets[0].betType).toBe("red");
    expect(player.bets[1].betType).toBe("black");
    expect(player.bets[2].betType).toBe("straight");
  });

  test("bet action rejects when total would exceed stack", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 600, betType: "red" }, 1).newFullState;
    const result = engine.processAction(state, { type: "bet", amount: 500, betType: "black" }, 1);
    expect(result.valid).toBe(false);
  });

  test("bet action rejects insufficient stack for first bet", () => {
    const state = engine.createInitialState(mockPlayers);
    const result = engine.processAction(state, { type: "bet", amount: 5000, betType: "red" }, 1);
    expect(result.valid).toBe(false);
  });

  test("straight bet requires number", () => {
    const state = engine.createInitialState(mockPlayers);
    const result = engine.processAction(state, { type: "bet", amount: 10, betType: "straight" }, 1);
    expect(result.valid).toBe(false);
  });

  test("spin resolves the round and sets winningNumber", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    const result = engine.processAction(state, { type: "spin" }, 1);
    expect(result.valid).toBe(true);

    state = result.newFullState;
    expect(state.phase).toBe("settled");
    expect(typeof state.winningNumber).toBe("number");
    expect(state.winningNumber).toBeGreaterThanOrEqual(0);
    expect(state.winningNumber).toBeLessThanOrEqual(36);
    expect(state.winningColor).toMatch(/red|black|green/);
  });

  test("spin rejects when no bets placed", () => {
    const state = engine.createInitialState(mockPlayers);
    const result = engine.processAction(state, { type: "spin" }, 1);
    expect(result.valid).toBe(false);
  });

  test("multiple bets resolve independently", () => {
    // Bet on red and even — if winning number is red and even, both win
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 100, betType: "red" }, 1).newFullState;
    state = engine.processAction(state, { type: "bet", amount: 100, betType: "even" }, 1).newFullState;
    state = engine.processAction(state, { type: "spin" }, 1).newFullState;

    const player = (state.players as Array<{stack: number; result: string}>)[0];
    // Stack should be either 800 (lost both), 1000 (won one), or 1200 (won both)
    expect([800, 1000, 1200]).toContain(player.stack);
    // If won at least one, result is "won"
    if (player.stack > 800) {
      expect(player.result).toBe("won");
    }
  });

  test("resetForNextHand clears bets and preserves stacks", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    state = engine.processAction(state, { type: "bet", amount: 30, betType: "black" }, 1).newFullState;
    state = engine.processAction(state, { type: "spin" }, 1).newFullState;

    const stackBefore = (state.players as Array<{stack: number}>)[0].stack;

    state = engine.resetForNextHand(state, mockPlayers);
    expect(state.phase).toBe("betting");
    expect(state.winningNumber).toBeNull();
    expect(state.bets).toHaveLength(0);
    expect((state.players as Array<{stack: number}>)[0].stack).toBe(stackBefore);
    expect((state.players as Array<{bets: unknown[]}>)[0].bets).toHaveLength(0);
  });

  test("getValidActions returns bet during betting", () => {
    const state = engine.createInitialState(mockPlayers);
    const actions = engine.getValidActions(state, 1);
    expect(actions.some((a) => a.type === "bet")).toBe(true);
    expect(actions.some((a) => a.type === "spin")).toBe(false);
  });

  test("getValidActions returns spin when bets exist", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    const actions = engine.getValidActions(state, 1);
    expect(actions.some((a) => a.type === "spin")).toBe(true);
    expect(actions.some((a) => a.type === "bet")).toBe(true);
  });

  test("getValidActions removes bet when stack exhausted", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 1000, betType: "red" }, 1).newFullState;
    const actions = engine.getValidActions(state, 1);
    expect(actions.some((a) => a.type === "bet")).toBe(false);
    expect(actions.some((a) => a.type === "spin")).toBe(true);
  });

  test("getValidActions returns next_hand after settlement", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    state = engine.processAction(state, { type: "spin" }, 1).newFullState;
    const actions = engine.getValidActions(state, 1);
    expect(actions.some((a) => a.type === "next_hand")).toBe(true);
  });

  test("player view has no hidden info", () => {
    let state = engine.createInitialState(mockPlayers);
    state = engine.processAction(state, { type: "bet", amount: 50, betType: "red" }, 1).newFullState;
    const view1 = engine.getPlayerView(state, 1);
    const view2 = engine.getPlayerView(state, 2);
    const { validActions: _a1, ...rest1 } = view1;
    const { validActions: _a2, ...rest2 } = view2;
    expect(rest1).toEqual(rest2);
  });

  test("engine properties are correct", () => {
    expect(engine.gameType).toBe("roulette");
    expect(engine.minPlayers).toBe(1);
    expect(engine.maxPlayers).toBe(6);
  });
});
