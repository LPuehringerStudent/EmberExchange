import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-danger-zone',
  imports: [ReactiveFormsModule],
  templateUrl: './danger-zone.component.html',
  styleUrls: ['../../settings.component.css', './danger-zone.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DangerZoneComponent {
  showDeleteModal = signal<boolean>(false);
  deleteConfirmText = new FormControl('');
  deleteLoading = signal<boolean>(false);
  deleteError = signal<string>('');
  emailVerified = computed(() => this._authService.isEmailVerified());

  private _authService = inject(AuthService);
  private _router = inject(Router);

  getExpectedConfirmation(): string {
    return this._authService.getCurrentUser()?.username ?? '';
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
    const expected = this.getExpectedConfirmation();
    if (this.deleteConfirmText.value !== expected) {
      this.deleteError.set(`Please type "${expected}" to confirm`);
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
