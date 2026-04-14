import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type { ChatMessageRow as ChatMessage } from '@shared/model';

export type { ChatMessage };

export interface CreateChatMessageResponse {
  messageId: number;
  senderId: number;
  receiverId: number | null;
}

export interface CountResponse {
  count: number;
}

export interface SuccessMessage {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ChatMessageService {
  private api = inject(ApiService);

  getAllChatMessages(): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>('/chat-messages');
  }

  getGlobalChatMessages(): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>('/chat-messages/global');
  }

  getChatMessageById(id: number): Observable<ChatMessage> {
    return this.api.get<ChatMessage>(`/chat-messages/${id}`);
  }

  getSentMessages(playerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/players/${playerId}/sent-messages`);
  }

  getReceivedMessages(playerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/players/${playerId}/received-messages`);
  }

  getUnreadMessages(playerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/players/${playerId}/unread-messages`);
  }

  getConversation(player1Id: number, player2Id: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/chat-messages/conversation/${player1Id}/${player2Id}`);
  }

  sendChatMessage(
    senderId: number,
    content: string,
    receiverId?: number
  ): Observable<CreateChatMessageResponse> {
    const body: Record<string, unknown> = { senderId, content };
    if (receiverId !== undefined) body["receiverId"] = receiverId;
    return this.api.post<CreateChatMessageResponse>('/chat-messages', body);
  }

  markMessageAsRead(id: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/chat-messages/${id}/read`, {});
  }

  deleteChatMessage(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/chat-messages/${id}`);
  }

  getUnreadCount(playerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${playerId}/unread-count`);
  }
}
