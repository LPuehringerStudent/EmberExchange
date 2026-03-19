// security.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security.html',
  styleUrls: ['./security.css']
})
export class Security {
  twoFactorEnabled = signal<boolean>(false);
  loginAlerts = signal<boolean>(true);
  trustedDevices = signal<boolean>(false);
  
  // Delete account modal
  showDeleteModal = signal<boolean>(false);
  deleteConfirmText = signal<string>('');
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
    this.deleteConfirmText.set('');
    this.deleteError.set('');
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
  }

  async confirmDeleteAccount(): Promise<void> {
    if (this.deleteConfirmText() !== 'DELETE') {
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

      const response = await fetch('/api/auth/me', {
        method: 'DELETE',
        headers: {
          'session-id': sessionId
        }
      });

      if (response.ok) {
        // Account deleted, logout and redirect
        await this._authService.logout();
        this._router.navigate(['/login']);
      } else {
        const error = await response.json();
        this.deleteError.set(error.error || 'Failed to delete account');
      }
    } catch (err) {
      this.deleteError.set('Network error. Please try again.');
    } finally {
      this.deleteLoading.set(false);
    }
  }
}
