jest.mock('@angular/core', () => ({
  signal: <T>(initialValue: T) => {
    let value = initialValue;
    const fn = () => value;
    fn.set = (v: T) => { value = v; };
    return fn;
  },
}));

import { BlackjackStageManager } from '../frontend/src/app/features/blackjack/blackjack-stage-manager';

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
});
