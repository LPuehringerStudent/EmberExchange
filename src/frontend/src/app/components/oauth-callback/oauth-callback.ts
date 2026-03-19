import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-oauth-callback',
  template: `
    <div class="oauth-callback-container">
      <div class="loading-card">
        <div class="spinner"></div>
        <h2>Completing Login...</h2>
        <p>{{ statusMessage() }}</p>
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
    
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.1);
      border-top-color: #ff6b35;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
    }
    
    p {
      margin: 0;
      opacity: 0.8;
      font-size: 0.9rem;
    }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  statusMessage = signal('Processing authentication...');

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    // Get session data from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const playerId = urlParams.get('playerId');
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

    if (!sessionId || !playerId) {
      this.statusMessage.set('Invalid callback. Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/login'], { 
          queryParams: { error: 'Invalid OAuth callback' }
        });
      }, 1500);
      return;
    }

    try {
      // Handle OAuth callback with session data
      await this.authService.handleOAuthCallback(sessionId, parseInt(playerId, 10));
      
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
