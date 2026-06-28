import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule],
  templateUrl: './account.component.html',
  styleUrls: ['../../settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountComponent implements OnInit {
  username = signal<string>('');
  originalEmail = '';
  playerId = signal<number>(0);

  profileForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    motto: new FormControl('', [Validators.maxLength(100)])
  });
  isPublic = signal<boolean>(true);

  loading = signal<boolean>(false);
  profileSuccess = signal<string>('');
  profileError = signal<string>('');
  usernameError = signal<string>('');

  avatarPreview = signal<string | null>(null);
  avatarLoading = signal<boolean>(false);
  avatarError = signal<string>('');

  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _toastService = inject(ToastService);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (user) {
      this.username.set(user.username);
      this.originalEmail = user.email;
      this.playerId.set(user.playerId);
      this.profileForm.setValue({
        username: user.username,
        email: user.email,
        motto: (user as unknown as Record<string, string>)['motto'] || ''
      });
      this.isPublic.set((user as unknown as Record<string, boolean>)['isPublic'] ?? true);
      this.avatarPreview.set((user as unknown as Record<string, string | null>)['avatarUrl'] ?? null);
    } else {
      void this._router.navigate(['/login']);
    }
  }

  async saveProfile(): Promise<void> {
    this.profileSuccess.set('');
    this.profileError.set('');
    this.usernameError.set('');

    if (this.profileForm.invalid) {
      const usernameCtrl = this.profileForm.get('username');
      if (usernameCtrl?.hasError('required')) this.usernameError.set('Username is required');
      else if (usernameCtrl?.hasError('minlength')) this.usernameError.set('Username must be at least 3 characters');
      else if (usernameCtrl?.hasError('maxlength')) this.usernameError.set('Username must be at most 30 characters');
      this._toastService.error('Please fix the errors in the form');
      return;
    }

    const values = this.profileForm.value;
    const newUsername = values.username!.trim();
    const newEmail = values.email!.trim();
    const newMotto = (values.motto || '').trim();

    const payload: { username?: string; email?: string; motto?: string; isPublic?: boolean } = {};
    if (newUsername !== this.username()) payload.username = newUsername;
    if (newEmail !== this.originalEmail) payload.email = newEmail;
    const currentMotto = (this._authService.getCurrentUser() as unknown as Record<string, string>)?.['motto'] || '';
    if (newMotto !== currentMotto) payload.motto = newMotto;
    const currentIsPublic = (this._authService.getCurrentUser() as unknown as Record<string, boolean>)?.['isPublic'] ?? true;
    if (this.isPublic() !== currentIsPublic) payload.isPublic = this.isPublic();

    if (Object.keys(payload).length === 0) {
      this.profileError.set('No changes to save');
      return;
    }

    this.loading.set(true);

    try {
      await this._authService.updateProfile(this.playerId(), payload);
      this.profileSuccess.set('Profile updated successfully');
      this._toastService.success('Profile updated!', 'Your changes have been saved');
      if (payload.username) this.username.set(newUsername);
      if (payload.email) this.originalEmail = newEmail;
    } catch (err) {
      this.profileError.set(err instanceof Error ? err.message : 'Failed to update profile');
      this._toastService.error('Update failed', err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      this.loading.set(false);
    }
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.avatarError.set('');

    if (file.size > 1_500_000) {
      this.avatarError.set('Image must be smaller than 1.5 MB');
      return;
    }

    const dataUrl = await this.readFileAsDataUrl(file);
    this.avatarLoading.set(true);
    try {
      const result = await this._authService.updateAvatar(this.playerId(), dataUrl);
      this.avatarPreview.set(result.avatarUrl);
      this._toastService.success('Profile picture updated');
    } catch (err) {
      this.avatarError.set(err instanceof Error ? err.message : 'Failed to update profile picture');
      this._toastService.error('Upload failed', err instanceof Error ? err.message : 'Failed to update profile picture');
    } finally {
      this.avatarLoading.set(false);
      input.value = '';
    }
  }

  async clearAvatar(): Promise<void> {
    this.avatarLoading.set(true);
    this.avatarError.set('');
    try {
      await this._authService.updateAvatar(this.playerId(), null);
      this.avatarPreview.set(null);
      this._toastService.success('Profile picture removed');
    } catch (err) {
      this.avatarError.set(err instanceof Error ? err.message : 'Failed to remove profile picture');
    } finally {
      this.avatarLoading.set(false);
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  }
}
