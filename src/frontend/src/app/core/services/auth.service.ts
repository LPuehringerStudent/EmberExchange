import { HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService, ApiError } from './api.service';
import type { PlayerRow as Player } from '@shared/model';

const SESSION_ID_KEY = 'ember_session_id';
const REMEMBER_ME_KEY = 'ember_remember_me';

export type { Player };

export class VerificationRequiredError extends Error {
  constructor(public email: string) {
    super('Please verify your email before logging in.');
  }
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
  turnstileToken?: string;
  formStartTime?: number;
  [key: string]: unknown;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  turnstileToken?: string;
  formStartTime?: number;
  powChallenge?: string;
  powNonce?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  sessionId: string;
  playerId: number;
  requiresEmailVerification?: boolean;
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
  private emailVerified = signal<boolean>(true);

  private initResolve!: () => void;
  private initPromise = new Promise<void>(resolve => { this.initResolve = resolve; });
  ready = (): Promise<void> => this.initPromise;

  readonly user = this.currentUser.asReadonly();
  readonly authenticated = this.isAuthenticated.asReadonly();
  readonly currentSessionId = this.sessionId.asReadonly();
  readonly twoFAChallenge = this.pending2FAChallenge.asReadonly();
  readonly isEmailVerified = this.emailVerified.asReadonly();

  private api = inject(ApiService);
  private router = inject(Router);

  /** Anti-bot config — hardcoded to match backend production values.
   *  Previously injected at runtime into index.html, but that exposed
   *  the config to a single curl. Now compiled into the bundle. */
  private abConfig = {
    honeypotField: 'l52csb',
    minFormTime: 3000,
    clientHeader: 'X-DTOTF-JXLBHU',
    clientHeaderValue: 'vqd7-pf16',
  };

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

  async login(usernameOrEmail: string, password: string, rememberMe: boolean, turnstileToken?: string, formStartTime?: number): Promise<AuthResponse | TwoFALoginResponse> {
    const credentials: LoginRequest = {
      usernameOrEmail: usernameOrEmail.trim(),
      password,
      turnstileToken,
      formStartTime,
      // Decoy honeypot fields — visible in source, do nothing on backend
      website: '',
      company: '',
      // Real honeypot field — name comes from runtime config, invisible in source
      [this.abConfig?.['honeypotField'] ?? 'honeypot']: '',
    };

    try {
      const response = await firstValueFrom(this.api.post<AuthResponse | TwoFALoginResponse>('/auth/login', credentials));

      if ('requires2FA' in response && response.requires2FA) {
        this.pending2FAChallenge.set(response.challengeId);
        return response;
      }

      await this.handleAuthResponse(response as AuthResponse, rememberMe);
      // If email verification is required, update the signal
      if ('requiresEmailVerification' in response && response.requiresEmailVerification) {
        this.emailVerified.set(false);
      }
      return response as AuthResponse;
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        const body = err.responseBody as { requiresVerification?: boolean; email?: string } | undefined;
        if (body?.requiresVerification) {
          throw new VerificationRequiredError(body.email ?? '');
        }
      }
      throw err;
    }
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

  async getPowChallenge(): Promise<{ challenge: string; difficulty: number }> {
    return firstValueFrom(this.api.get<{ challenge: string; difficulty: number }>('/auth/challenge'));
  }

