import { BlackJackEngine } from "../../backend/game-engines/blackjack-engine";
import { BlackjackState } from "../../backend/game-logic/blackjack-types";
import { RoomPlayerRow } from "../../shared/model";

describe("BlackJack Engine edge cases", () => {
  const engine = new BlackJackEngine();

  const players: RoomPlayerRow[] = [
    { roomPlayerId: "rp1", roomId: "r1", playerId: 1, username: "Alice", connectionState: "connected", seatIndex: 0 },
    { roomPlayerId: "rp2", roomId: "r1", playerId: 2, username: "Bob", connectionState: "connected", seatIndex: 1 },
  ];

  function makeState(overrides: Partial<BlackjackState> = {}): BlackjackState {
    return {
      status: "active",
      phase: "player_turn",
      deck: ["2c", "3c", "4c", "5c", "6c"],
      dealerHand: ["9h", "7d"],
      players: [
        {
          playerId: 1,
          username: "Alice",
          activeTitle: null,
          activeBanner: null,
          hands: [["Ah", "Kd"]],
          bets: [20],
          stack: 980,
          result: "blackjack",
        },
        {
          playerId: 2,
          username: "Bob",
          activeTitle: null,
          activeBanner: null,
          hands: [["Th", "8d"]],
          bets: [20],
          stack: 980,
          result: "playing",
        },
      ],
      activePlayer: 2,
      activeHandIndex: 0,
      currentBet: 20,
      log: [],
      ...overrides,
    };
  }

  test("natural blackjack pays 3:2 after another player finishes the hand", () => {
    const result = engine.processAction(
      makeState() as unknown as Record<string, unknown>,
      { type: "stand" },
      2
    );

    expect(result.valid).toBe(true);
    const state = result.newFullState as unknown as BlackjackState;
    const blackjackPlayer = state.players.find((p) => p.playerId === 1)!;

    expect(state.phase).toBe("settled");
    expect(blackjackPlayer.result).toBe("won");
    expect(blackjackPlayer.stack).toBe(1030);
    expect(state.winners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 1,
          amount: 30,
          handName: "Blackjack",
        }),
      ])
    );
  });

  test("next hand action is rejected during active play", () => {
    const state = makeState();
    const result = engine.processAction(
      state as unknown as Record<string, unknown>,
      { type: "next_hand" },
      2
    );

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toBe("Use resetForNextHand instead");
    expect(result.newFullState).toBe(state);
  });

  test("reset keeps only players still present in the room", () => {
    const state = makeState({
      phase: "settled",
      activePlayer: -1,
      players: [
        { ...makeState().players[0], stack: 1250, result: "won" },
        { ...makeState().players[1], stack: 0, result: "lost" },
      ],
    });

    const nextState = engine.resetForNextHand(
      state as unknown as Record<string, unknown>,
      [players[0]]
    ) as unknown as BlackjackState;

    expect(nextState.players).toHaveLength(1);
    expect(nextState.players[0]).toEqual(
      expect.objectContaining({
        playerId: 1,
        username: "Alice",
        stack: 1250,
        hands: [[]],
        bets: [0],
        result: "playing",
      })
    );
  });
});
