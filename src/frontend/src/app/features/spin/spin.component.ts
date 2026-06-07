import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinService } from '../../core/services/spin.service';
import { ToastService } from '../../core/services/toast.service';
import type { SpinStatus, SpinResult, SpinPrize } from '@shared/model';

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

    // Call backend first to get the actual result
    this.spinService.spin().subscribe({
      next: (result: SpinResult) => {
        try {
          // Defensive: validate the response has the shape we expect
          if (!result?.prize?.id) {
            console.error('[SPIN] Invalid result shape:', result);
            this.isSpinning.set(false);
            this.toast.error('Spin failed. Invalid server response.');
            return;
          }

          // Find the segment index for the winning prize
          let winningIndex = WHEEL_SEGMENTS.findIndex((s, i) => s.id === result.prize.id && (result.prize.id !== 'coins_small' || i < 7));
          if (winningIndex === -1) winningIndex = 0;

          const fullRotations = 5 + Math.floor(Math.random() * 4);
          const segmentCenter = winningIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
          const targetRotation = 270 - segmentCenter + fullRotations * 360;

          this.wheelRotation.set(targetRotation);

          // After animation completes (4s)
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
                // Still have bonus spins — no cooldown
                this.canSpin.set(true);
                this.nextSpinAt.set(null);
              } else if (result.nextSpinAt) {
                this.canSpin.set(false);
                this.nextSpinAt.set(result.nextSpinAt);
                this.startCountdown(result.nextSpinAt);
              } else {
                // No bonus spins and no cooldown set — can spin immediately
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

  getIconSvg(icon: string): string {
    switch (icon) {
      case 'coins': return '🪙';
      case 'sparks': return '⚡';
      case 'box': return '🎁';
      default: return '✨';
    }
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
    const cx = 200, cy = 200, r = 90;
    const angle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
    const rad = angle * Math.PI / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad);
    return `translate(${x}, ${y})`;
  }
}
