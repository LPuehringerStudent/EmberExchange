jest.mock('@angular/core', () => ({
  signal: <T>(initialValue: T) => {
    let value = initialValue;
    const fn = () => value;
    fn.set = (v: T) => { value = v; };
    return fn;
  },
}));

import { signal } from '@angular/core';

import { PokerStageManager, POKER_TIMING } from '../frontend/src/app/features/poker/poker-stage-manager';

// The stage manager runs in a browser context and uses window.setTimeout.
(globalThis as any).window = globalThis;

jest.useFakeTimers();

function makePlayer(id: number, hand: string[]): Record<string, unknown> {
  return {
    playerId: id,
    username: `Player ${id}`,
    stack: 1000,
    bet: 0,
    totalBet: 0,
    folded: false,
    allIn: false,
    hand,
  };
}

function makeBlob(
  phase: string,
  players: Record<string, unknown>[],
  communityCards: string[] = []
): Record<string, unknown> {
  return {
    phase,
    players,
    communityCards,
    pot: 0,
    currentBet: 20,
  };
}

describe('PokerStageManager', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('mock signal works', () => {
    const s = signal(new Set<string>());
    const readonly = s;
    readonly.set(new Set(['a']));
    expect(readonly().has('a')).toBe(true);
  });

  it('deals hole cards one at a time', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(
      makeBlob('preflop', [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ])
    );

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('dealing');

    // First card to player 1 (dealt immediately, delay 0)
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hand).toEqual(['Ah']);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[1].hand).toEqual(['back']);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hand).toEqual(['Ah', 'Kd']);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[1].hand).toEqual(['back', 'back']);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger);
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');
  });

  it('deals the flop three cards staggered', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(
      makeBlob('preflop', [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ])
    );
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(
      makeBlob(
        'flop',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['back', 'back']),
        ],
        ['3c', '7h', 'Qs']
      )
    );

    expect(mgr.isAnimating()).toBe(true);
    expect(mgr.stage()).toBe('flop');

    // First community card is dealt immediately
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual(['3c']);

    jest.advanceTimersByTime(POKER_TIMING.communityStagger);
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual(['3c', '7h']);

    jest.advanceTimersByTime(POKER_TIMING.communityStagger);
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual(['3c', '7h', 'Qs']);

    jest.advanceTimersByTime(POKER_TIMING.communityStagger);
    expect(mgr.isAnimating()).toBe(false);
  });

  it('deals turn and river one card each', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(
      makeBlob(
        'flop',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['back', 'back']),
        ],
        ['3c', '7h', 'Qs']
      )
    );
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(
      makeBlob(
        'turn',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['back', 'back']),
        ],
        ['3c', '7h', 'Qs', '2d']
      )
    );
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(
      makeBlob(
        'river',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['back', 'back']),
        ],
        ['3c', '7h', 'Qs', '2d', '5s']
      )
    );

    // A single river card is dealt immediately (delay 0).
    expect(mgr.displayedStateBlob()?.['communityCards']).toEqual([
      '3c', '7h', 'Qs', '2d', '5s',
    ]);
    expect(mgr.isAnimating()).toBe(false);
  });

  it('snaps to target on reconnect (phase skip)', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(makeBlob('waiting', [], []));
    jest.advanceTimersByTime(100);

    mgr.setTarget(
      makeBlob(
        'river',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['back', 'back']),
        ],
        ['3c', '7h', 'Qs', '2d']
      )
    );

    expect(mgr.isAnimating()).toBe(false);
    expect((mgr.displayedStateBlob()?.['communityCards'] as string[]).length).toBe(4);
  });

  it('tracks entering card ids during animation', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(
      makeBlob('preflop', [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ])
    );

    expect(mgr.enteringCardIds().has('hole-1-0')).toBe(true);

    jest.advanceTimersByTime(POKER_TIMING.dealStagger);
    expect(mgr.enteringCardIds().has('hole-2-0')).toBe(true);
  });

  it('reveals all cards and settles at showdown', () => {
    const mgr = new PokerStageManager();
    mgr.setTarget(
      makeBlob(
        'river',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['back', 'back']),
        ],
        ['3c', '7h', 'Qs', '2d', '5s']
      )
    );
    jest.advanceTimersByTime(10_000);

    mgr.setTarget(
      makeBlob(
        'showdown',
        [
          makePlayer(1, ['Ah', 'Kd']),
          makePlayer(2, ['Tc', 'Th']),
        ],
        ['3c', '7h', 'Qs', '2d', '5s']
      )
    );

    expect(mgr.isAnimating()).toBe(true);

    // Reveal applies immediately
    expect((mgr.displayedStateBlob()?.['players'] as any[])[1].hand).toEqual(['Tc', 'Th']);

    jest.advanceTimersByTime(POKER_TIMING.settlePause);
    expect(mgr.isAnimating()).toBe(false);
    expect(mgr.stage()).toBe('idle');
  });

  it('respects reduced motion and snaps instantly', () => {
    const mgr = new PokerStageManager({ reducedMotion: true });
    mgr.setTarget(
      makeBlob('preflop', [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ])
    );

    expect(mgr.isAnimating()).toBe(false);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hand).toEqual(['Ah', 'Kd']);
  });
});
