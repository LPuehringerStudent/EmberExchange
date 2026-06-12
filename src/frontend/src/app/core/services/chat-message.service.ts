import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
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

export interface MarkConversationReadResponse extends SuccessMessage {
  count: number;
}

@Injectable({ providedIn: 'root' })
export class ChatMessageService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getAllChatMessages(): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>('/chat-messages', this.getHeaders());
  }

  getGlobalChatMessages(): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>('/chat-messages/global', this.getHeaders());
  }

  getChatMessageById(id: number): Observable<ChatMessage> {
    return this.api.get<ChatMessage>(`/chat-messages/${id}`, this.getHeaders());
  }

  getSentMessages(playerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/players/${playerId}/sent-messages`, this.getHeaders());
  }

  getReceivedMessages(playerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/players/${playerId}/received-messages`, this.getHeaders());
  }

  getUnreadMessages(playerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/players/${playerId}/unread-messages`, this.getHeaders());
  }

  getConversation(player1Id: number, player2Id: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/chat-messages/conversation/${player1Id}/${player2Id}`, this.getHeaders());
  }

  getConversationPaginated(player1Id: number, player2Id: number, limit = 20, offset = 0): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/chat-messages/conversation/${player1Id}/${player2Id}?limit=${limit}&offset=${offset}`, this.getHeaders());
  }

  sendChatMessage(
    senderId: number,
    content: string,
    receiverId?: number,
    messageType: 'text' | 'trade_offer' = 'text',
    data: Record<string, unknown> = {}
  ): Observable<CreateChatMessageResponse> {
    const body: Record<string, unknown> = { senderId, content, messageType, data };
    if (receiverId !== undefined) body["receiverId"] = receiverId;
    return this.api.post<CreateChatMessageResponse>('/chat-messages', body, this.getHeaders());
  }

  markMessageAsRead(id: number): Observable<SuccessMessage> {
    return this.api.patch<SuccessMessage>(`/chat-messages/${id}/read`, {}, this.getHeaders());
  }

  markConversationAsRead(senderId: number, receiverId: number): Observable<MarkConversationReadResponse> {
    return this.api.patch<MarkConversationReadResponse>(
      `/chat-messages/conversation/${senderId}/${receiverId}/read`,
      {},
      this.getHeaders()
    );
  }

  deleteChatMessage(id: number): Observable<SuccessMessage> {
    return this.api.delete<SuccessMessage>(`/chat-messages/${id}`, this.getHeaders());
  }

  getUnreadCount(playerId: number): Observable<CountResponse> {
    return this.api.get<CountResponse>(`/players/${playerId}/unread-count`, this.getHeaders());
  }
}
