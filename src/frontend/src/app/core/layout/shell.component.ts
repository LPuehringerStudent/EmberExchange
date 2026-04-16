import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent {
  sidebarOpen = signal(false);

  isLoggedIn = computed(() => this.authService.isLoggedIn());
  currentUser = computed(() => this.authService.getCurrentUser());
  coins = computed(() => this.authService.getCurrentUser()?.coins ?? 0);

  private authService = inject(AuthService);
  private router = inject(Router);
  private themeService = inject(ThemeService);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    this.sidebarOpen.set(false);
  }
}
