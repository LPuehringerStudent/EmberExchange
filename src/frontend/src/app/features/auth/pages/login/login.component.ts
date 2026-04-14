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

  private router = inject(Router);
  private authService = inject(AuthService);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    rememberMe: new FormControl(false)
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
    // Reset error message
    this.errorMessage.set('');

    // Validation
    if (this.loginForm.invalid) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);

    const { email, password, rememberMe } = this.loginForm.value;

    try {
      // Call auth service to login
      await this.authService.login(
        email!,
        password!,
        rememberMe ?? false
      );

      // Navigate to main page on success
      this.router.navigate(['/']);
    } catch (err) {
      // Display error message
      this.errorMessage.set(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
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
