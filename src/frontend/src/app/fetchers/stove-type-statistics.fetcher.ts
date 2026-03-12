import { StoveTypeStatisticsRow as StoveTypeStatistics } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { StoveTypeStatistics };

export interface ApiError {
  error: string;
}

export interface CreateStoveTypeStatisticsResponse {
  statId: number;
  stoveTypeId: number;
}

export interface MarketSummary {
  totalStoves: number;
  totalListed: number;
  totalSales: number;
  avgListedPercent: number;
}

export interface SuccessMessage {
  message: string;
}

/**
 * Fetches all stove type statistics.
 */
export async function getAllStoveTypeStatistics(): Promise<StoveTypeStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/stove-type-statistics`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch stove type statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as StoveTypeStatistics[];
}

/**
 * Fetches market summary.
 */
export async function getMarketSummary(): Promise<MarketSummary> {
  const response = await fetch(`${API_BASE_URL}/stove-type-statistics/market-summary`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch market summary: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as MarketSummary;
}

/**
 * Fetches top stove types by sales.
 */
export async function getTopStoveTypesBySales(limit: number = 10): Promise<StoveTypeStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/stove-type-statistics/leaderboard/sales?limit=${limit}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch sales leaderboard: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as StoveTypeStatistics[];
}

/**
 * Fetches most viewed stove types.
 */
export async function getMostViewedStoveTypes(limit: number = 10): Promise<StoveTypeStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/stove-type-statistics/most-viewed?limit=${limit}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch most viewed: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as StoveTypeStatistics[];
}

/**
 * Fetches stove types by demand trend.
 */
export async function getStoveTypesByTrend(trend: 'increasing' | 'stable' | 'decreasing'): Promise<StoveTypeStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/stove-type-statistics/trend/${trend}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch stove types by trend: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as StoveTypeStatistics[];
}

/**
 * Fetches statistics for a specific stove type.
 */
export async function getStoveTypeStatistics(stoveTypeId: number): Promise<StoveTypeStatistics> {
  const response = await fetch(`${API_BASE_URL}/stove-types/${stoveTypeId}/statistics`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch stove type statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as StoveTypeStatistics;
}

/**
 * Creates statistics for a stove type.
 */
export async function createStoveTypeStatistics(
  stoveTypeId: number,
  expectedDropRate: number,
  rarityRank: number
): Promise<CreateStoveTypeStatisticsResponse> {
  const response = await fetch(`${API_BASE_URL}/stove-types/${stoveTypeId}/statistics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expectedDropRate, rarityRank }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create stove type statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreateStoveTypeStatisticsResponse;
}

/**
 * Increments view count for a stove type.
 */
export async function incrementStoveTypeViews(stoveTypeId: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/stove-types/${stoveTypeId}/statistics/increment-views`, {
    method: 'POST',
  });

  if (!response.ok) {
    let errorMessage = `Failed to increment views: ${response.status}`;
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
 * Deletes stove type statistics.
 */
export async function deleteStoveTypeStatistics(stoveTypeId: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/stove-types/${stoveTypeId}/statistics`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete stove type statistics: ${response.status}`;
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
