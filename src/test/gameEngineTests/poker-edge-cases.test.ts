import { PokerEngine } from "../../backend/game-engines/poker-engine";
import { PokerState } from "../../backend/game-logic/poker-types";

describe("PokerEngine edge cases", () => {
  const engine = new PokerEngine();

  function makeRiverState(overrides: Partial<PokerState> = {}): PokerState {
    return {
      status: "active",
      phase: "river",
      deck: ["2c", "3d", "4h"],
      communityCards: ["Ah", "Kh", "Qh", "Jh", "2s"],
      pots: [{ amount: 200, eligiblePlayers: [1, 2] }],
      currentBet: 0,
      dealerPosition: 0,
      activePlayer: 1,
      players: [
        {
          playerId: 1,
          username: "Alice",
          activeTitle: null,
          activeBanner: null,
          hand: ["Th", "3c"],
          stack: 900,
          bet: 0,
          totalBet: 100,
          folded: false,
          allIn: false,
        },
        {
          playerId: 2,
          username: "Bob",
          activeTitle: null,
          activeBanner: null,
          hand: ["As", "Ad"],
          stack: 900,
          bet: 0,
          totalBet: 100,
          folded: false,
          allIn: false,
        },
      ],
      playersToAct: [1],
      log: [],
      ...overrides,
    };
  }

  test("river check resolves showdown and awards the pot to the best hand", () => {
    const result = engine.processAction(
      makeRiverState() as unknown as Record<string, unknown>,
      { type: "check" },
      1
    );

    expect(result.valid).toBe(true);
    const state = result.newFullState as unknown as PokerState;

    expect(state.phase).toBe("showdown");
    expect(state.activePlayer).toBe(-1);
    expect(state.players.find((p) => p.playerId === 1)?.stack).toBe(1100);
    expect(state.players.find((p) => p.playerId === 2)?.stack).toBe(900);
    expect(state.pots[0].amount).toBe(0);
    expect(state.winners).toEqual([
      { playerId: 1, amount: 200, handName: "Straight Flush" },
    ]);
  });

  test("showdown player views reveal hands and include hand names", () => {
    const state = engine.processAction(
      makeRiverState() as unknown as Record<string, unknown>,
      { type: "check" },
      1
    ).newFullState as unknown as PokerState;

    const view = engine.getPlayerView(
      state as unknown as Record<string, unknown>,
      2
    ) as unknown as { players: Array<{ playerId: number; hand: string[]; handName?: string }> };

    expect(view.players.find((p) => p.playerId === 1)?.hand).toEqual(["Th", "3c"]);
    expect(view.players.find((p) => p.playerId === 1)?.handName).toBe("Straight Flush");
    expect(view.players.find((p) => p.playerId === 2)?.hand).toEqual(["As", "Ad"]);
    expect(view.players.find((p) => p.playerId === 2)?.handName).toBe("Three of a Kind");
  });

  test("folded and all-in players cannot act even if state points at them", () => {
    const foldedState = makeRiverState({
      players: [
        { ...makeRiverState().players[0], folded: true },
        makeRiverState().players[1],
      ],
    });

    const foldedResult = engine.processAction(
      foldedState as unknown as Record<string, unknown>,
      { type: "check" },
      1
    );

    expect(foldedResult.valid).toBe(false);
    expect(foldedResult.errorMessage).toBe("Player cannot act");

    const allInState = makeRiverState({
      players: [
        { ...makeRiverState().players[0], allIn: true },
        makeRiverState().players[1],
      ],
    });

    const allInResult = engine.processAction(
      allInState as unknown as Record<string, unknown>,
      { type: "check" },
      1
    );

    expect(allInResult.valid).toBe(false);
    expect(allInResult.errorMessage).toBe("Player cannot act");
  });
});
