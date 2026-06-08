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

  show(): void {
    this.visible.set(true);
    requestAnimationFrame(() => this.adjustPosition());
  }

  hide(): void {
    this.visible.set(false);
  }

  private adjustPosition(): void {
    const host = this.el.nativeElement;
    const tooltip = host.querySelector('.tooltip-box') as HTMLElement | null;
    if (!tooltip) return;

    const hostRect = host.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const padding = 8;
    const gap = 8;

    let left = hostRect.left + hostRect.width / 2 - tooltipRect.width / 2;
    let top = hostRect.bottom + gap;

    // Clamp horizontally to viewport
    left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding));

    // If overflowing bottom, place above trigger
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = hostRect.top - tooltipRect.height - gap;
    }

    this.tooltipStyle.set({ left: `${left}px`, top: `${top}px` });
  }
}
