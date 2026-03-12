import { LootboxDropRow as LootboxDrop } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { LootboxDrop };

export interface ApiError {
  error: string;
}

export interface CreateLootboxDropResponse {
  dropId: number;
  lootboxId: number;
  stoveId: number;
}

export interface SuccessMessage {
  message: string;
}

export interface CountResponse {
  count: number;
}

/**
 * Fetches all lootbox drops.
 */
export async function getAllLootboxDrops(): Promise<LootboxDrop[]> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch lootbox drops: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxDrop[];
}

/**
 * Fetches a lootbox drop by ID.
 */
export async function getLootboxDropById(id: number): Promise<LootboxDrop> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops/${id}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch lootbox drop ${id}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxDrop;
}

/**
 * Fetches the drop for a specific lootbox.
 */
export async function getLootboxDropByLootboxId(lootboxId: number): Promise<LootboxDrop> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops/lootbox/${lootboxId}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch drop for lootbox ${lootboxId}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxDrop;
}

/**
 * Fetches the drop that produced a specific stove.
 */
export async function getLootboxDropByStoveId(stoveId: number): Promise<LootboxDrop> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops/stove/${stoveId}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch drop for stove ${stoveId}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxDrop;
}

/**
 * Fetches all drops for a player (from their lootboxes).
 */
export async function getLootboxDropsByPlayerId(playerId: number): Promise<LootboxDrop[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/lootbox-drops`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch drops for player ${playerId}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as LootboxDrop[];
}

/**
 * Creates a new lootbox drop record.
 */
export async function createLootboxDrop(
  lootboxId: number,
  stoveId: number
): Promise<CreateLootboxDropResponse> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lootboxId, stoveId }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create lootbox drop: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreateLootboxDropResponse;
}

/**
 * Deletes a lootbox drop record.
 */
export async function deleteLootboxDrop(id: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete lootbox drop: ${response.status}`;
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
 * Gets total count of lootbox drops.
 */
export async function getLootboxDropCount(): Promise<CountResponse> {
  const response = await fetch(`${API_BASE_URL}/lootbox-drops/count`);

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
