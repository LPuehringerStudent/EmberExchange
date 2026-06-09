import { RouletteEngine, RouletteState } from "../../backend/game-engines/roulette-engine";
import { RoomPlayerRow } from "../../shared/model";

describe("Roulette Engine edge cases", () => {
  const engine = new RouletteEngine();

  const players: RoomPlayerRow[] = [
    { playerId: 1, username: "Alice", coins: 1000, activeTitle: null, activeBanner: null } as RoomPlayerRow,
    { playerId: 2, username: "Bob", coins: 1000, activeTitle: null, activeBanner: null } as RoomPlayerRow,
  ];

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function bet(
    state: Record<string, unknown>,
    betType: string,
    amount = 10,
    number?: number
  ): Record<string, unknown> {
    return engine.processAction(state, { type: "bet", betType, amount, number }, 1)
      .newFullState;
  }

  test("controlled red odd low straight dozen and column bets pay correctly", () => {
    jest.spyOn(Math, "random").mockReturnValue(7 / 37);
    let state = engine.createInitialState(players);

    state = bet(state, "red");
    state = bet(state, "odd");
    state = bet(state, "low");
    state = bet(state, "straight", 10, 7);
    state = bet(state, "dozen1");
    state = bet(state, "column1");

    const result = engine.processAction(state, { type: "spin" }, 1);

    expect(result.valid).toBe(true);
    const settled = result.newFullState as unknown as RouletteState;
    const player = settled.players.find((p) => p.playerId === 1)!;

    expect(settled.winningNumber).toBe(7);
    expect(settled.winningColor).toBe("red");
    expect(player.result).toBe("won");
    expect(player.stack).toBe(1420);
    expect(settled.winners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ betType: "straight", amount: 350 }),
        expect.objectContaining({ betType: "dozen1", amount: 20 }),
        expect.objectContaining({ betType: "column1", amount: 20 }),
      ])
    );
  });

  test("zero only pays green straight bets and loses even-money outside bets", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    let state = engine.createInitialState(players);

    state = bet(state, "straight", 10, 0);
    state = bet(state, "red");
    state = bet(state, "black");
    state = bet(state, "even");
    state = bet(state, "odd");
    state = bet(state, "high");
    state = bet(state, "low");

    const settled = engine.processAction(state, { type: "spin" }, 1)
      .newFullState as unknown as RouletteState;
    const player = settled.players.find((p) => p.playerId === 1)!;

    expect(settled.winningNumber).toBe(0);
    expect(settled.winningColor).toBe("green");
    expect(player.result).toBe("won");
    expect(player.stack).toBe(1290);
    expect(settled.winners).toEqual([
      { playerId: 1, amount: 350, betType: "straight" },
    ]);
  });

  test("invalid bet type and out-of-range straight bets keep the original state", () => {
    const state = engine.createInitialState(players);

    const invalidType = engine.processAction(
      state,
      { type: "bet", amount: 10, betType: "split" },
      1
    );
    const invalidNumber = engine.processAction(
      state,
      { type: "bet", amount: 10, betType: "straight", number: 37 },
      1
    );

    expect(invalidType.valid).toBe(false);
    expect(invalidType.errorMessage).toBe("Invalid bet type: split");
    expect(invalidType.newFullState).toBe(state);
    expect(invalidNumber.valid).toBe(false);
    expect(invalidNumber.errorMessage).toBe("Straight bet requires an integer number 0-36");
    expect(invalidNumber.newFullState).toBe(state);
  });
});
