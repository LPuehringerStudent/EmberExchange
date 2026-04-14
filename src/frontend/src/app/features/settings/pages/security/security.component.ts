// security.component.ts
import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-security',
  imports: [ReactiveFormsModule],
  templateUrl: './security.component.html',
  styleUrls: ['../../settings.component.css', './security.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityComponent {
  twoFactorEnabled = signal<boolean>(false);
  loginAlerts = signal<boolean>(true);
  trustedDevices = signal<boolean>(false);

  // Delete account modal
  showDeleteModal = signal<boolean>(false);
  deleteConfirmText = new FormControl('');
  deleteLoading = signal<boolean>(false);
  deleteError = signal<string>('');

  private _authService = inject(AuthService);
  private _router = inject(Router);

  toggleTwoFactor() {
    this.twoFactorEnabled.update(v => !v);
    // TODO: Persist to backend when API is available
  }

  toggleLoginAlerts() {
    this.loginAlerts.update(v => !v);
    // TODO: Persist to backend when API is available
  }

  toggleTrustedDevices() {
    this.trustedDevices.update(v => !v);
    // TODO: Persist to backend when API is available
  }

  openDeleteModal() {
    this.showDeleteModal.set(true);
    this.deleteConfirmText.setValue('');
    this.deleteError.set('');
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
  }

  async confirmDeleteAccount(): Promise<void> {
    if (this.deleteConfirmText.value !== 'DELETE') {
      this.deleteError.set('Please type DELETE to confirm');
      return;
    }

    this.deleteLoading.set(true);
    this.deleteError.set('');

    try {
      const sessionId = this._authService.getSessionId();
      if (!sessionId) {
        this.deleteError.set('Not authenticated');
        return;
      }

      await this._authService.deleteAccount(sessionId);
      await this._authService.logout();
      void this._router.navigate(['/login']);
    } catch (err) {
      this.deleteError.set(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      this.deleteLoading.set(false);
    }
  }
}
