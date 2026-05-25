// settings.component.ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, ActivatedRoute, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  activeTab = 'account';

  private router = inject(Router);
  private route = inject(ActivatedRoute);

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
}
