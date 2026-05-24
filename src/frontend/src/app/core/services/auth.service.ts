import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import type { PlayerRow as Player } from '@shared/model';

const SESSION_ID_KEY = 'ember_session_id';
const REMEMBER_ME_KEY = 'ember_remember_me';

export type { Player };

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface AuthResponse {
  sessionId: string;
  playerId: number;
}

export interface TwoFALoginResponse {
  requires2FA: true;
  challengeId: string;
}

export interface TwoFASetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export interface OAuthStatus {
  google: boolean;
  github: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<Player | null>(null);
  private isAuthenticated = signal<boolean>(false);
  private sessionId = signal<string | null>(null);
  private pending2FAChallenge = signal<string | null>(null);

  private initResolve!: () => void;
  private initPromise = new Promise<void>(resolve => { this.initResolve = resolve; });
  ready = (): Promise<void> => this.initPromise;

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();
  readonly currentSessionId = this.sessionId.asReadonly();
  readonly twoFAChallenge = this.pending2FAChallenge.asReadonly();

  private api = inject(ApiService);
  private router = inject(Router);

  async initialize(): Promise<void> {
    try {
      const storedSessionId = this.getStoredSessionId();
      if (storedSessionId) {
        try {
          const player = await this.fetchCurrentUser(storedSessionId);
          if (player) {
            this.sessionId.set(storedSessionId);
            this.currentUser.set(player);
            this.isAuthenticated.set(true);
          } else {
            this.clearStoredSession();
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          this.clearStoredSession();
        }
      }
    } finally {
      this.initResolve();
    }
  }

  async login(usernameOrEmail: string, password: string, rememberMe: boolean): Promise<AuthResponse | TwoFALoginResponse> {
    const credentials: LoginRequest = {
      usernameOrEmail: usernameOrEmail.trim(),
      password
    };

    const response = await firstValueFrom(this.api.post<AuthResponse | TwoFALoginResponse>('/auth/login', credentials));

    if ('requires2FA' in response && response.requires2FA) {
      this.pending2FAChallenge.set(response.challengeId);
      return response;
    }

    await this.handleAuthResponse(response as AuthResponse, rememberMe);
    return response as AuthResponse;
  }

  async verify2FA(token: string, rememberMe: boolean): Promise<void> {
    const challengeId = this.pending2FAChallenge();
    if (!challengeId) {
      throw new Error('No pending 2FA challenge');
    }

    const response = await firstValueFrom(
      this.api.post<AuthResponse>('/auth/2fa/verify', { challengeId, token })
    );

    this.pending2FAChallenge.set(null);
    await this.handleAuthResponse(response, rememberMe);
  }

  cancel2FA(): void {
    this.pending2FAChallenge.set(null);
  }

  async register(username: string, password: string, email: string, rememberMe: boolean): Promise<void> {
    const data: RegisterRequest = {
      username: username.trim(),
      password,
      email: email.trim()
    };

    const response = await firstValueFrom(this.api.post<AuthResponse>('/auth/register', data));
    await this.handleAuthResponse(response, rememberMe);
  }

  async logout(): Promise<void> {
    const currentSessionId = this.sessionId();
    if (currentSessionId) {
      try {
        await firstValueFrom(this.api.post<void>('/auth/logout', null, new HttpHeaders({ 'session-id': currentSessionId })));
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    this.clearAuthState();
    void this.router.navigate(['/']);
  }

  getCurrentUser(): Player | null {
    return this.currentUser();
  }

  /**
   * Updates the cached current-user coin balance in-place.
   * Used by the WebSocket service so the header coin display
   * stays in sync with in-game winnings/losses without an extra HTTP round-trip.
   */
  patchCurrentUserCoins(coins: number): void {
    const user = this.currentUser();
    if (user) {
      this.currentUser.set({ ...user, coins });
    }
  }

  private async fetchCurrentUser(sessionId: string): Promise<Player | null> {
    return firstValueFrom(
      this.api.get<Player | null>('/auth/me', new HttpHeaders({ 'session-id': sessionId }))
    ).catch(err => {
      if (err instanceof Error && err.message.includes('401')) {
        return null;
      }
      throw err;
    });
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated();
  }

  getSessionId(): string | null {
    return this.sessionId();
  }

  async refreshUser(): Promise<void> {
    const currentSessionId = this.sessionId();
    if (!currentSessionId) {
      return;
    }

    try {
      const player = await this.fetchCurrentUser(currentSessionId);
      if (player) {
        this.currentUser.set(player);
      } else {
        this.clearAuthState();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }

  private async handleAuthResponse(response: AuthResponse, rememberMe: boolean): Promise<void> {
    this.sessionId.set(response.sessionId);
    this.isAuthenticated.set(true);
    this.storeSession(response.sessionId, rememberMe);

    const player = await this.fetchCurrentUser(response.sessionId);
    if (player) {
      this.currentUser.set(player);
    }
  }

  private storeSession(sessionId: string, rememberMe: boolean): void {
    if (rememberMe) {
      localStorage.setItem(SESSION_ID_KEY, sessionId);
      localStorage.setItem(REMEMBER_ME_KEY, 'true');
    } else {
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }

  private getStoredSessionId(): string | null {
    return localStorage.getItem(SESSION_ID_KEY) ?? sessionStorage.getItem(SESSION_ID_KEY);
  }

  private clearStoredSession(): void {
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(REMEMBER_ME_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
  }

  private clearAuthState(): void {
    this.sessionId.set(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.pending2FAChallenge.set(null);
    this.clearStoredSession();
  }

  async handleOAuthCallback(sessionId: string, playerId: number, rememberMe = false): Promise<void> {
    const response: AuthResponse = { sessionId, playerId };
    await this.handleAuthResponse(response, rememberMe);
  }

  async getOAuthStatus(): Promise<OAuthStatus> {
    return firstValueFrom(this.api.get<OAuthStatus>('/oauth/status'));
  }

  loginWithGoogle(): void {
    window.location.href = '/api/oauth/google';
  }

  loginWithGitHub(): void {
    window.location.href = '/api/oauth/github';
  }

  async updateEmail(sessionId: string, email: string): Promise<void> {
    await firstValueFrom(
      this.api.patch<void>('/auth/me', { email }, new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async updatePassword(sessionId: string, currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.api.patch<void>('/auth/password', { currentPassword, newPassword }, new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async deleteAccount(sessionId: string): Promise<void> {
    await firstValueFrom(
      this.api.delete<void>('/auth/me', new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async getSessions(): Promise<{ sessionId: string; createdAt: string; expiresAt: string }[]> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.get<{ sessionId: string; createdAt: string; expiresAt: string }[]>('/auth/sessions', new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async logoutAllDevices(): Promise<{ message: string; closed: number }> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.delete<{ message: string; closed: number }>('/auth/sessions', new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async updateProfile(playerId: number, profile: { username?: string; email?: string; motto?: string; isPublic?: boolean }): Promise<void> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    await firstValueFrom(
      this.api.patch<void>(`/players/${playerId}/profile`, profile, new HttpHeaders({ 'session-id': sessionId }))
    );
    await this.refreshUser();
  }

  async getNotificationSettings(playerId: number): Promise<{ playerId: number; notifyFriendRequests: boolean; notifyChatMessages: boolean; notifyTradeOffers: boolean; notifyDailyReward: boolean }> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.get<{ playerId: number; notifyFriendRequests: boolean; notifyChatMessages: boolean; notifyTradeOffers: boolean; notifyDailyReward: boolean }>(`/players/${playerId}/settings`, new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async updateNotificationSettings(playerId: number, settings: Partial<{ notifyFriendRequests: boolean; notifyChatMessages: boolean; notifyTradeOffers: boolean; notifyDailyReward: boolean }>): Promise<void> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    await firstValueFrom(
      this.api.patch<void>(`/players/${playerId}/settings`, settings, new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  // ─── 2FA Methods ───

  async get2FAStatus(): Promise<{ enabled: boolean }> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.get<{ enabled: boolean }>('/auth/2fa/status', new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async setup2FA(): Promise<TwoFASetupResponse> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.post<TwoFASetupResponse>('/auth/2fa/setup', null, new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async confirm2FA(token: string): Promise<{ message: string }> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.post<{ message: string }>('/auth/2fa/confirm', { token }, new HttpHeaders({ 'session-id': sessionId }))
    );
  }

  async disable2FA(password: string): Promise<{ message: string }> {
    const sessionId = this.getSessionId();
    if (!sessionId) throw new Error('Not authenticated');
    return firstValueFrom(
      this.api.delete<{ message: string }>('/auth/2fa', new HttpHeaders({ 'session-id': sessionId }), { password })
    );
  }
}
