import { PlayerRow as Player } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { Player };

/** Error response from the API */
export interface ApiError {
  error: string;
}

/** OAuth provider configuration status */
export interface OAuthStatus {
  google: boolean;
  github: boolean;
}

/** Login request payload */
export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

/** Register request payload */
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

/** Authentication response */
export interface AuthResponse {
  sessionId: string;
  playerId: number;
}

/**
 * Logs in a player with username/email and password.
 * @param credentials - The login credentials
 * @returns Promise with sessionId and playerId
 * @throws Error if login fails
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    let errorMessage = `Login failed: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as AuthResponse;
}

/**
 * Registers a new player account.
 * @param data - The registration data
 * @returns Promise with sessionId and playerId (auto-login)
 * @throws Error if registration fails
 */
export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = `Registration failed: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as AuthResponse;
}

/**
 * Logs out the current player by invalidating their session.
 * @param sessionId - The session ID to invalidate
 * @throws Error if logout fails
 */
export async function logout(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'session-id': sessionId,
    },
  });

  if (!response.ok) {
    let errorMessage = `Logout failed: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

/**
 * Gets the current authenticated player's information.
 * @param sessionId - The session ID
 * @returns Promise with player data, or null if session invalid
 * @throws Error if request fails (other than 401)
 */
export async function getCurrentUser(sessionId: string): Promise<Player | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'session-id': sessionId,
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    let errorMessage = `Failed to get current user: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as Player;
}

/**
 * Gets OAuth provider configuration status from the backend.
 * @returns Promise with OAuth status indicating which providers are configured
 * @throws Error if request fails
 */
export async function getOAuthStatus(): Promise<OAuthStatus> {
  const response = await fetch(`${API_BASE_URL}/oauth/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to get OAuth status: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as OAuthStatus;
}
