import {
  Component,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { OnboardingService } from '../../services/onboarding.service';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  templateUrl: './onboarding-overlay.component.html',
  styleUrls: ['./onboarding-overlay.component.scss'],
})
export class OnboardingOverlayComponent implements OnInit, OnDestroy {
  private onboarding = inject(OnboardingService);
  private hostEl = inject(ElementRef);

  private tooltipRef = viewChild.required<ElementRef>('tooltip');

  spotlightRect = signal<{ top: number; left: number; width: number; height: number } | null>(null);
  tooltipStyle = signal<{ top: string; left: string; transform: string }>({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
  isLastStep = signal(false);

  get step() {
    return this.onboarding.currentStep;
  }

  get stepIndex() {
    return this.onboarding.currentStepIndex();
  }

  get totalSteps() {
    return this.onboarding.steps.length;
  }

  ngOnInit(): void {
    this.updateSpotlight();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll, true);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll, true);
  }

  private onResize = (): void => {
    this.updateSpotlight();
  };

  private onScroll = (): void => {
    this.updateSpotlight();
  };

  private updateSpotlight(): void {
    const step = this.onboarding.currentStep;
    if (!step) return;

    const target = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!target) {
      // Target not found — skip this step
      this.onboarding.nextStep();
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 8;

    this.spotlightRect.set({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });

    this.isLastStep.set(this.stepIndex === this.totalSteps - 1);

    // Position tooltip after DOM update
    requestAnimationFrame(() => this.positionTooltip(rect, step.position));
  }

  private positionTooltip(targetRect: DOMRect, position: string): void {
    const tooltip = this.tooltipRef()?.nativeElement as HTMLElement | undefined;
    if (!tooltip) return;

    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 16;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let top = 0;
    let left = 0;
    let transform = '';

    // Mobile: always position below target if possible
    if (viewportW < 640) {
      top = targetRect.bottom + margin;
      left = Math.max(margin, Math.min(viewportW - tooltipRect.width - margin, targetRect.left + targetRect.width / 2 - tooltipRect.width / 2));
      transform = '';
    } else {
      switch (position) {
        case 'bottom':
          top = targetRect.bottom + margin;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          transform = 'translateX(-50%)';
          break;
        case 'top':
          top = targetRect.top - tooltipRect.height - margin;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          transform = 'translateX(-50%)';
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.left - tooltipRect.width - margin;
          transform = 'translateY(-50%)';
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.right + margin;
          transform = 'translateY(-50%)';
          break;
        default:
          top = targetRect.bottom + margin;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          transform = 'translateX(-50%)';
      }
    }

    // Clamp to viewport
    top = Math.max(margin, Math.min(viewportH - tooltipRect.height - margin, top));
    left = Math.max(margin, Math.min(viewportW - tooltipRect.width - margin, left));

    this.tooltipStyle.set({ top: `${top}px`, left: `${left}px`, transform });
  }

  onNext(): void {
    this.onboarding.nextStep();
    requestAnimationFrame(() => this.updateSpotlight());
  }

  onSkip(): void {
    this.onboarding.skipTour();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.onboarding.skipTour();
  }

  @HostListener('document:keydown.enter')
  onEnter(): void {
    this.onNext();
  }

  onBackdropClick(event: MouseEvent): void {
    // Only dismiss if clicking directly on backdrop, not tooltip
    if (event.target === this.hostEl.nativeElement) {
      this.onboarding.skipTour();
    }
  }
}
