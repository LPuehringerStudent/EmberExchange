import { ChatMessageRow as ChatMessage } from '../../../../shared/model';

const API_BASE_URL = '/api';

export type { ChatMessage };

export interface ApiError {
  error: string;
}

export interface CreateChatMessageResponse {
  messageId: number;
  senderId: number;
  receiverId: number | null;
}

export interface SuccessMessage {
  message: string;
}

export interface CountResponse {
  count: number;
}

/**
 * Fetches all chat messages.
 */
export async function getAllChatMessages(): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/chat-messages`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch messages: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage[];
}

/**
 * Fetches global chat messages.
 */
export async function getGlobalChatMessages(): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/chat-messages/global`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch global messages: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage[];
}

/**
 * Fetches a chat message by ID.
 */
export async function getChatMessageById(id: number): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/chat-messages/${id}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch message ${id}: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage;
}

/**
 * Fetches messages sent by a player.
 */
export async function getSentMessages(playerId: number): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/sent-messages`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch sent messages: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage[];
}

/**
 * Fetches messages received by a player.
 */
export async function getReceivedMessages(playerId: number): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/received-messages`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch received messages: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage[];
}

/**
 * Fetches unread messages for a player.
 */
export async function getUnreadMessages(playerId: number): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/unread-messages`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch unread messages: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage[];
}

/**
 * Fetches conversation between two players.
 */
export async function getConversation(player1Id: number, player2Id: number): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/chat-messages/conversation/${player1Id}/${player2Id}`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch conversation: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as ChatMessage[];
}

/**
 * Sends a chat message.
 */
export async function sendChatMessage(
  senderId: number,
  content: string,
  receiverId?: number
): Promise<CreateChatMessageResponse> {
  const response = await fetch(`${API_BASE_URL}/chat-messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ senderId, content, receiverId }),
  });

  if (!response.ok) {
    let errorMessage = `Failed to send message: ${response.status}`;
    try {
      const errorData = await response.json() as ApiError;
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return await response.json() as CreateChatMessageResponse;
}

/**
 * Marks a message as read.
 */
export async function markMessageAsRead(id: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/chat-messages/${id}/read`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    let errorMessage = `Failed to mark message as read: ${response.status}`;
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
 * Deletes a chat message.
 */
export async function deleteChatMessage(id: number): Promise<SuccessMessage> {
  const response = await fetch(`${API_BASE_URL}/chat-messages/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete message: ${response.status}`;
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
 * Gets unread message count for a player.
 */
export async function getUnreadCount(playerId: number): Promise<CountResponse> {
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/unread-count`);

  if (!response.ok) {
    let errorMessage = `Failed to fetch unread count: ${response.status}`;
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
