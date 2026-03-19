import { Component, computed, inject } from '@angular/core';
import {RouterOutlet, RouterLink} from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-main',
  standalone: true,
  templateUrl: './app.html',
  imports: [RouterOutlet, RouterLink],
  styleUrls: ['./app.css']
})
export class MainComponent {
  sidebarOpen = false;
  settingsOpen = false;
  loginOpen = false;

  // Expose auth state to template
  isLoggedIn = computed(() => this.authService.isLoggedIn());
  currentUser = computed(() => this.authService.getCurrentUser());

  // Inject ThemeService to ensure theme is applied on startup
  private _themeService = inject(ThemeService);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleLogin() {
    this.loginOpen = !this.loginOpen;
    this.settingsOpen = false;
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.sidebarOpen = false;
    // Router navigation is handled in AuthService.logout()
  }
}
