import { Component, signal, OnInit, ChangeDetectionStrategy, inject, ViewChild, ElementRef } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, VerificationRequiredError } from '@core/services/auth.service';
import { TurnstileService } from '@core/services/turnstile.service';

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
  turnstileWidgetId = signal<string | null>(null);
  turnstileReady = signal(false);
  turnstileError = signal(false);
  formStartTime = signal<number>(0);
  isWrongDomain = signal(false);
  isLocalhost = signal(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  @ViewChild('turnstileContainer', { static: false }) turnstileContainer!: ElementRef<HTMLDivElement>;

  private router = inject(Router);
  private authService = inject(AuthService);
  private turnstileService = inject(TurnstileService);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    rememberMe: new FormControl(false),
    website: new FormControl('') // honeypot — hidden via CSS
  });

  twoFAForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.pattern(/^\d{6}$/)])
  });

  async ngOnInit(): Promise<void> {
    // Set form start time for timing analysis (backend rejects instant submissions)
    this.formStartTime.set(Date.now());

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

    // Initialize Turnstile widget (skip on localhost)
    if (!this.isLocalhost()) {
      try {
        await this.turnstileService.initialize();
        // Widget will be rendered after view init via a timeout
        setTimeout(() => this.renderTurnstile(), 100);
      } catch {
        console.error('Failed to initialize Turnstile');
      }
    }
  }

  private renderTurnstile(): void {
    if (!this.turnstileContainer?.nativeElement) return;
    const widgetId = this.turnstileService.render(
      this.turnstileContainer.nativeElement,
      () => this.turnstileReady.set(true)
    );
    if (widgetId) {
      this.turnstileWidgetId.set(widgetId);
    }
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');
    this.turnstileError.set(false);
    this.isWrongDomain.set(false);

    if (this.loginForm.invalid) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    const widgetId = this.turnstileWidgetId();
    if (!this.isLocalhost() && (!widgetId || !this.turnstileService.isReady(widgetId))) {
      this.turnstileError.set(true);
      // If on the wrong domain, Turnstile invisible mode will silently fail
      if (window.location.hostname.includes('onrender.com')) {
        this.isWrongDomain.set(true);
      }
      return;
    }

    this.isLoading.set(true);

    const { email, password, rememberMe } = this.loginForm.value;
    const turnstileToken = this.isLocalhost() || !widgetId ? undefined : this.turnstileService.getToken(widgetId);

    try {
      const result = await this.authService.login(
        email!,
        password!,
        rememberMe ?? false,
        turnstileToken ?? undefined,
        this.formStartTime()
      );

      if ('requires2FA' in result) {
        this.show2FA.set(true);
        this.rememberMe.set(rememberMe ?? false);
      } else {
        this.router.navigate(['/']);
      }
    } catch (err) {
      if (err instanceof VerificationRequiredError) {
        this.router.navigate(['/check-email'], { state: { email: err.email } });
        return;
      }
      this.errorMessage.set(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
      const widgetId = this.turnstileWidgetId();
      if (widgetId) {
        this.turnstileService.reset(widgetId);
        this.turnstileReady.set(false);
      }
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
    // Re-render Turnstile widget when returning to the login form (skip on localhost)
    if (!this.isLocalhost()) {
      setTimeout(() => this.renderTurnstile(), 50);
    }
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  loginWithGoogle(): void {
    if (!this.googleEnabled()) return;

    const widgetId = this.turnstileWidgetId();
    if (!this.isLocalhost() && (!widgetId || !this.turnstileService.isReady(widgetId))) {
      this.turnstileError.set(true);
      return;
    }

    const token = this.isLocalhost() || !widgetId
      ? undefined
      : this.turnstileService.getToken(widgetId) ?? undefined;
    this.authService.loginWithGoogle(token);
  }

  loginWithGitHub(): void {
    if (!this.githubEnabled()) return;

    const widgetId = this.turnstileWidgetId();
    if (!this.isLocalhost() && (!widgetId || !this.turnstileService.isReady(widgetId))) {
      this.turnstileError.set(true);
      return;
    }

    const token = this.isLocalhost() || !widgetId
      ? undefined
      : this.turnstileService.getToken(widgetId) ?? undefined;
    this.authService.loginWithGitHub(token);
  }
}
