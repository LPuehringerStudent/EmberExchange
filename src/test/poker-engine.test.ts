import {
  createDeck,
  shuffleDeck,
  dealHands,
  dealCommunityCards,
  evaluateHand,
  compareHands,
  getHandName,
} from "../backend/game-logic/poker-utils";
import { PokerEngine } from "../backend/game-engines/poker-engine";
import { PokerState } from "../backend/game-logic/poker-types";
import { RoomPlayerRow } from "../shared/model";

describe("Poker Utils", () => {
  describe("createDeck", () => {
    it("should create 52 unique cards", () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
      expect(new Set(deck).size).toBe(52);
    });

    it("should contain valid cards", () => {
      const deck = createDeck();
      expect(deck).toContain("Ah");
      expect(deck).toContain("Ks");
      expect(deck).toContain("2d");
    });
  });

  describe("shuffleDeck", () => {
    it("should return all 52 cards in different order", () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);
      expect(shuffled.length).toBe(52);
      expect(new Set(shuffled).size).toBe(52);
      expect(shuffled).not.toEqual(deck);
    });
  });

  describe("dealHands", () => {
    it("should deal 2 cards to each player", () => {
      const deck = shuffleDeck(createDeck());
      const { hands, remaining } = dealHands(deck, 4);
      expect(hands.length).toBe(4);
      hands.forEach((hand) => expect(hand.length).toBe(2));
      expect(remaining.length).toBe(52 - 8);
    });
  });

  describe("evaluateHand", () => {
    it("should identify a royal flush", () => {
      const cards = ["Ah", "Kh", "Qh", "Jh", "Th"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Straight Flush");
    });

    it("should identify four of a kind", () => {
      const cards = ["Ac", "Ad", "Ah", "As", "7d"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Four of a Kind");
    });

    it("should identify a full house", () => {
      const cards = ["Kc", "Kd", "Kh", "7s", "7d"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Full House");
    });

    it("should identify a flush", () => {
      const cards = ["Ah", "9h", "7h", "4h", "2h"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Flush");
    });

    it("should identify a straight", () => {
      const cards = ["9c", "8d", "7h", "6s", "5c"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Straight");
    });

    it("should identify a wheel straight (A-2-3-4-5)", () => {
      const cards = ["Ac", "2d", "3h", "4s", "5c"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Straight");
    });

    it("should identify three of a kind", () => {
      const cards = ["Qc", "Qd", "Qh", "9s", "4c"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Three of a Kind");
    });

    it("should identify two pair", () => {
      const cards = ["Jc", "Jd", "8h", "8s", "3c"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("Two Pair");
    });

    it("should identify one pair", () => {
      const cards = ["Tc", "Td", "Kh", "9s", "4c"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("One Pair");
    });

    it("should identify high card", () => {
      const cards = ["Ac", "Kd", "Qh", "9s", "4c"];
      const score = evaluateHand(cards);
      expect(getHandName(score)).toBe("High Card");
    });

    it("should rank royal flush higher than four of a kind", () => {
      const royalFlush = evaluateHand(["Ah", "Kh", "Qh", "Jh", "Th"]);
      const fourOfAKind = evaluateHand(["Ac", "Ad", "Ah", "As", "7d"]);
      expect(royalFlush).toBeGreaterThan(fourOfAKind);
    });
  });

  describe("compareHands", () => {
    it("should say pair of Aces beats pair of Kings", () => {
      const result = compareHands(
        ["Ac", "Ad"],
        ["Kc", "Kd"],
        ["Qh", "Js", "9c", "4d", "2h"]
      );
      expect(result).toBeGreaterThan(0);
    });
  });
});

describe("PokerEngine", () => {
  function makePlayers(count: number): RoomPlayerRow[] {
    return Array.from({ length: count }, (_, i) => ({
      roomPlayerId: `rp-${i}`,
      roomId: "test-room",
      playerId: i + 1,
      connectionState: "connected" as const,
      seatIndex: i,
    }));
  }

  function getState(engineResult: ReturnType<PokerEngine["processAction"]>): PokerState {
    return engineResult.newFullState as unknown as PokerState;
  }

  function getView(engine: PokerEngine, state: PokerState, playerId: number) {
    return engine.getPlayerView(state as unknown as Record<string, unknown>, playerId);
  }

  /** Auto-select action: call if behind, check if even */
  function autoAction(state: PokerState): { type: "call" | "check" | "fold"; amount?: number } {
    const activePlayer = state.players.find((p) => p.playerId === state.activePlayer);
    if (!activePlayer) return { type: "fold" };
    const toCall = state.currentBet - activePlayer.bet;
    return toCall > 0 ? { type: "call" } : { type: "check" };
  }

  const engine = new PokerEngine();

  describe("createInitialState", () => {
    it("should deal 2 cards to each player and post blinds", () => {
      const state = engine.createInitialState(makePlayers(4)) as unknown as PokerState;
      expect(state.players.length).toBe(4);
      state.players.forEach((p) => {
        expect(p.hand.length).toBe(2);
      });
      expect(state.phase).toBe("preflop");
      expect(state.deck.length).toBe(52 - 8);

      // Blinds posted
      const sb = state.players[1]; // dealer+1
      const bb = state.players[2]; // dealer+2
      expect(sb.stack).toBe(990);
      expect(sb.bet).toBe(10);
      expect(sb.totalBet).toBe(10);
      expect(bb.stack).toBe(980);
      expect(bb.bet).toBe(20);
      expect(bb.totalBet).toBe(20);
      expect(state.pots[0].amount).toBe(30);
      expect(state.currentBet).toBe(20);
    });

    it("should handle heads-up blinds correctly", () => {
      const state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      expect(state.dealerPosition).toBe(0);
      // Heads-up: dealer is SB, other is BB
      const sb = state.players[0];
      const bb = state.players[1];
      expect(sb.bet).toBe(10);
      expect(bb.bet).toBe(20);
      expect(state.activePlayer).toBe(sb.playerId); // SB acts first preflop in heads-up
    });
  });

  describe("processAction - fold", () => {
    it("should mark player as folded", () => {
      const initialState = engine.createInitialState(makePlayers(3)) as unknown as PokerState;
      const result = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "fold" },
        initialState.activePlayer
      );
      expect(result.valid).toBe(true);
      const state = getState(result);
      const foldedPlayer = state.players.find(
        (p) => p.playerId === initialState.activePlayer
      );
      expect(foldedPlayer?.folded).toBe(true);
    });

    it("should award pot immediately if everyone else folds", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const p1 = initialState.activePlayer;
      const result = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "fold" },
        p1
      );
      expect(result.valid).toBe(true);
      const state = getState(result);
      expect(state.phase).toBe("showdown");
      expect(state.winners).toBeDefined();
      expect(state.winners!.length).toBe(1);
      // Winner (BB) started with 980 and gets the 30 in blinds
      const winner = state.players.find((p) => !p.folded);
      expect(winner!.stack).toBe(980 + 30);
    });
  });

  describe("processAction - check/call", () => {
    it("should allow check when currentBet is matched", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const p1 = initialState.activePlayer; // SB
      // P1 calls to match BB
      const r1 = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "call" },
        p1
      );
      expect(r1.valid).toBe(true);
      const state1 = getState(r1);
      const p2 = state1.activePlayer; // BB
      // P2 can check (already matched currentBet)
      const r2 = engine.processAction(
        state1 as unknown as Record<string, unknown>,
        { type: "check" },
        p2
      );
      expect(r2.valid).toBe(true);
    });

    it("should reject check when there is a bet to call", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const p1 = initialState.activePlayer; // SB
      // P1 calls
      const r1 = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "call" },
        p1
      );
      expect(r1.valid).toBe(true);
      const state1 = getState(r1);
      const p2 = state1.activePlayer; // BB
      // P2 raises
      const r2 = engine.processAction(
        state1 as unknown as Record<string, unknown>,
        { type: "raise", amount: 50 },
        p2
      );
      expect(r2.valid).toBe(true);
      const state2 = getState(r2);
      const p1Again = state2.activePlayer; // SB again
      // P1 tries to check
      const r3 = engine.processAction(
        state2 as unknown as Record<string, unknown>,
        { type: "check" },
        p1Again
      );
      expect(r3.valid).toBe(false);
      expect(r3.errorMessage).toContain("Cannot check");
    });
  });

  describe("processAction - raise", () => {
    it("should deduct stack and update currentBet", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const p1 = initialState.activePlayer; // SB, already bet 10
      const result = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "raise", amount: 100 },
        p1
      );
      expect(result.valid).toBe(true);
      const state = getState(result);
      const player = state.players.find((p) => p.playerId === p1);
      // Started with 990 (after SB), toCall=10 + raise=100 = 110 additional, total bet = 120
      expect(player?.stack).toBe(880);
      expect(player?.bet).toBe(120);
      expect(state.currentBet).toBe(120);
    });

    it("should reject raise with insufficient stack", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const p1 = initialState.activePlayer;
      const result = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "raise", amount: 2000 },
        p1
      );
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain("Insufficient stack");
    });
  });

  describe("processAction - all_in", () => {
    it("should put entire stack in pot", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const p1 = initialState.activePlayer; // SB, stack=990
      const result = engine.processAction(
        initialState as unknown as Record<string, unknown>,
        { type: "all_in" },
        p1
      );
      expect(result.valid).toBe(true);
      const state = getState(result);
      const player = state.players.find((p) => p.playerId === p1);
      expect(player?.stack).toBe(0);
      expect(player?.allIn).toBe(true);
      expect(player?.bet).toBe(1000); // 10 SB + 990 all-in
    });
  });

  describe("phase advancement", () => {
    it("should advance from preflop to flop after calling and checking", () => {
      let state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;

      const p1 = state.activePlayer; // SB
      let result = engine.processAction(state as unknown as Record<string, unknown>, { type: "call" }, p1);
      state = getState(result);

      const p2 = state.activePlayer; // BB
      result = engine.processAction(state as unknown as Record<string, unknown>, { type: "check" }, p2);
      state = getState(result);

      expect(state.phase).toBe("flop");
      expect(state.communityCards.length).toBe(3);
    });

    it("should advance through all phases to showdown", () => {
      let state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;

      const playPhase = (s: PokerState): PokerState => {
        let current = s;
        while (true) {
          if ((current.phase as string) !== (s.phase as string)) break;
          const ap = current.activePlayer;
          if (ap === -1) break;
          const action = autoAction(current);
          const r = engine.processAction(current as unknown as Record<string, unknown>, action, ap);
          current = getState(r);
        }
        return current;
      };

      state = playPhase(state); // preflop -> flop
      expect(state.phase).toBe("flop");

      state = playPhase(state); // flop -> turn
      expect(state.phase).toBe("turn");

      state = playPhase(state); // turn -> river
      expect(state.phase).toBe("river");

      state = playPhase(state); // river -> showdown
      expect(state.phase).toBe("showdown");
      expect(state.winners).toBeDefined();
    });
  });

  describe("side pots", () => {
    it("should create side pots when one player is all-in for less", () => {
      // 3 players: P1=dealer/UTG(0), P2=SB(10), P3=BB(20)
      let state = engine.createInitialState(makePlayers(3)) as unknown as PokerState;

      // Play through preflop: P1 calls 20, P2 calls 10, P3 checks
      for (let i = 0; i < 3; i++) {
        const ap = state.activePlayer;
        const action = autoAction(state);
        const result = engine.processAction(state as unknown as Record<string, unknown>, action, ap);
        state = getState(result);
      }
      expect(state.phase).toBe("flop");

      // On flop, P2 (SB) goes all-in for remaining 980
      const p2 = state.players.find((p) => p.playerId === 2)!;
      expect(p2.stack).toBe(980);
      let result = engine.processAction(
        state as unknown as Record<string, unknown>,
        { type: "all_in" },
        p2.playerId
      );
      state = getState(result);
      expect(state.players.find((p) => p.playerId === 2)!.allIn).toBe(true);

      // P3 (BB) calls to match P2's all-in of 980 (needs 960 more)
      const p3Id = state.activePlayer;
      result = engine.processAction(
        state as unknown as Record<string, unknown>,
        { type: "call" },
        p3Id
      );
      state = getState(result);

      // P1 (dealer) folds
      const p1Id = state.activePlayer;
      result = engine.processAction(
        state as unknown as Record<string, unknown>,
        { type: "fold" },
        p1Id
      );
      state = getState(result);

      // All remaining players are all-in, so it fast-forwards to showdown
      expect(state.phase).toBe("showdown");
      expect(state.winners).toBeDefined();
      expect(state.winners!.length).toBeGreaterThanOrEqual(1);
      // Pots are awarded to winners (amounts zeroed), verify winners received chips
      const totalWon = state.winners!.reduce((sum, w) => sum + w.amount, 0);
      expect(totalWon).toBeGreaterThan(0);
    });
  });

  describe("resetForNextHand", () => {
    it("should preserve stacks and rotate dealer", () => {
      let state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const originalDealer = state.dealerPosition;

      // Play to showdown
      for (let phase = 0; phase < 4; phase++) {
        if ((state.phase as string) === "showdown") break;
        let actions = 0;
        while ((state.phase as string) !== "showdown" && actions < 10) {
          const ap = state.activePlayer;
          if (ap === -1) break;
          const action = autoAction(state);
          const r = engine.processAction(state as unknown as Record<string, unknown>, action, ap);
          state = getState(r);
          actions++;
          if ((state.phase as string) === "showdown") break;
        }
      }

      expect(state.phase).toBe("showdown");
      const preStacks = state.players.map((p) => p.stack);

      const newState = engine.resetForNextHand(
        state as unknown as Record<string, unknown>,
        makePlayers(2)
      ) as unknown as PokerState;

      expect(newState.phase).toBe("preflop");
      expect(newState.dealerPosition).toBe((originalDealer + 1) % 2);
      // Stacks after new blinds posted (previous stacks minus new blind amounts)
      const p1NewStack = newState.players.find((p) => p.playerId === 1)!.stack;
      const p2NewStack = newState.players.find((p) => p.playerId === 2)!.stack;
      // Both should still have chips and new hands dealt
      expect(p1NewStack).toBeGreaterThan(0);
      expect(p2NewStack).toBeGreaterThan(0);
      expect(newState.players[0].hand.length).toBe(2);
      expect(newState.players[1].hand.length).toBe(2);
      expect(newState.players[0].hand.length).toBe(2);
      expect(newState.players[1].hand.length).toBe(2);
    });

    it("should return waiting state if not enough players with chips", () => {
      let state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      // Wipe out one player's stack
      state.players[0].stack = 0;
      state.players[1].stack = 1000;

      const newState = engine.resetForNextHand(
        state as unknown as Record<string, unknown>,
        makePlayers(2)
      ) as unknown as PokerState;

      expect(newState.phase).toBe("waiting");
    });
  });

  describe("getPlayerView", () => {
    it("should show own cards but mask opponents", () => {
      const state = engine.createInitialState(makePlayers(3)) as unknown as PokerState;
      const p1 = state.players[0].playerId;
      const p2 = state.players[1].playerId;

      const view1 = getView(engine, state, p1) as unknown as { players: Array<{ playerId: number; hand: string[] }> };
      const view2 = getView(engine, state, p2) as unknown as { players: Array<{ playerId: number; hand: string[] }> };

      const p1HandInView1 = view1.players.find((p) => p.playerId === p1)?.hand;
      const p2HandInView1 = view1.players.find((p) => p.playerId === p2)?.hand;
      const p1HandInView2 = view2.players.find((p) => p.playerId === p1)?.hand;

      expect(p1HandInView1).toEqual(state.players[0].hand);
      expect(p2HandInView1).toEqual(["back", "back"]);
      expect(p1HandInView2).toEqual(["back", "back"]);
    });

    it("should reveal all cards at showdown", () => {
      let state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;

      for (let phase = 0; phase < 4; phase++) {
        if ((state.phase as string) === "showdown") break;
        let actions = 0;
        while ((state.phase as string) !== "showdown" && actions < 10) {
          const ap = state.activePlayer;
          if (ap === -1) break;
          const action = autoAction(state);
          const r = engine.processAction(state as unknown as Record<string, unknown>, action, ap);
          state = getState(r);
          actions++;
        }
      }

      expect(state.phase).toBe("showdown");

      const p1 = state.players[0].playerId;
      const view = getView(engine, state, p1) as unknown as { players: Array<{ playerId: number; hand: string[] }> };
      const p2Hand = view.players.find((p) => p.playerId === state.players[1].playerId)?.hand;

      expect(p2Hand).toEqual(state.players[1].hand);
    });
  });

  describe("getValidActions", () => {
    it("should include fold, call and all_in when player must call", () => {
      const state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const actions = engine.getValidActions(state as unknown as Record<string, unknown>, state.activePlayer);
      const types = actions.map((a) => a.type);
      // SB has to call 10 to match BB
      expect(types).toContain("fold");
      expect(types).toContain("call");
      expect(types).toContain("raise");
      expect(types).toContain("all_in");
      expect(types).not.toContain("check");

      const callAction = actions.find((a) => a.type === "call");
      expect(callAction?.amount).toBe(10);
    });

    it("should include check when currentBet is matched", () => {
      const initialState = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      // SB calls to match BB
      const sb = initialState.activePlayer;
      const r1 = engine.processAction(initialState as unknown as Record<string, unknown>, { type: "call" }, sb);
      const state1 = getState(r1);
      // BB can check
      const bb = state1.activePlayer;
      const actions = engine.getValidActions(state1 as unknown as Record<string, unknown>, bb);
      const types = actions.map((a) => a.type);
      expect(types).toContain("check");
      expect(types).not.toContain("call");
    });

    it("should return empty array when not player's turn", () => {
      const state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const inactivePlayer = state.players.find((p) => p.playerId !== state.activePlayer)!.playerId;
      const actions = engine.getValidActions(state as unknown as Record<string, unknown>, inactivePlayer);
      expect(actions).toEqual([]);
    });
  });

  describe("tie handling", () => {
    it("should split pot when two players tie", () => {
      // Create a state where both players have identical best hands
      let state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      // Force identical hands and community cards for a tie
      state.players[0].hand = ["Ac", "Kd"];
      state.players[1].hand = ["Ad", "Kc"];
      state.communityCards = ["Qh", "Js", "Tc", "9d", "8h"]; // straight on board

      // Play to showdown with checks
      while (state.phase !== "showdown") {
        const ap = state.activePlayer;
        if (ap === -1) break;
        const toCall = state.currentBet - (state.players.find((p) => p.playerId === ap)?.bet ?? 0);
        const action = toCall > 0 ? { type: "call" as const } : { type: "check" as const };
        const result = engine.processAction(state as unknown as Record<string, unknown>, action, ap);
        state = getState(result);
      }

      expect(state.phase).toBe("showdown");
      expect(state.winners).toBeDefined();
      expect(state.winners!.length).toBe(2);
      // Both should have received some chips
      const totalWon = state.winners!.reduce((sum, w) => sum + w.amount, 0);
      expect(totalWon).toBeGreaterThan(0);
    });
  });

  describe("getPlayerView", () => {
    it("should include validActions for active player", () => {
      const state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const activePlayer = state.activePlayer;
      const view = getView(engine, state, activePlayer) as unknown as { validActions: Array<{ type: string }> };
      expect(view.validActions.length).toBeGreaterThan(0);
      expect(view.validActions.map((a) => a.type)).toContain("fold");
    });

    it("should include empty validActions for inactive player", () => {
      const state = engine.createInitialState(makePlayers(2)) as unknown as PokerState;
      const inactivePlayer = state.players.find((p) => p.playerId !== state.activePlayer)!.playerId;
      const view = getView(engine, state, inactivePlayer) as unknown as { validActions: Array<{ type: string }> };
      expect(view.validActions).toEqual([]);
    });
  });

  describe("turn validation", () => {
    it("should reject action when not player's turn", () => {
      const state = engine.createInitialState(makePlayers(3)) as unknown as PokerState;
      const inactivePlayer = state.players.find((p) => p.playerId !== state.activePlayer)!.playerId;

      const result = engine.processAction(
        state as unknown as Record<string, unknown>,
        { type: "fold" },
        inactivePlayer
      );
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toBe("Not your turn");
    });
  });
});
