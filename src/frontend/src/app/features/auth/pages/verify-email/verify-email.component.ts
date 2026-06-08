import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#1a0f0a] via-[#2d1b14] to-[#1a0f0a]">
      <div class="relative z-10 w-full max-w-[480px] bg-surface/95 backdrop-blur-lg rounded-3xl p-10 border-2 border-accent/25 shadow-[0_25px_80px_rgba(0,0,0,0.5)] text-center">
        @if (isLoading()) {
          <div class="text-5xl mb-5 animate-pulse">🔥</div>
          <h1 class="text-[1.85rem] font-bold mb-3 bg-gradient-to-br from-accent via-[#f48c06] to-[#ffba08] bg-clip-text text-transparent">
            Verifying...
          </h1>
          <p class="text-text-secondary">Please wait while we verify your email.</p>
        } @else if (isSuccess()) {
          <div class="text-5xl mb-5">✅</div>
          <h1 class="text-[1.85rem] font-bold mb-3 bg-gradient-to-br from-accent via-[#f48c06] to-[#ffba08] bg-clip-text text-transparent">
            Email Verified!
          </h1>
          <p class="text-text-secondary mb-6">
            Your account is now active. Welcome to Ember Exchange!
          </p>
          <a routerLink="/" class="inline-block px-6 py-4 bg-gradient-to-br from-accent to-[#f48c06] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_15px_rgba(232,93,4,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(232,93,4,0.5)] active:translate-y-0 no-underline">
            Enter the Forge
          </a>
        } @else {
          <div class="text-5xl mb-5">❌</div>
          <h1 class="text-[1.85rem] font-bold mb-3 text-red-500">
            Verification Failed
          </h1>
          <p class="text-text-secondary mb-6">
            {{ errorMessage() }}
          </p>
          <div class="flex flex-col gap-3">
            <a routerLink="/login" class="px-6 py-4 bg-gradient-to-br from-accent to-[#f48c06] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_15px_rgba(232,93,4,0.4)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(232,93,4,0.5)] active:translate-y-0 no-underline">
              Back to Login
            </a>
          </div>
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  isLoading = signal(true);
  isSuccess = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.isLoading.set(false);
      this.errorMessage.set('Missing verification token.');
      return;
    }

    this.verify(token);
  }

  async verify(token: string): Promise<void> {
    try {
      await this.authService.verifyEmail(token);
      this.isSuccess.set(true);
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Invalid or expired verification link.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
