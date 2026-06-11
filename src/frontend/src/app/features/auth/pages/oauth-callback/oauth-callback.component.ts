import { Component, OnInit, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  template: `
    <div class="oauth-callback-container">
      <div class="loading-card">
        <div class="space-y-4">
          <div class="mx-auto h-14 w-14 rounded-full skeleton-shimmer"></div>
          <div class="h-7 w-44 mx-auto rounded skeleton-shimmer"></div>
          <div class="h-4 w-60 mx-auto rounded skeleton-shimmer"></div>
        </div>
        <p class="status-copy">{{ statusMessage() }}</p>
      </div>
    </div>
  `,
  styles: [`
    .oauth-callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    
    .loading-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 3rem;
      text-align: center;
      color: white;
    }

    .status-copy {
      margin: 1rem 0 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }

    p {
      margin: 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OAuthCallbackComponent implements OnInit {
  statusMessage = signal('Processing authentication...');

  private router = inject(Router);
  private authService = inject(AuthService);

  async ngOnInit(): Promise<void> {
    // Check for error in URL (from OAuth provider failures)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
      this.statusMessage.set('Authentication failed. Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/login'], { 
          queryParams: { error: error }
        });
      }, 1500);
      return;
    }

    // Fetch session from the short-lived httpOnly cookie via backend
    this.statusMessage.set('Retrieving session...');
    const sessionData = await this.authService.fetchOAuthSessionFromCookie();

    if (!sessionData) {
      this.statusMessage.set('Session expired or invalid. Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/login'], { 
          queryParams: { error: 'OAuth session expired' }
        });
      }, 1500);
      return;
    }

    try {
      // Handle OAuth callback with session data
      await this.authService.handleOAuthCallback(sessionData.sessionId, sessionData.playerId);
      
      this.statusMessage.set('Login successful! Redirecting...');
      
      // Navigate to main page
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 500);
    } catch (err) {
      console.error('OAuth callback error:', err);
      this.statusMessage.set('Login failed. Redirecting...');
      
      setTimeout(() => {
        this.router.navigate(['/login'], { 
          queryParams: { error: 'Failed to complete login' }
        });
      }, 1500);
    }
  }
}
