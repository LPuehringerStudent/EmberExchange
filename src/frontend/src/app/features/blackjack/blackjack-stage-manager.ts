import { signal } from '@angular/core';

export type BlackjackStage =
  | 'idle'
  | 'dealing'
  | 'player-turn'
  | 'dealer-turn'
  | 'settling';

export interface StageManagerOptions {
  reducedMotion?: boolean;
}

export class BlackjackStageManager {
  readonly targetStateBlob = signal<Record<string, unknown> | null>(null);
  readonly displayedStateBlob = signal<Record<string, unknown> | null>(null);
  readonly isAnimating = signal(false);
  readonly stage = signal<BlackjackStage>('idle');
  readonly enteringCardIds = signal<Set<string>>(new Set());

  private readonly reducedMotion: boolean;

  constructor(options: StageManagerOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
  }

  setTarget(blob: Record<string, unknown> | null): void {
    this.targetStateBlob.set(blob);
    if (this.reducedMotion || !blob) {
      this.jumpTo(blob);
      return;
    }
    // Full animation logic added in later tasks.
    this.jumpTo(blob);
  }

  private jumpTo(blob: Record<string, unknown> | null): void {
    this.displayedStateBlob.set(blob ? clone(blob) : null);
    this.isAnimating.set(false);
    this.stage.set('idle');
    this.enteringCardIds.set(new Set());
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
