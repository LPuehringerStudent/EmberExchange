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

  it('reveals the hole card and draws dealer cards one by one', () => {
    const mgr = new BlackjackStageManager();

    // Start from a fully dealt playing state
    mgr.setTarget(
      makeBlob('player_turn', ['5h', 'back'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'playing',
        },
      ])
    );
    jest.advanceTimersByTime(10_000); // finish initial deal

    mgr.setTarget(
      makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'playing',
        },
      ])
    );

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('dealer-turn');

    // Hole card revealed
    jest.advanceTimersByTime(TIMING.holeFlip);
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c']);

    // First dealer draw
    jest.advanceTimersByTime(TIMING.dealerDrawPause);
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c', 'Ks']);

    // Queue finishes
    jest.advanceTimersByTime(TIMING.dealerDrawPause);
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');
  });

  it('animates a player hit', () => {
    const mgr = new BlackjackStageManager();
    mgr.setTarget(
      makeBlob('player_turn', ['5h', 'back'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'playing',
        },
      ])
    );
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(
      makeBlob('player_turn', ['5h', 'back'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d', '3c']],
          bets: [20],
          result: 'playing',
        },
      ])
    );

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('player-turn');

    jest.advanceTimersByTime(TIMING.dealStagger);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual([
      'Ah',
      '10d',
      '3c',
    ]);

    jest.advanceTimersByTime(TIMING.dealStagger);
    expect(mgr.isAnimating()).toBe(false);
  });

  it('animates the settle highlight', () => {
    const mgr = new BlackjackStageManager();
    mgr.setTarget(
      makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'won',
          handResults: ['won'],
        },
      ])
    );
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(
      makeBlob('settled', ['5h', '8c', 'Ks'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1020,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'won',
          handResults: ['won'],
        },
      ])
    );

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('settling');

    jest.advanceTimersByTime(TIMING.settlePause);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].result).toBe('won');
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].stack).toBe(1020);
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c', 'Ks']);
    expect(mgr.isAnimating()).toBe(false);
  });

  it('snaps dealer hand when baseline is incomplete, then settles', () => {
    const mgr = new BlackjackStageManager();
    const player = {
      playerId: 1,
      username: 'Hero',
      stack: 1000,
      hands: [['Ah', '10d']],
      bets: [20],
      result: 'playing',
    };

    mgr.setTarget(makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [player]));
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c', 'Ks']);
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');

    mgr.setTarget(
      makeBlob('settled', ['5h', '8c', 'Ks'], [
        {
          ...player,
          stack: 1020,
          result: 'won',
          handResults: ['won'],
        },
      ])
    );

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('settling');

    jest.advanceTimersByTime(TIMING.settlePause);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].result).toBe('won');
    expect(mgr.isAnimating()).toBe(false);
  });

  it('snaps instantly when reduced motion is preferred', () => {
    const mgr = new BlackjackStageManager({ reducedMotion: true });
    mgr.setTarget(
      makeBlob('player_turn', ['5h', 'back'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'playing',
        },
      ])
    );

    expect(mgr.isAnimating()).toBe(false);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hands[0]).toEqual([
      'Ah',
      '10d',
    ]);
  });

  it('jumps ahead on reconnect or phase skip', () => {
    const mgr = new BlackjackStageManager();
    mgr.setTarget(makeBlob('betting', [], []));
    jest.advanceTimersByTime(0);

    // Dealer phase would normally animate, but we leap from betting → dealer
    mgr.setTarget(
      makeBlob('dealer_turn', ['5h', '8c', 'Ks'], [
        {
          playerId: 1,
          username: 'Hero',
          stack: 1000,
          hands: [['Ah', '10d']],
          bets: [20],
          result: 'playing',
        },
      ])
    );

    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.displayedStateBlob()?.['dealerHand']).toEqual(['5h', '8c', 'Ks']);
  });
});
