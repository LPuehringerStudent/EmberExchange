import { Component, inject, signal, viewChild, ElementRef } from '@angular/core';
import { AiHelperService, AssistantAction } from '../../../core/services/ai-helper.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ai-helper-drawer',
  standalone: true,
  templateUrl: './ai-helper-drawer.component.html',
  styleUrls: ['./ai-helper-drawer.component.css'],
})
export class AiHelperDrawerComponent {
  private service = inject(AiHelperService);
  private router = inject(Router);

  isOpen = this.service.isOpen;
  messages = this.service.messages;
  loading = this.service.loading;
  remaining = this.service.remainingChats;

  input = signal('');
  private scrollContainer = viewChild.required<ElementRef>('scrollContainer');

  close(): void {
    this.service.close();
  }

  async send(): Promise<void> {
    const text = this.input().trim();
    if (!text) return;
    this.input.set('');
    await this.service.sendMessage(text);
    this.scrollToBottom();
  }

  runAction(action: AssistantAction): void {
    switch (action.type) {
      case 'navigate_to':
        this.router.navigate([action.route]);
        this.service.close();
        break;
      case 'highlight_element':
        this.highlight(action.target);
        break;
      case 'trigger_action':
        // Dispatch to a registered handler or show a toast
        break;
    }
  }

  private highlight(target: string): void {
    const selector = `[data-tour="${target}"]`;
    const el = document.querySelector(selector);
    if (!el) return;
    el.classList.add('ai-highlight-pulse');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => el.classList.remove('ai-highlight-pulse'), 2500);
  }

  private scrollToBottom(): void {
    window.setTimeout(() => {
      const el = this.scrollContainer().nativeElement;
      el.scrollTop = el.scrollHeight;
    }, 50);
  }
}
