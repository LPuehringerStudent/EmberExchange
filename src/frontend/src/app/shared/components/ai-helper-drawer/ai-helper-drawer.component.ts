import { ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { AiHelperService, AssistantAction } from '../../../core/services/ai-helper.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ai-helper-drawer',
  standalone: true,
  templateUrl: './ai-helper-drawer.component.html',
  styleUrls: ['./ai-helper-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiHelperDrawerComponent {
  @HostListener('document:keydown.escape') onEscape(): void { this.close(); }
  private service = inject(AiHelperService);
  private router = inject(Router);

  isOpen = this.service.isOpen;
  messages = this.service.messages;
  loading = this.service.loading;
  remaining = this.service.remainingChats;

  input = signal('');
  private scrollContainer = viewChild.required<ElementRef>('scrollContainer');
  private textInput = viewChild.required<ElementRef>('textInput');
  private drawerContainer = viewChild.required<ElementRef>('drawerContainer');
  private previousFocus: Element | null = null;

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.previousFocus = document.activeElement;
        window.setTimeout(() => this.textInput().nativeElement.focus(), 50);
      }
    });
  }

  close(): void {
    this.service.close();
    const target = this.previousFocus;
    if (target instanceof HTMLElement) {
      window.setTimeout(() => target.focus(), 0);
    }
  }

  async send(): Promise<void> {
    const text = this.input().trim();
    if (!text) return;
    this.input.set('');
    await this.service.sendMessage(text);
    this.scrollToBottom();
  }

  onInput(event: Event): void {
    this.input.set((event.target as HTMLInputElement).value);
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
        window.dispatchEvent(new CustomEvent('assistant-trigger-action', { detail: action.action }));
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

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      this.drawerContainer().nativeElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>
    ).filter((el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null);

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onFocusOut(event: FocusEvent): void {
    const container = this.drawerContainer().nativeElement as HTMLElement;
    if (!container.contains(event.relatedTarget as Node)) {
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }
}
