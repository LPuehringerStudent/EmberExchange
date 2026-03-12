import { LootboxTypeRow as LootboxType } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { LootboxType };

export interface ApiError {
  error: string;
}

export interface CreateLootboxTypeResponse {
  lootboxTypeId: number;
  name: string;
}

export interface SuccessMessage {
  message: string;
}

export interface CountResponse {
  count: number;
}

/**
 * Fetches all lootbox types.
 */
export async function getAllLootboxTypes(): Promise<LootboxType[]> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch lootbox types: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxType[];
}

/**
 * Fetches available lootbox types only.
 */
export async function getAvailableLootboxTypes(): Promise<LootboxType[]> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types/available`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch available lootbox types: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxType[];
}

/**
 * Fetches a lootbox type by ID.
 */
export async function getLootboxTypeById(id: number): Promise<LootboxType> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types/${id}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch lootbox type ${id}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxType;
}

/**
 * Creates a new lootbox type.
 */
export async function createLootboxType(
  name: string,
  description: string | null,
  costCoins: number,
  costFree: boolean,
  dailyLimit: number | null,
  isAvailable: boolean
): Promise<CreateLootboxTypeResponse> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description, costCoins, costFree, dailyLimit, isAvailable }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create lootbox type: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreateLootboxTypeResponse;
}

/**
 * Updates a lootbox type.
 */
export async function updateLootboxType(
  id: number,
  updates: Partial<Omit<LootboxType, 'lootboxTypeId'>>
): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    let errorMessage = `Failed to update lootbox type: ${response.status}`;
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
 * Updates lootbox type availability.
 */
export async function updateLootboxTypeAvailability(
  id: number,
  isAvailable: boolean
): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types/${id}/availability`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isAvailable }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to update availability: ${response.status}`;
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
 * Deletes a lootbox type.
 */
export async function deleteLootboxType(id: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete lootbox type: ${response.status}`;
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
 * Gets total count of lootbox types.
 */
export async function getLootboxTypeCount(): Promise<CountResponse> {
  const response = await fetch(`${API_BASE_URL}/lootbox-types/count`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch count: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CountResponse;
}
