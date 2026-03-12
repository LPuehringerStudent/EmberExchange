import { PlayerStatisticsRow as PlayerStatistics } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { PlayerStatistics };

export interface ApiError {
  error: string;
}

export interface CreatePlayerStatisticsResponse {
  statId: number;
  playerId: number;
}

export interface SuccessMessage {
  message: string;
}

/**
 * Fetches all player statistics.
 */
export async function getAllPlayerStatistics(): Promise<PlayerStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/player-statistics`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch player statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as PlayerStatistics[];
}

/**
 * Fetches top players by activity score.
 */
export async function getTopPlayersByActivity(limit: number = 10): Promise<PlayerStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/player-statistics/leaderboard/activity?limit=${limit}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch leaderboard: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as PlayerStatistics[];
}

/**
 * Fetches top players by net worth.
 */
export async function getTopPlayersByNetWorth(limit: number = 10): Promise<PlayerStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/player-statistics/leaderboard/wealth?limit=${limit}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch wealth leaderboard: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as PlayerStatistics[];
}

/**
 * Fetches statistics for a specific player.
 */
export async function getPlayerStatistics(playerId: number): Promise<PlayerStatistics> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/statistics`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch player statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as PlayerStatistics;
}

/**
 * Creates initial statistics for a player.
 */
export async function createPlayerStatistics(playerId: number): Promise<CreatePlayerStatisticsResponse> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/statistics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to create player statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreatePlayerStatisticsResponse;
}

/**
 * Deletes player statistics.
 */
export async function deletePlayerStatistics(playerId: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/statistics`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete player statistics: ${response.status}`;
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
