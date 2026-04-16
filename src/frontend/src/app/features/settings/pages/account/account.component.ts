import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['../../settings.component.css', './account.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountComponent implements OnInit {
  username = signal<string>('');
  originalEmail = '';

  emailForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)])
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl(''),
    newPassword: new FormControl(''),
    confirmPassword: new FormControl('')
  });

  loading = signal<boolean>(false);
  emailSuccess = signal<string>('');
  emailError = signal<string>('');
  passwordSuccess = signal<string>('');
  passwordError = signal<string>('');

  private _authService = inject(AuthService);
  private _router = inject(Router);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (user) {
      this.username.set(user.username);
      this.originalEmail = user.email;
      this.emailForm.setValue({ email: user.email });
    } else {
      this._router.navigate(['/login']);
    }
  }

  async saveChanges(): Promise<void> {
    this.emailSuccess.set('');
    this.emailError.set('');

    if (this.emailForm.invalid) {
      if (this.emailForm.get('email')?.hasError('required')) {
        this.emailError.set('Email is required');
      } else {
        this.emailError.set('Please enter a valid email address');
      }
      return;
    }

    const newEmail = this.emailForm.value.email!.trim();

    if (newEmail === this.originalEmail) {
      this.emailError.set('No changes to save');
      return;
    }

    this.loading.set(true);

    try {
      const sessionId = this._authService.getSessionId();
      if (!sessionId) {
        this.emailError.set('Not authenticated');
        return;
      }

      await this._authService.updateEmail(sessionId, newEmail);
      this.emailSuccess.set('Email updated successfully');
      this.originalEmail = newEmail;
      await this._authService.refreshUser();
    } catch (err) {
      this.emailError.set(err instanceof Error ? err.message : 'Failed to update email');
    } finally {
      this.loading.set(false);
    }
  }

  async updatePassword(): Promise<void> {
    this.passwordSuccess.set('');
    this.passwordError.set('');

    const current = this.passwordForm.value.currentPassword || '';
    const newPass = this.passwordForm.value.newPassword || '';
    const confirm = this.passwordForm.value.confirmPassword || '';

    if (!current || !newPass || !confirm) {
      this.passwordError.set('All password fields are required');
      return;
    }

    if (newPass.length < 6) {
      this.passwordError.set('New password must be at least 6 characters');
      return;
    }

    if (newPass !== confirm) {
      this.passwordError.set('New passwords do not match');
      return;
    }

    this.loading.set(true);

    try {
      const sessionId = this._authService.getSessionId();
      if (!sessionId) {
        this.passwordError.set('Not authenticated');
        return;
      }

      await this._authService.updatePassword(sessionId, current, newPass);
      this.passwordSuccess.set('Password updated successfully');
      this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      this.passwordError.set(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      this.loading.set(false);
    }
  }
}