  async solvePow(challenge: string, difficulty: number): Promise<string> {
    let nonce = 0;
    const target = '0'.repeat(difficulty);
    const batchSize = 15000;
    while (true) {
      for (let i = 0; i < batchSize; i++) {
        const hash = this.sha256(challenge + nonce);
        if (hash.startsWith(target)) {
          return String(nonce);
        }
        nonce++;
      }
      // Yield control back to browser every batch to prevent UI freeze
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  private sha256(input: string): string {
    // Simple UTF-8 → hex sha256 using SubtleCrypto if available,
    // but we need synchronous hashing. Use a basic implementation
    // or just call out to a helper. Since we can't easily do sync crypto
    // in browser, we'll use a simple approach: pre-compute via a web worker
    // or just use a fast pure-JS implementation. For now, let's use a
    // lightweight approach with TextEncoder + subtle crypto is async.
    // We'll implement a simple synchronous sha256 using a well-known approach.
    return this.syncSha256(input);
  }

  private syncSha256(message: string): string {
    // Pure JS SHA-256 implementation (synchronous)
    function rotr(n: number, x: number): number {
      return (x >>> n) | (x << (32 - n));
    }
    function sigma0(x: number): number { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
    function sigma1(x: number): number { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
    function gamma0(x: number): number { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3); }
    function gamma1(x: number): number { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10); }
    function ch(x: number, y: number, z: number): number { return (x & y) ^ (~x & z); }
    function maj(x: number, y: number, z: number): number { return (x & y) ^ (x & z) ^ (y & z); }

    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
    let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

    const msg = new TextEncoder().encode(message);
    const bitLen = msg.length * 8;
    const padLen = Math.ceil((msg.length + 9) / 64) * 64;
    const padded = new Uint8Array(padLen);
    padded.set(msg);
    padded[msg.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padLen - 4, bitLen, false);

    for (let i = 0; i < padLen; i += 64) {
      const W = new Uint32Array(64);
      for (let t = 0; t < 16; t++) {
        W[t] = view.getUint32(i + t * 4, false);
      }
      for (let t = 16; t < 64; t++) {
        W[t] = (gamma1(W[t - 2]) + W[t - 7] + gamma0(W[t - 15]) + W[t - 16]) >>> 0;
      }

      let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;
      for (let t = 0; t < 64; t++) {
        const T1 = (h + sigma1(e) + ch(e, f, g) + K[t] + W[t]) >>> 0;
        const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
        h = g; g = f; f = e; e = (d + T1) >>> 0; d = c; c = b; b = a; a = (T1 + T2) >>> 0;
      }
      H0 = (H0 + a) >>> 0; H1 = (H1 + b) >>> 0; H2 = (H2 + c) >>> 0; H3 = (H3 + d) >>> 0;
      H4 = (H4 + e) >>> 0; H5 = (H5 + f) >>> 0; H6 = (H6 + g) >>> 0; H7 = (H7 + h) >>> 0;
    }

    return [H0, H1, H2, H3, H4, H5, H6, H7]
      .map(h => h.toString(16).padStart(8, '0'))
      .join('');
  }

  async register(username: string, password: string, email: string, turnstileToken?: string, formStartTime?: number, powChallenge?: string, powNonce?: string): Promise<{ message: string }> {
    const data: RegisterRequest = {
      username: username.trim(),
      password,
      email: email.trim(),
      turnstileToken,
      formStartTime,
      powChallenge,
      powNonce,
      // Decoy honeypot fields — visible in source, do nothing on backend
      website: '',
      company: '',
      // Real honeypot field — name comes from runtime config, invisible in source
      [this.abConfig?.['honeypotField'] ?? 'honeypot']: '',
    };

    const response = await firstValueFrom(this.api.post<{ message: string }>('/auth/register', data));
    return response;
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.api.get<AuthResponse>(`/auth/verify-email/${encodeURIComponent(token)}`)
    );
    await this.handleAuthResponse(response, false);
    return response;
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return firstValueFrom(
      this.api.post<{ message: string }>('/auth/resend-verification', { email: email.trim() })
    );
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

  isAdmin(): boolean {
    return this.currentUser()?.isAdmin ?? false;
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
      this.emailVerified.set(!!(player as any).emailVerified);
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
    this.emailVerified.set(true);
    this.clearStoredSession();
  }

  async handleOAuthCallback(sessionId: string, playerId: number, rememberMe = false): Promise<void> {
    const response: AuthResponse = { sessionId, playerId };
    await this.handleAuthResponse(response, rememberMe);
  }

  /**
   * Fetch OAuth session data from the short-lived httpOnly cookie.
   * The backend reads the cookie and returns sessionId + playerId.
   */
  async fetchOAuthSessionFromCookie(): Promise<{ sessionId: string; playerId: number } | null> {
    try {
      const result = await firstValueFrom(this.api.get<{ sessionId: string; playerId: number }>('/oauth/session'));
      return result;
    } catch {
      return null;
    }
  }

  async getOAuthStatus(): Promise<OAuthStatus> {
    return firstValueFrom(this.api.get<OAuthStatus>('/oauth/status'));
  }

  loginWithGoogle(turnstileToken?: string): void {
    const url = turnstileToken
      ? `/api/oauth/google?turnstileToken=${encodeURIComponent(turnstileToken)}`
      : '/api/oauth/google';
    window.location.href = url;
  }

  loginWithGitHub(turnstileToken?: string): void {
    const url = turnstileToken
      ? `/api/oauth/github?turnstileToken=${encodeURIComponent(turnstileToken)}`
      : '/api/oauth/github';
    window.location.href = url;
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
