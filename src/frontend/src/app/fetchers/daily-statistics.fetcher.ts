import { DailyStatisticsRow as DailyStatistics } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { DailyStatistics };

export interface ApiError {
  error: string;
}

export interface CreateDailyStatisticsResponse {
  statId: number;
  date: string;
}

export interface DailySummary {
  totalLootboxes: number;
  totalSales: number;
  totalVolume: number;
  avgPlayers: number;
}

export interface SuccessMessage {
  message: string;
}

/**
 * Fetches all daily statistics.
 */
export async function getAllDailyStatistics(): Promise<DailyStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch daily statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as DailyStatistics[];
}

/**
 * Fetches today's statistics.
 */
export async function getTodayStatistics(): Promise<DailyStatistics> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics/today`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch today's statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as DailyStatistics;
}

/**
 * Fetches summary for last N days.
 */
export async function getDailySummary(days: number = 7): Promise<DailySummary> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics/summary?days=${days}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch summary: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as DailySummary;
}

/**
 * Fetches statistics for a specific date.
 */
export async function getDailyStatisticsByDate(date: string): Promise<DailyStatistics> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics/${date}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch daily statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as DailyStatistics;
}

/**
 * Fetches statistics for a date range.
 */
export async function getDailyStatisticsRange(from: string, to: string): Promise<DailyStatistics[]> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics/range?from=${from}&to=${to}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch daily statistics range: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as DailyStatistics[];
}

/**
 * Creates daily statistics for a date.
 */
export async function createDailyStatistics(date: string): Promise<CreateDailyStatisticsResponse> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create daily statistics: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreateDailyStatisticsResponse;
}

/**
 * Deletes daily statistics for a date.
 */
export async function deleteDailyStatistics(date: string): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/daily-statistics/${date}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete daily statistics: ${response.status}`;
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
