import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AssistantSuggestion[];
}

export interface AssistantSuggestion {
  label: string;
  action: AssistantAction;
}

export type AssistantAction =
  | { type: 'navigate_to'; route: string }
  | { type: 'highlight_element'; target: string }
  | { type: 'trigger_action'; action: string };

export interface ChatResponse {
  message: AssistantMessage;
  remainingChats: number | null;
}

@Injectable({ providedIn: 'root' })
export class AiHelperService {
  readonly isOpen = signal(false);
  readonly messages = signal<AssistantMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your EmberExchange guide. What would you like to do?' },
  ]);
  readonly remainingChats = signal<number | null>(null);
  readonly loading = signal(false);

  constructor(private http: HttpClient) {}

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  async sendMessage(content: string): Promise<void> {
    this.messages.update((m) => [...m, { role: 'user', content }]);
    this.loading.set(true);
    try {
      const history = this.messages().map((m) => ({ role: m.role, content: m.content }));
      const res = await firstValueFrom(
        this.http.post<ChatResponse>('/api/assistant/chat', { messages: history })
      );
      this.messages.update((m) => [...m, res.message]);
      this.remainingChats.set(res.remainingChats);
    } catch {
      this.messages.update((m) => [...m, { role: 'assistant', content: 'Sorry, I couldn\'t reach the assistant. Please try again.' }]);
    } finally {
      this.loading.set(false);
    }
  }
}
