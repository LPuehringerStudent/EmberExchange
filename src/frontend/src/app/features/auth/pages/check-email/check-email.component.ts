import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-check-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#1a0f0a] via-[#2d1b14] to-[#1a0f0a]">
      <div class="relative z-10 w-full max-w-[480px] bg-surface/95 backdrop-blur-lg rounded-3xl p-10 border-2 border-accent/25 shadow-[0_25px_80px_rgba(0,0,0,0.5)] text-center">
        <div class="text-5xl mb-5">📧</div>
        <h1 class="text-[1.85rem] font-bold mb-3 bg-gradient-to-br from-accent via-[#f48c06] to-[#ffba08] bg-clip-text text-transparent">
          Check Your Email
        </h1>
        <p class="text-text-secondary mb-2">
          We sent a verification link to <strong class="text-text-primary">{{ email() }}</strong>.
          Click the link in the email to activate your account.
        </p>
        <p class="text-text-muted text-sm mb-6">
          📨 Can't find it? Check your <strong>spam folder</strong> or <strong>promotions tab</strong>.
          If it's in spam, click "Report not spam" to help us land in your inbox next time.
        </p>

        @if (errorMessage()) {
          <div class="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm mb-4">
            {{ errorMessage() }}
          </div>
        }

        @if (successMessage()) {
          <div class="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-600 text-sm mb-4">
            {{ successMessage() }}
          </div>
        }

        <div class="flex flex-col gap-3">
          <button
            (click)="resend()"
            [disabled]="isLoading() || cooldown() > 0"
            class="w-full px-6 py-4 bg-gradient-to-br from-accent to-[#f48c06] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_15px_rgba(232,93,4,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(232,93,4,0.5)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            @if (isLoading()) {
              <span>Sending...</span>
            } @else if (cooldown() > 0) {
              <span>Resend in {{ cooldown() }}s</span>
            } @else {
              <span>Resend Email</span>
            }
          </button>

          <a routerLink="/login" class="px-6 py-4 bg-surface-secondary text-text-secondary rounded-xl text-base font-semibold transition-all duration-200 border-none hover:bg-surface-secondary hover:-translate-y-0.5 no-underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  `
})
export class CheckEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  email = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  cooldown = signal(0);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email.set(params['email'] ?? '');
    });
  }

  async resend(): Promise<void> {
    if (!this.email() || this.cooldown() > 0) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const result = await this.authService.resendVerification(this.email());
      this.successMessage.set(result.message);
      this.startCooldown(60);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Failed to resend email. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private startCooldown(seconds: number): void {
    this.cooldown.set(seconds);
    const interval = setInterval(() => {
      this.cooldown.update(v => {
        if (v <= 1) {
          clearInterval(interval);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }
}
