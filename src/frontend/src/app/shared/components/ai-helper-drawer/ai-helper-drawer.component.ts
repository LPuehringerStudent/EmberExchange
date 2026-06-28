import { ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { AiHelperService, AssistantAction } from '../../../core/services/ai-helper.service';
import { AuthService } from '../../../core/services/auth.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ai-helper-drawer',
  standalone: true,
  imports: [MarkdownPipe],
  templateUrl: './ai-helper-drawer.component.html',
  styleUrls: ['./ai-helper-drawer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiHelperDrawerComponent {
  @HostListener('document:keydown.escape') onEscape(): void { this.close(); }
  private service = inject(AiHelperService);
  private auth = inject(AuthService);
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
  private autoExecutedIndexes = new Set<number>();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.previousFocus = document.activeElement;
        window.setTimeout(() => {
          this.scrollToBottom();
          this.textInput().nativeElement.focus();
        }, 50);
      }
    });

    effect(() => {
      // React to message count and loading state so the drawer auto-scrolls to the latest message.
      const _count = this.messages().length;
      const _loading = this.loading();
      this.scrollToBottom();
    });

    effect(() => {
      // Auto-execute a single navigation suggestion once, right after it arrives.
      const open = this.isOpen();
      const msgs = this.messages();
      if (!open || msgs.length === 0) return;
      const lastIndex = msgs.length - 1;
      const last = msgs[lastIndex];
      if (
        !this.autoExecutedIndexes.has(lastIndex) &&
        last.role === 'assistant' &&
        last.suggestions?.length === 1 &&
        last.suggestions[0].action.type === 'navigate_to'
      ) {
        this.autoExecutedIndexes.add(lastIndex);
        void this.runAction(last.suggestions[0].action);
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

  onMessageClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a') as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    event.preventDefault();
    this.router.navigateByUrl(href);
  }

  async runAction(action: AssistantAction): Promise<void> {
    switch (action.type) {
      case 'navigate_to':
        this.router.navigate([action.route]);
        this.service.close();
        break;
      case 'highlight_element':
        this.highlight(action.target);
        break;
      case 'trigger_action':
        await this.handleTriggerAction(action.action);
        break;
    }
  }

  private async handleTriggerAction(action: string): Promise<void> {
    switch (action) {
      case 'claim_daily_reward':
        try {
          await this.service.claimDailyReward();
          await this.auth.refreshUser();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to claim daily reward:', err);
        }
        this.service.close();
        break;
      case 'open_first_lootbox':
        this.router.navigate(['/lootboxes']);
        this.service.close();
        break;
      case 'open_quests':
        this.router.navigate(['/quests']);
        this.service.close();
        break;
      default:
        window.dispatchEvent(new CustomEvent('assistant-trigger-action', { detail: action }));
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
