import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinService } from '../../core/services/spin.service';
import { ToastService } from '../../core/services/toast.service';
import type { SpinStatus, SpinResult, SpinPrize } from '@shared/model';

/* ─── SVG Path data for wheel segment icons ─── */
const ICON_PATHS: Record<string, string> = {
  coins:   'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3-9c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3zm3 1.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z',
  sparks:  'M7 2v11h3v9l7-12h-4l4-8z',
  fire:    'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
  clock:   'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v7l5.25 3.15.75-1.23-4.5-2.67z',
  ticket:  'M22 10V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4c1.1 0 2 .9 2 2s-.9 2-2 2v4c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-4c-1.1 0-2-.9-2-2s.9-2 2-2zm-2-1.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0 7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
  gift:    'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z',
  star:    'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
};

// 8 segments: 7 prizes + 1 "Try Again" (visual only, mapped to coins_small)
const WHEEL_SEGMENTS: SpinPrize[] = [
  { id: 'coins_small',  label: '50 Coal',    icon: 'coins',  minAmount: 50,   maxAmount: 100,  color: '#94a3b8', weight: 25 },
  { id: 'coins_medium', label: '150 Coal',   icon: 'coins',  minAmount: 100,  maxAmount: 200,  color: '#22c55e', weight: 20 },
  { id: 'coins_large',  label: '400 Coal',   icon: 'coins',  minAmount: 200,  maxAmount: 500,  color: '#3b82f6', weight: 18 },
  { id: 'sparks',       label: '25 Sparks',  icon: 'sparks', minAmount: 10,   maxAmount: 50,   color: '#a855f7', weight: 15 },
  { id: 'coins_jackpot',label: '1,000 Coal', icon: 'coins',  minAmount: 500,  maxAmount: 1000, color: '#f59e0b', weight: 12 },
  { id: 'lootbox',      label: 'Lootbox',    icon: 'box',    minAmount: 1,    maxAmount: 1,    color: '#e85d04', weight: 7 },
  { id: 'coins_max',    label: '5,000 Coal', icon: 'coins',  minAmount: 1000, maxAmount: 5000, color: '#ffd700', weight: 3 },
  { id: 'coins_small',  label: 'Try Again',  icon: 'coins',  minAmount: 50,   maxAmount: 100,  color: '#64748b', weight: 25 }, // visual duplicate
];

const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length; // 45 degrees
const LOOTBOX_GIF = 'assets/animation/chest-idle.gif';

