import { MiniGameSessionRow as MiniGameSession } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { MiniGameSession };

export interface ApiError {
  error: string;
}

export interface CreateMiniGameSessionResponse {
  sessionId: number;
  playerId: number;
  gameType: string;
}

export interface MiniGameStats {
  totalSessions: number;
  totalPayout: number;
}

export interface SuccessMessage {
  message: string;
}

/**
 * Fetches all mini-game sessions.
 */
export async function getAllMiniGameSessions(): Promise<MiniGameSession[]> {
  const response = await fetch(`${API_BASE_URL}/mini-game-sessions`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch sessions: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as MiniGameSession[];
}

/**
 * Fetches a mini-game session by ID.
 */
export async function getMiniGameSessionById(id: number): Promise<MiniGameSession> {
  const response = await fetch(`${API_BASE_URL}/mini-game-sessions/${id}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch session ${id}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as MiniGameSession;
}

/**
 * Fetches all sessions for a player.
 */
export async function getMiniGameSessionsByPlayerId(playerId: number): Promise<MiniGameSession[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/mini-game-sessions`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch sessions for player ${playerId}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as MiniGameSession[];
}

/**
 * Fetches sessions by game type.
 */
export async function getMiniGameSessionsByType(gameType: string): Promise<MiniGameSession[]> {
  const response = await fetch(`${API_BASE_URL}/mini-game-sessions/type/${encodeURIComponent(gameType)}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch sessions for type ${gameType}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as MiniGameSession[];
}

/**
 * Creates a new mini-game session.
 */
export async function createMiniGameSession(
  playerId: number,
  gameType: string,
  result: string,
  coinPayout: number
): Promise<CreateMiniGameSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/mini-game-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerId, gameType, result, coinPayout }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create session: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreateMiniGameSessionResponse;
}

/**
 * Deletes a mini-game session.
 */
export async function deleteMiniGameSession(id: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/mini-game-sessions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete session: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as SuccessMessage;
}

/**
 * Gets mini-game stats for a player.
 */
export async function getMiniGameStatsByPlayerId(playerId: number): Promise<MiniGameStats> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/mini-game-stats`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch stats: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as MiniGameStats;
}
