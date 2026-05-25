import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

interface SessionInfo {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

@Component({
  selector: 'app-security',
  imports: [DatePipe, ReactiveFormsModule, FormsModule],
  templateUrl: './security.component.html',
  styleUrls: ['../../settings.component.css', './security.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityComponent implements OnInit {
  sessions = signal<SessionInfo[]>([]);
  loading = signal<boolean>(false);
  logoutAllSuccess = signal<string>('');
  logoutAllError = signal<string>('');

  passwordForm = new FormGroup({
    currentPassword: new FormControl(''),
    newPassword: new FormControl(''),
    confirmPassword: new FormControl('')
  });
  passwordSuccess = signal<string>('');
  passwordError = signal<string>('');
  passwordLoading = signal<boolean>(false);

  twoFAEnabled = signal<boolean>(false);
  twoFALoading = signal<boolean>(false);
  twoFASetupMode = signal<boolean>(false);
  twoFAQrCode = signal<string>('');
  twoFASecret = signal<string>('');
  twoFAVerifyCode = signal<string>('');
  twoFASuccess = signal<string>('');
  twoFAError = signal<string>('');
  twoFADisablePassword = signal<string>('');
  isOAuthUser = signal<boolean>(false);

  private _authService = inject(AuthService);
  private _router = inject(Router);

  ngOnInit(): void {
    void this.loadSessions();
    void this.load2FAStatus();
    const user = this._authService.getCurrentUser();
    this.isOAuthUser.set(!!user?.provider);
  }

  async load2FAStatus(): Promise<void> {
    try {
      const status = await this._authService.get2FAStatus();
      this.twoFAEnabled.set(status.enabled);
    } catch (err) {
      console.error('Failed to load 2FA status:', err);
    }
  }

  async start2FASetup(): Promise<void> {
    this.twoFALoading.set(true);
    this.twoFAError.set('');
    this.twoFASuccess.set('');
    try {
      const result = await this._authService.setup2FA();
      this.twoFAQrCode.set(result.qrCodeDataUrl);
      this.twoFASecret.set(result.secret);
      this.twoFASetupMode.set(true);
    } catch (err) {
      this.twoFAError.set(err instanceof Error ? err.message : 'Failed to start 2FA setup');
    } finally {
      this.twoFALoading.set(false);
    }
  }

  async confirm2FASetup(): Promise<void> {
    this.twoFAError.set('');
    this.twoFASuccess.set('');
    const code = this.twoFAVerifyCode().trim();
    if (!code || code.length !== 6) {
      this.twoFAError.set('Please enter a valid 6-digit code');
      return;
    }
    this.twoFALoading.set(true);
    try {
      await this._authService.confirm2FA(code);
      this.twoFASuccess.set('Two-factor authentication enabled successfully');
      this.twoFAEnabled.set(true);
      this.twoFASetupMode.set(false);
      this.twoFAQrCode.set('');
      this.twoFASecret.set('');
      this.twoFAVerifyCode.set('');
    } catch (err) {
      this.twoFAError.set(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      this.twoFALoading.set(false);
    }
  }

  cancel2FASetup(): void {
    this.twoFASetupMode.set(false);
    this.twoFAQrCode.set('');
    this.twoFASecret.set('');
    this.twoFAVerifyCode.set('');
    this.twoFAError.set('');
  }

  async disable2FA(): Promise<void> {
    this.twoFAError.set('');
    this.twoFASuccess.set('');
    const password = this.twoFADisablePassword().trim();
    if (!password) {
      this.twoFAError.set('Password is required to disable 2FA');
      return;
    }
    this.twoFALoading.set(true);
    try {
      await this._authService.disable2FA(password);
      this.twoFASuccess.set('Two-factor authentication disabled');
      this.twoFAEnabled.set(false);
      this.twoFADisablePassword.set('');
    } catch (err) {
      this.twoFAError.set(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      this.twoFALoading.set(false);
    }
  }

  async loadSessions(): Promise<void> {
    this.loading.set(true);
    try {
      const currentSessionId = this._authService.getSessionId();
      const rawSessions = await this._authService.getSessions();
      this.sessions.set(rawSessions.map(s => ({
        ...s,
        isCurrent: s.sessionId === currentSessionId
      })));
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async logoutAllDevices(): Promise<void> {
    this.logoutAllSuccess.set('');
    this.logoutAllError.set('');
    this.loading.set(true);

    try {
      const result = await this._authService.logoutAllDevices();
      this.logoutAllSuccess.set(`Logged out ${result.closed} other device(s)`);
      await this.loadSessions();
    } catch (err) {
      this.logoutAllError.set(err instanceof Error ? err.message : 'Failed to log out devices');
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

    this.passwordLoading.set(true);

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
      this.passwordLoading.set(false);
    }
  }
}
