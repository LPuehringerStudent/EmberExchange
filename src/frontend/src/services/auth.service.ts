import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  login,
  register,
  logout as logoutApi,
  getCurrentUser,
  getOAuthStatus,
  OAuthStatus,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Player
} from '../app/fetchers/auth.fetcher';

const SESSION_ID_KEY = 'ember_session_id';
const REMEMBER_ME_KEY = 'ember_remember_me';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Reactive signals for auth state
  private currentUser = signal<Player | null>(null);
  private isAuthenticated = signal<boolean>(false);
  private sessionId = signal<string | null>(null);

  // Expose readonly signals
  public readonly user = this.currentUser.asReadonly();
  public readonly authenticated = this.isAuthenticated.asReadonly();
  public readonly currentSessionId = this.sessionId.asReadonly();

  constructor(private router: Router) {}

  /**
   * Initializes authentication state from storage.
   * Should be called on app startup.
   */
  async initialize(): Promise<void> {
    // Try to get session from storage
    const storedSessionId = this.getStoredSessionId();
    
    if (!storedSessionId) {
      return;
    }

    try {
      // Validate session with backend
      const player = await getCurrentUser(storedSessionId);
      
      if (player) {
        this.sessionId.set(storedSessionId);
        this.currentUser.set(player);
        this.isAuthenticated.set(true);
      } else {
        // Session invalid, clear storage
        this.clearStoredSession();
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.clearStoredSession();
    }
  }

  /**
   * Logs in a player with credentials.
   * @param usernameOrEmail - Username or email address
   * @param password - Password
   * @param rememberMe - Whether to persist session across browser restarts
   */
  async login(usernameOrEmail: string, password: string, rememberMe: boolean): Promise<void> {
    const credentials: LoginRequest = {
      usernameOrEmail: usernameOrEmail.trim(),
      password
    };

    const response = await login(credentials);
    await this.handleAuthResponse(response, rememberMe);
  }

  /**
   * Registers a new player account and logs them in.
   * @param username - Username
   * @param password - Password
   * @param email - Email address
   * @param rememberMe - Whether to persist session across browser restarts
   */
  async register(username: string, password: string, email: string, rememberMe: boolean): Promise<void> {
    const data: RegisterRequest = {
      username: username.trim(),
      password,
      email: email.trim()
    };

    const response = await register(data);
    await this.handleAuthResponse(response, rememberMe);
  }

  /**
   * Logs out the current player.
   */
  async logout(): Promise<void> {
    const currentSessionId = this.sessionId();
    
    if (currentSessionId) {
      try {
        await logoutApi(currentSessionId);
      } catch (error) {
        console.error('Logout API call failed:', error);
        // Continue with local logout even if API fails
      }
    }

    this.clearAuthState();
    this.router.navigate(['/login']);
  }

  /**
   * Gets the current user data.
   * @returns Current player or null if not authenticated
   */
  getCurrentUser(): Player | null {
    return this.currentUser();
  }

  /**
   * Checks if a user is currently logged in.
   * @returns True if authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Gets the current session ID.
   * @returns Session ID or null if not authenticated
   */
  getSessionId(): string | null {
    return this.sessionId();
  }

  /**
   * Refreshes the current user data from the server.
   * Useful after operations that might change user stats.
   */
  async refreshUser(): Promise<void> {
    const currentSessionId = this.sessionId();
    if (!currentSessionId) {
      return;
    }

    try {
      const player = await getCurrentUser(currentSessionId);
      if (player) {
        this.currentUser.set(player);
      } else {
        // Session expired, log out
        this.clearAuthState();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  /**
   * Handles successful authentication response.
   */
  private async handleAuthResponse(response: AuthResponse, rememberMe: boolean): Promise<void> {
    this.sessionId.set(response.sessionId);
    this.isAuthenticated.set(true);
    
    // Store session
    this.storeSession(response.sessionId, rememberMe);

    // Fetch full user data
    const player = await getCurrentUser(response.sessionId);
    if (player) {
      this.currentUser.set(player);
    }
  }

  /**
   * Stores session ID in appropriate storage.
   */
  private storeSession(sessionId: string, rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem(SESSION_ID_KEY, sessionId);
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }

  /**
   * Gets stored session ID from storage.
   */
  private getStoredSessionId(): string | null {
    // Try localStorage first (remember me)
    const localSession = localStorage.getItem(SESSION_ID_KEY);
    if (localSession) {
      return localSession;
    }

    // Then try sessionStorage
    return sessionStorage.getItem(SESSION_ID_KEY);
  }

  /**
   * Clears stored session from all storage.
   */
  private clearStoredSession(): void {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
  }

  /**
   * Clears all auth state.
   */
  private clearAuthState(): void {
    this.sessionId.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.clearStoredSession();
  }

  /**
   * Handles OAuth callback with session data from URL params.
   * @param sessionId - Session ID from OAuth callback
   * @param playerId - Player ID from OAuth callback
   * @param rememberMe - Whether to persist session across browser restarts
   */
  async handleOAuthCallback(sessionId: string, playerId: number, rememberMe: boolean = false): Promise<void> {
    const response: AuthResponse = { sessionId, playerId };
    await this.handleAuthResponse(response, rememberMe);
  }

  /**
   * Gets OAuth provider configuration status.
   * @returns OAuth status indicating which providers are available
   */
  async getOAuthStatus(): Promise<OAuthStatus> {
    return getOAuthStatus();
  }

  /**
   * Redirects to Google OAuth login.
   */
  loginWithGoogle(): void {
    window.location.href = '/api/oauth/google';
  }

  /**
   * Redirects to GitHub OAuth login.
   */
  loginWithGitHub(): void {
    window.location.href = '/api/oauth/github';
  }
}
