// settings.component.ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { OnboardingService } from '../../core/services/onboarding.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  activeTab = 'account';
  replaySuccess = signal<string>('');

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private onboardingService = inject(OnboardingService);

  constructor() {
    // Sync active tab on initial load and every navigation
    const syncTab = (): void => {
      const path = this.route.firstChild?.snapshot?.url?.[0]?.path;
      if (path) {
        this.activeTab = path;
      }
    };
    syncTab();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(syncTab);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    void this.router.navigate([tab], { relativeTo: this.route });
  }

  async replayQuickTour(): Promise<void> {
    await this.onboardingService.replayQuickTour();
    this.replaySuccess.set('Quick tour started! Return to the home page to see it.');
    setTimeout(() => this.replaySuccess.set(''), 4000);
  }

  startFullTutorial(): void {
    this.onboardingService.startFullTutorial();
    this.replaySuccess.set('Full tutorial started! Return to the home page to see it.');
    setTimeout(() => this.replaySuccess.set(''), 4000);
  }
}
