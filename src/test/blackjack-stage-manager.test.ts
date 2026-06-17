jest.mock('@angular/core', () => ({
  signal: <T>(initialValue: T) => {
    let value = initialValue;
    const fn = () => value;
    fn.set = (v: T) => { value = v; };
    return fn;
  },
}));

import { BlackjackStageManager, buildPlayerCardId, buildDealerCardId, TIMING } from '../frontend/src/app/features/blackjack/blackjack-stage-manager';

function makeBlob(
  phase: string,
  dealerHand: string[],
  players: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    status: 'active',
    phase,
    dealerHand,
    players,
    activePlayer: -1,
    activeHandIndex: 0,
    currentBet: 20,
    validActions: [],
  };
}

describe('BlackjackStageManager', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('snaps to a betting state instantly', () => {
    const mgr = new BlackjackStageManager();
    mgr.setTarget(makeBlob('betting', [], []));

    expect(mgr.displayedStateBlob()?.['phase']).toBe('betting');
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');
  });

  it('stages an initial deal one card at a time', () => {
    const mgr = new BlackjackStageManager();
    mgr.setTarget(makeBlob('betting', [], []));
    jest.advanceTimersByTime(0);

    const target = makeBlob('player_turn', ['5h', 'back'], [
      {
        playerId: 1,
        username: 'Hero',
        stack: 1000,
        hands: [['Ah', '10d']],
        bets: [20],
        result: 'playing',
      },
    ]);

    mgr.setTarget(target);

    // Reset event applies immediately (delay 0)
    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('dealing');
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual([]);

    // First player card
    jest.advanceTimersByTime(350);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual(['Ah']);
    expect(mgr.enteringCardIds().has(buildPlayerCardId(1, 0, 0, 'Ah'))).toBe(true);

    // Dealer upcard
    jest.advanceTimersByTime(350);
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h']);

    // Second player card
    jest.advanceTimersByTime(350);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual(['Ah', '10d']);

    // Dealer hole
    jest.advanceTimersByTime(350);
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', 'back']);

    // Queue finishes
    jest.advanceTimersByTime(350);
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');
  });
});
