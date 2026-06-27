jest.mock('@angular/core', () => ({
  signal: <T>(initialValue: T) => {
    let value = initialValue;
    const fn = () => value;
    fn.set = (v: T) => { value = v; };
    fn.update = (updater: (v: T) => T) => { value = updater(value); };
    fn.asReadonly = () => fn;
    return fn;
  },
}));

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
  community: string[] = [],
  winners: Array<{ playerId: number; amount: number }> = []
): Record<string, unknown> {
  return {
    phase,
    players,
    communityCards: community,
    pots: [{ amount: 0, eligiblePlayers: players.map((p) => p['playerId']) }],
    winners,
  };
}

describe('PokerStageManager', () => {
  let mgr: PokerStageManager;

  afterEach(() => {
    mgr?.destroy();
    jest.clearAllTimers();
  });

  it('deals hole cards one at a time', () => {
    mgr = new PokerStageManager();
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
    mgr = new PokerStageManager();
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
    mgr = new PokerStageManager();
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
    mgr = new PokerStageManager();
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
    mgr = new PokerStageManager();
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
    mgr = new PokerStageManager();
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
    mgr = new PokerStageManager({ reducedMotion: true });
    mgr.setTarget(
      makeBlob('preflop', [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ])
    );

    expect(mgr.isAnimating()).toBe(false);
    expect((mgr.displayedStateBlob()?.['players'] as any[])[0].hand).toEqual(['Ah', 'Kd']);
  });

  it('marks opponent cards as revealing at showdown', () => {
    mgr = new PokerStageManager();
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

    expect(mgr.revealingCardIds().has('hole-2-0')).toBe(true);
    expect(mgr.revealingCardIds().has('hole-2-1')).toBe(true);

    jest.advanceTimersByTime(POKER_TIMING.revealDuration + 10);
    expect(mgr.revealingCardIds().size).toBe(0);
  });

  it('does not mark hero hole cards as revealing at showdown', () => {
    mgr = new PokerStageManager({ heroPlayerId: 1 });
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

    expect(mgr.revealingCardIds().has('hole-2-0')).toBe(true);
    expect(mgr.revealingCardIds().has('hole-2-1')).toBe(true);
    expect(mgr.revealingCardIds().has('hole-1-0')).toBe(false);
    expect(mgr.revealingCardIds().has('hole-1-1')).toBe(false);
  });

  it('emits place_chips when a bet increases', () => {
    mgr = new PokerStageManager();
    mgr.setTarget(
      makeBlob('preflop', [
        makePlayer(1, ['Ah', 'Kd']),
        makePlayer(2, ['back', 'back']),
      ])
    );
    jest.advanceTimersByTime(10_000);

    const p2 = makePlayer(2, ['back', 'back']);
    p2['bet'] = 20;
    mgr.setTarget(makeBlob('preflop', [makePlayer(1, ['Ah', 'Kd']), p2]));

    const events = mgr.chipEventQueue();
    expect(events.some((e) => e.type === 'place_chips' && e.playerId === 2 && e.amount === 20)).toBe(true);
  });

  it('emits move_chips_to_pot when seat bets are collected', () => {
    mgr = new PokerStageManager();
    const p1 = makePlayer(1, ['Ah', 'Kd']);
    p1['bet'] = 10;
    const p2 = makePlayer(2, ['back', 'back']);
    p2['bet'] = 20;
    mgr.setTarget(makeBlob('flop', [p1, p2], ['3c', '7h', 'Qs']));
    jest.advanceTimersByTime(10_000);

    const resetP1 = makePlayer(1, ['Ah', 'Kd']);
    resetP1['bet'] = 0;
    const resetP2 = makePlayer(2, ['back', 'back']);
    resetP2['bet'] = 0;
    mgr.setTarget(makeBlob('turn', [resetP1, resetP2], ['3c', '7h', 'Qs', '2d']));
    jest.advanceTimersByTime(2_000);

    const events = mgr.chipEventQueue();
    expect(events.some((e) => e.type === 'move_chips_to_pot' && e.playerId === 1 && e.amount === 10)).toBe(true);
    expect(events.some((e) => e.type === 'move_chips_to_pot' && e.playerId === 2 && e.amount === 20)).toBe(true);
  });

  it('emits payout_chips at showdown', () => {
    mgr = new PokerStageManager();
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
        ['3c', '7h', 'Qs', '2d', '5s'],
        [{ playerId: 2, amount: 100 }]
      )
    );
    jest.advanceTimersByTime(2_000);

    const events = mgr.chipEventQueue();
    expect(events.some((e) => e.type === 'payout_chips' && e.playerId === 2 && e.amount === 100)).toBe(true);
  });
});
