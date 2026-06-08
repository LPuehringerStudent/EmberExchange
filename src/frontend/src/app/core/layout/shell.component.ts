import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell.component';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent {
  sidebarOpen = signal(false);
  bannerDismissed = signal(false);

  isLoggedIn = computed(() => this.authService.isLoggedIn());
  isAdmin = computed(() => this.authService.isAdmin());
  currentUser = computed(() => this.authService.getCurrentUser());
  coins = computed(() => this.authService.getCurrentUser()?.coins ?? 0);
  sparks = computed(() => this.authService.getCurrentUser()?.sparks ?? 0);
  emailVerified = computed(() => this.authService.isEmailVerified());
  showVerifyBanner = computed(() => this.isLoggedIn() && !this.emailVerified() && !this.bannerDismissed());

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

  dismissBanner(): void {
    this.bannerDismissed.set(true);
  }

  async resendVerification(): Promise<void> {
    const email = this.currentUser()?.email;
    if (!email) return;
    try {
      await this.authService.resendVerification(email);
      alert('Verification email sent! Check your inbox.');
    } catch {
      alert('Failed to send verification email. Please try again.');
    }
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }
}