@Component({
  selector: 'app-spin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './spin.component.html',
  styleUrls: ['./spin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinComponent implements OnInit, OnDestroy {
  private spinService = inject(SpinService);
  private toast = inject(ToastService);

  // Signals
  canSpin = signal(false);
  nextSpinAt = signal<string | null>(null);
  totalSpins = signal(0);
  bonusSpins = signal(0);
  isSpinning = signal(false);
  wheelRotation = signal(0);
  showResult = signal(false);
  lastPrize = signal<SpinResult | null>(null);
  spinHistory = signal<SpinResult[]>([]);
  countdown = signal('');
  isLoading = signal(false);
  spinStatusLoaded = signal(false);

  segments = WHEEL_SEGMENTS;
  segmentAngle = SEGMENT_ANGLE;
  iconPaths = ICON_PATHS;
  lootboxGif = LOOTBOX_GIF;

  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadStatus();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private loadStatus(): void {
    this.spinStatusLoaded.set(false);
    this.spinService.getStatus().subscribe({
      next: (status: SpinStatus) => {
        this.canSpin.set(status.canSpin);
        this.nextSpinAt.set(status.nextSpinAt);
        this.totalSpins.set(status.totalSpins);
        this.bonusSpins.set(status.bonusSpins);
        this.spinStatusLoaded.set(true);
        this.stopCountdown();
        if (!status.canSpin && status.nextSpinAt) {
          this.startCountdown(status.nextSpinAt);
        }
      },
      error: () => {
        this.toast.error('Failed to load spin status');
        this.spinStatusLoaded.set(true);
      }
    });
  }

  private startCountdown(targetIso: string): void {
    this.stopCountdown();
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        this.canSpin.set(true);
        this.nextSpinAt.set(null);
        this.countdown.set('');
        this.stopCountdown();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      this.countdown.set(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    this.countdownInterval = setInterval(tick, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  onSpin(): void {
    if (this.isSpinning() || !this.canSpin()) return;

    this.isSpinning.set(true);
    this.showResult.set(false);
    this.lastPrize.set(null);

    this.spinService.spin().subscribe({
      next: (result: SpinResult) => {
        try {
          if (!result?.prize?.id) {
            console.error('[SPIN] Invalid result shape:', result);
            this.isSpinning.set(false);
            this.toast.error('Spin failed. Invalid server response.');
            return;
          }

          let winningIndex = WHEEL_SEGMENTS.findIndex((s, i) => s.id === result.prize.id && (result.prize.id !== 'coins_small' || i < 7));
          if (winningIndex === -1) winningIndex = 0;

          const fullRotations = 5 + Math.floor(Math.random() * 4);
          const segmentCenter = winningIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
          const targetRotation = 270 - segmentCenter + fullRotations * 360;

          this.wheelRotation.set(targetRotation);

          setTimeout(() => {
            try {
              this.isSpinning.set(false);
              this.lastPrize.set(result);
              this.showResult.set(true);
              this.totalSpins.set(result.totalSpins);
              this.bonusSpins.set(result.bonusSpins);
              this.spinHistory.update(h => [result, ...h].slice(0, 5));

              this.stopCountdown();
              if (result.bonusSpins > 0) {
                this.canSpin.set(true);
                this.nextSpinAt.set(null);
              } else if (result.nextSpinAt) {
                this.canSpin.set(false);
                this.nextSpinAt.set(result.nextSpinAt);
                this.startCountdown(result.nextSpinAt);
              } else {
                this.canSpin.set(true);
                this.nextSpinAt.set(null);
              }

              this.toast.success(`You won ${result.prize.label}!`);
            } catch (innerErr) {
              console.error('[SPIN] Post-spin callback error:', innerErr);
              this.isSpinning.set(false);
            }
          }, 4200);
        } catch (err) {
          console.error('[SPIN] Spin processing error:', err);
          this.isSpinning.set(false);
          this.toast.error('Something went wrong. Please refresh and try again.');
        }
      },
      error: (err: any) => {
        console.error('[SPIN] HTTP error:', err);
        this.isSpinning.set(false);
        const msg = err?.message || 'Spin failed. Try again later.';
        this.toast.error(msg);
      }
    });
  }

  closeResult(): void {
    this.showResult.set(false);
  }

  getIconType(icon: string): string {
    if (icon === 'box') return 'lootbox';
    if (icon === 'sparks') return 'sparks';
    return 'coins';
  }

  getRarityLabel(prizeId: string): string {
    switch (prizeId) {
      case 'coins_small': return 'Common';
      case 'coins_medium': return 'Uncommon';
      case 'coins_large': return 'Rare';
      case 'sparks': return 'Epic';
      case 'coins_jackpot': return 'Legendary';
      case 'lootbox': return 'Mythic';
      case 'coins_max': return 'Secret';
      default: return 'Common';
    }
  }

  // SVG helpers for wheel rendering
  getSegmentPath(index: number): string {
    const cx = 200, cy = 200, r = 185;
    const startAngle = (index * SEGMENT_ANGLE - 90) * Math.PI / 180;
    const endAngle = ((index + 1) * SEGMENT_ANGLE - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
  }

  getLabelTransform(index: number): string {
    const cx = 200, cy = 200, r = 130;
    const angle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
    const rad = angle * Math.PI / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return `translate(${x}, ${y}) rotate(${angle + 90})`;
  }

  getIconTransform(index: number): string {
    const cx = 200, cy = 200, r = 88;
    const angleDeg = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
    const rad = angleDeg * Math.PI / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    // Rotate so icon faces outward from center (same orientation as labels)
    const rotation = angleDeg + 90;
    return `translate(${x}, ${y}) rotate(${rotation})`;
  }
}
