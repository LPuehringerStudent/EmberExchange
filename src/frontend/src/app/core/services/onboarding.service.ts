import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

const ONBOARDING_LOCAL_KEY = 'ember_onboarding_done';

export interface OnboardingStep {
  id: string;
  targetSelector: string;
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const TUTORIAL_STEPS: OnboardingStep[] = [
  {
    id: 'inventory',
    targetSelector: '[data-tour="inventory"]',
    title: 'Your Inventory',
    body: 'Everything you own lives here. Stoves, lootboxes, and sparks. Click the backpack icon anytime to see your collection.',
    position: 'bottom'
  },
  {
    id: 'collect',
    targetSelector: '[data-tour="lootboxes"]',
    title: 'Collect',
    body: 'Open lootboxes to discover rare stoves. Each stove has a rarity — from Common to Legendary. The rarer, the more valuable!',
    position: 'bottom'
  },
  {
    id: 'forge',
    targetSelector: '[data-tour="forge"]',
    title: 'Upgrade',
    body: 'Sacrifice 6 stoves of the same rarity in The Forge to create one even rarer. Risky but rewarding!',
    position: 'bottom'
  },
  {
    id: 'shop',
    targetSelector: '[data-tour="shop"]',
    title: 'Buy & Earn',
    body: 'Buy stoves directly in the Shop or claim your daily reward streak. Don\'t miss day 7 — it\'s the best one!',
    position: 'bottom'
  },
  {
    id: 'marketplace',
    targetSelector: '[data-tour="marketplace"]',
    title: 'Trade',
    body: 'Sell your stoves on the Marketplace or trade directly with friends. Prices are set by players, so find the best deals!',
    position: 'bottom'
  },
  {
    id: 'games',
    targetSelector: '[data-tour="games"]',
    title: 'Play',
    body: 'Join Poker, Blackjack, or Roulette tables. Bet your coins, beat the odds, and win big!',
    position: 'bottom'
  },
  {
    id: 'social',
    targetSelector: '[data-tour="social"]',
    title: 'Connect',
    body: 'Add friends, chat in real time, and send trade offers without leaving the conversation.',
    position: 'bottom'
  },
  {
    id: 'quests',
    targetSelector: '[data-tour="quests"]',
    title: 'Complete Challenges',
    body: 'Finish daily and weekly quests for bonus coins and rewards. A great way to boost your progress!',
    position: 'bottom'
  }
];

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private auth = inject(AuthService);

  private _showTour = signal(false);
  readonly showTour = this._showTour.asReadonly();

  private _currentStepIndex = signal(0);
  readonly currentStepIndex = this._currentStepIndex.asReadonly();

  private _hasLoaded = signal(false);
  private hasCompletedOnboarding = false;

  readonly steps = TUTORIAL_STEPS;

  get currentStep(): OnboardingStep | null {
    const idx = this._currentStepIndex();
    return this.steps[idx] ?? null;
  }

  async loadState(): Promise<void> {
    if (this._hasLoaded()) return;

    const user = this.auth.getCurrentUser();
    if (!user) {
      this._hasLoaded.set(true);
      return;
    }

    try {
      const settings = await this.auth.getNotificationSettings(user.playerId);
      this.hasCompletedOnboarding = settings.hasCompletedOnboarding ?? false;
    } catch {
      this.hasCompletedOnboarding = localStorage.getItem(ONBOARDING_LOCAL_KEY) === '1';
    }

    this._hasLoaded.set(true);
  }

  shouldShowTour(): boolean {
    if (!this._hasLoaded()) return false;
    const localDone = localStorage.getItem(ONBOARDING_LOCAL_KEY) === '1';
    return !this.hasCompletedOnboarding && !localDone;
  }

  private beginTour(): void {
    this._currentStepIndex.set(0);
    this._showTour.set(true);
  }

  startTourIfNeeded(): void {
    if (this.shouldShowTour()) {
      this.beginTour();
    }
  }

  nextStep(): void {
    const next = this._currentStepIndex() + 1;
    if (next >= this.steps.length) {
      this.completeTour();
    } else {
      this._currentStepIndex.set(next);
    }
  }

  skipTour(): void {
    this._showTour.set(false);
    this.completeTour();
  }

  async completeTour(): Promise<void> {
    this._showTour.set(false);
    this.hasCompletedOnboarding = true;
    localStorage.setItem(ONBOARDING_LOCAL_KEY, '1');

    const user = this.auth.getCurrentUser();
    if (user) {
      try {
        await this.auth.updateNotificationSettings(user.playerId, { hasCompletedOnboarding: true });
      } catch {
        // ignore backend errors; localStorage is fallback
      }
    }
  }

  async replayTutorial(): Promise<void> {
    this.hasCompletedOnboarding = false;
    localStorage.removeItem(ONBOARDING_LOCAL_KEY);

    const user = this.auth.getCurrentUser();
    if (user) {
      try {
        await this.auth.updateNotificationSettings(user.playerId, { hasCompletedOnboarding: false });
      } catch {
        // ignore backend errors
      }
    }

    this.beginTour();
  }
}
