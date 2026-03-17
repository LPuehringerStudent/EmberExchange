// settings-component.ts
import { Component, inject } from '@angular/core';
import {Router, ActivatedRoute, RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: '../html/settings.html',
  imports: [
    RouterOutlet
  ],
  styleUrls: ['../css/settings.css']
})
export class SettingsComponent {
  activeTab = 'account';

  private router = inject(Router);
  private route = inject(ActivatedRoute);

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    void this.router.navigate([tab], { relativeTo: this.route });
  }
}
