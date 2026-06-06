import { Component, input, signal, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

let tooltipIdCounter = 0;

@Component({
  selector: 'app-info-tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './info-tooltip.component.html',
  styleUrls: ['./info-tooltip.component.scss']
})
export class InfoTooltipComponent {
  text = input.required<string>();
  visible = signal(false);

  readonly tooltipId = `info-tooltip-${++tooltipIdCounter}`;

  tooltipStyle = signal<{ left: string; top: string }>({ left: '0px', top: '0px' });

  private el = inject(ElementRef<HTMLElement>);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.visible.set(false);
    }
  }

  @HostListener('document:touchstart', ['$event'])
  onDocumentTouch(event: TouchEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.visible.set(false);
    }
  }

  toggle(event?: MouseEvent | TouchEvent): void {
    event?.stopPropagation();
    if (this.visible()) {
      this.visible.set(false);
    } else {
      this.show();
    }
  }

  show(): void {
    this.visible.set(true);
    requestAnimationFrame(() => this.adjustPosition());
  }

  hide(): void {
    this.visible.set(false);
  }

  private adjustPosition(): void {
    const trigger = this.el.nativeElement.querySelector('.tooltip-trigger') as HTMLElement | null;
    const tooltip = this.el.nativeElement.querySelector('.tooltip-box') as HTMLElement | null;
    if (!trigger || !tooltip) return;

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const padding = 8;
    const gap = 6;

    let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    let top = triggerRect.bottom + gap;

    // Clamp horizontally to viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    // If overflowing bottom, place above trigger
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = triggerRect.top - tooltipRect.height - gap;
    }

    this.tooltipStyle.set({ left: `${left}px`, top: `${top}px` });
  }
}
