import { Component, signal, inject, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { TurnstileService } from '@core/services/turnstile.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent implements OnInit {
  // Form signals
  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  honeypotWebsite = signal(''); // honeypot — real users leave empty

  // UI state signals
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  currentStep = signal(1);
  acceptedTerms = signal(false);
  turnstileWidgetId = signal<string | null>(null);
  googleEnabled = signal(false);
  githubEnabled = signal(false);
  turnstileReady = signal(false);
  turnstileError = signal(false);
  formStartTime = signal<number>(0);
  isWrongDomain = signal(false);
  isLocalhost = signal(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  powChallenge = signal<string | null>(null);
  powDifficulty = signal<number>(0);
  powSolving = signal(false);

  // Password strength
  passwordStrength = signal(0);
  strengthLabel = signal('Cold Ash');
  strengthColor = signal('#6c757d');

  @ViewChild('turnstileContainer', { static: false }) turnstileContainer!: ElementRef<HTMLDivElement>;

  private router = inject(Router);
  private authService = inject(AuthService);
  private turnstileService = inject(TurnstileService);

  updatePasswordStrength(password: string): void {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    this.passwordStrength.set(strength);

    const labels = ['Cold Ash', 'Dying Ember', 'Growing Flame', 'Blazing Fire', 'Inferno'];
    const colors = ['#6c757d', '#8b4513', '#e85d04', '#f48c06', '#dc3545'];

    this.strengthLabel.set(labels[strength]);
    this.strengthColor.set(colors[strength]);
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
    this.updatePasswordStrength(value);
  }

  nextStep(): void {
    if (this.currentStep() === 1) {
      if (!this.username().trim() || !this.email().trim()) {
        this.errorMessage.set('Fill all fields');
        return;
      }
      if (!this.isValidEmail(this.email())) {
        this.errorMessage.set('Enter a valid E-Mail address');
        return;
      }
    }

    if (this.currentStep() === 2) {
      if (!this.password() || !this.confirmPassword()) {
        this.errorMessage.set('Both password fields required');
        return;
      }
      if (this.password() !== this.confirmPassword()) {
        this.errorMessage.set('Passwords do not match');
        return;
      }
      if (this.password().length < 8) {
        this.errorMessage.set('Password too weak — must be at least 8 characters');
        return;
      }
    }

    this.errorMessage.set('');
    this.currentStep.update(s => s + 1);

    // Render Turnstile widget and fetch PoW challenge when reaching the final step (skip on localhost)
    if (this.currentStep() === 3) {
      if (!this.isLocalhost()) {
        setTimeout(() => this.renderTurnstile(), 50);
      }
      // Fetch proof-of-work challenge
      this.fetchPowChallenge().catch(() => {
        this.errorMessage.set('Failed to load security challenge. Please refresh.');
      });
    }
  }

  prevStep(): void {
    this.errorMessage.set('');
    this.currentStep.update(s => s - 1);
  }

  async onSubmit(): Promise<void> {
    this.errorMessage.set('');
    this.turnstileError.set(false);
    this.isWrongDomain.set(false);

    if (!this.acceptedTerms()) {
      this.errorMessage.set('You must accept the terms and conditions');
      return;
    }

    const widgetId = this.turnstileWidgetId();
    if (!this.isLocalhost() && (!widgetId || !this.turnstileService.isReady(widgetId))) {
      this.turnstileError.set(true);
      if (window.location.hostname.includes('onrender.com')) {
        this.isWrongDomain.set(true);
      }
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const turnstileToken = this.isLocalhost() || !widgetId ? undefined : this.turnstileService.getToken(widgetId);

    // Solve proof-of-work challenge
    const challenge = this.powChallenge();
    const difficulty = this.powDifficulty();
    let powNonce: string | undefined;
    if (challenge && difficulty > 0) {
      this.powSolving.set(true);
      try {
        powNonce = await this.authService.solvePow(challenge, difficulty);
      } finally {
        this.powSolving.set(false);
      }
    }

    try {
      const result = await this.authService.register(
        this.username(),
        this.password(),
        this.email(),
        turnstileToken ?? undefined,
        this.formStartTime(),
        challenge ?? undefined,
        powNonce
      );
      this.successMessage.set(result.message);
      setTimeout(() => {
        this.router.navigate(['/check-email'], { queryParams: { email: this.email() } });
      }, 1500);
    } catch (err) {
      this.isLoading.set(false);
      this.errorMessage.set(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      if (widgetId) {
        this.turnstileService.reset(widgetId);
        this.turnstileReady.set(false);
      }
    }
  }

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

    try {
      await this.turnstileService.initialize();
    } catch {
      console.error('Failed to initialize Turnstile');
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

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword.update(v => !v);
    } else {
      this.showConfirmPassword.update(v => !v);
    }
  }

  registerWithGoogle(): void {
    if (this.googleEnabled()) {
      this.authService.loginWithGoogle();
    }
  }

  registerWithGitHub(): void {
    if (this.githubEnabled()) {
      this.authService.loginWithGitHub();
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async fetchPowChallenge(): Promise<void> {
    const { challenge, difficulty } = await this.authService.getPowChallenge();
    this.powChallenge.set(challenge);
    this.powDifficulty.set(difficulty);
  }
}
