import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: '../html/settings.html',
  styleUrls: ['../css/settings.css']
})
export class SettingsComponent {
  activeTab = 'account';

  constructor(private router: Router) {}

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    // Navigate to WIP for non-account tabs
    if (tab !== 'account') {
      this.showWIP();
    }
  }

  showWIP(): void {
    alert('🚧 This feature is under development!');
  }

  navigateToWIP(): void {
    this.router.navigate(['/support']); // Uses NotFoundComponent
  }

  saveChanges(): void {
    this.showWIP();
  }

  updatePassword(): void {
    this.showWIP();
  }
}
