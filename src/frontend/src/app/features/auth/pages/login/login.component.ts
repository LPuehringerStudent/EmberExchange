import { Component, signal, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  // Signals for reactive state (Angular 21 best practice)
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  rememberMe = signal(false);
  googleEnabled = signal(false);
  githubEnabled = signal(false);
  show2FA = signal(false);
  twoFACode = signal('');

  private router = inject(Router);
  private authService = inject(AuthService);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    rememberMe: new FormControl(false)
  });

  twoFAForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.pattern(/^\d{6}$/)])
  });

  async ngOnInit(): Promise<void> {
    // Check if there's an OAuth error in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    if (oauthError) {
      this.errorMessage.set(decodeURIComponent(oauthError));
    }

    // Load OAuth provider status
    try {
      const status = await this.authService.getOAuthStatus();
      this.googleEnabled.set(status.google);
      this.githubEnabled.set(status.github);
    } catch {
      // OAuth status fetch failed, buttons will remain disabled
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');

    if (this.loginForm.invalid) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      const result = await this.authService.login(
        email!,
        password!,
        rememberMe ?? false
      );

      if ('requires2FA' in result) {
        this.show2FA.set(true);
        this.rememberMe.set(rememberMe ?? false);
      } else {
        this.router.navigate(['/']);
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onVerify2FA(): Promise<void> {
    this.errorMessage.set('');

    if (this.twoFAForm.invalid) {
      this.errorMessage.set('Please enter a valid 6-digit code');
      return;
    }

    this.isLoading.set(true);

    try {
      await this.authService.verify2FA(
        this.twoFAForm.value.code!,
        this.rememberMe()
      );
      this.router.navigate(['/']);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Invalid code. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  cancel2FA(): void {
    this.show2FA.set(false);
    this.twoFAForm.reset();
    this.authService.cancel2FA();
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  loginWithGoogle(): void {
    if (this.googleEnabled()) {
      this.authService.loginWithGoogle();
    }
  }

  loginWithGitHub(): void {
    if (this.githubEnabled()) {
      this.authService.loginWithGitHub();
    }
  }
}
