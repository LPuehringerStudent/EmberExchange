import { Component, AfterViewInit, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { OwnershipService } from '@core/services/ownership.service';
import { LootboxService, RecentPull } from '@core/services/lootbox.service';
import { OnboardingService } from '@core/services/onboarding.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-main-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css']
})
export class MainMenuComponent implements OnInit, AfterViewInit {
  // User data signals
  username = signal<string>('Player');
  coins = signal<number>(0);
  stoveCount = signal<number>(0);
  lootboxCount = signal<number>(0);
  loading = signal<boolean>(true);

  recentPulls = signal<RecentPull[]>([]);
  private onboardingLoadPromise: Promise<void> | null = null;

  private authService = inject(AuthService);
  private ownershipService = inject(OwnershipService);
  private lootboxService = inject(LootboxService);
  private onboardingService = inject(OnboardingService);

  ngOnInit(): void {
    this.loadUserData();
    this.loadRecentPulls();
    this.onboardingLoadPromise = this.onboardingService.loadState();
  }

  private async loadRecentPulls(): Promise<void> {
    try {
      const pulls = await firstValueFrom(this.lootboxService.getRecentPulls(20));
      this.recentPulls.set(pulls);
    } catch (err) {
      console.error('Failed to load recent pulls:', err);
      this.recentPulls.set([]);
    }
  }

  ngAfterViewInit() {
    // Wait for onboarding state to load, then start tour if needed
    this.onboardingLoadPromise?.then(() => {
      setTimeout(() => {
        this.onboardingService.startTourIfNeeded();
      }, 500);
    });
  }

  private async loadUserData(): Promise<void> {
    this.loading.set(true);
    const user = this.authService.getCurrentUser();
    if (user) {
      this.username.set(user.username);
      this.coins.set(user.coins);
      this.lootboxCount.set(user.lootboxCount);

      // Load stove count from ownership API
      try {
        const ownerships = await firstValueFrom(this.ownershipService.getOwnershipsByPlayerId(user.playerId));
        this.stoveCount.set(ownerships.length);
      } catch (error) {
        console.error('Failed to load stove count:', error);
      }
    }
    this.loading.set(false);
  }
}
