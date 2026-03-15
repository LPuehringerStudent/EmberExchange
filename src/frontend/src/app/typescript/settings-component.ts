// settings-component.ts
import { Component } from '@angular/core';
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

  constructor(private router: Router, private route: ActivatedRoute) {}

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.router.navigate([tab], { relativeTo: this.route });
  }
}
