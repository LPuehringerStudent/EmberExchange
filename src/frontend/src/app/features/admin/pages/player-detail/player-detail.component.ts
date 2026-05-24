import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService, type AdminPlayerDetail } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-player-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto">
      @if (loading()) {
        <div class="text-text-secondary">Loading player...</div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else if (detail()) {
        @let p = detail()!.player;
        @let s = detail()!.stats;

        <div class="flex items-center gap-3 mb-6">
          <button
            (click)="router.navigate(['/admin/players'])"
            class="text-sm text-text-secondary hover:text-accent transition-colors"
          >
            ← Back to Players
          </button>
        </div>

        <div class="bg-surface rounded-xl p-6 border border-[rgba(232,93,4,0.15)] mb-4">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h1 class="text-xl font-bold text-text-primary">{{ p.username }}</h1>
              <p class="text-sm text-text-secondary">{{ p.email }}</p>
            </div>
            @if (p.bannedAt) {
              <span class="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">Banned</span>
            } @else {
              <span class="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">Active</span>
            }
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <div class="text-xs text-text-secondary uppercase">Player ID</div>
              <div class="text-sm font-medium text-text-primary">{{ p.playerId }}</div>
            </div>
            <div>
              <div class="text-xs text-text-secondary uppercase">Coins</div>
              <div class="text-sm font-medium text-accent">{{ p.coins.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-xs text-text-secondary uppercase">Joined</div>
              <div class="text-sm font-medium text-text-primary">{{ p.joinedAt | date:'medium' }}</div>
            </div>
            <div>
              <div class="text-xs text-text-secondary uppercase">Stoves Owned</div>
              <div class="text-sm font-medium text-text-primary">{{ s.stovesOwned }}</div>
            </div>
          </div>

          @if (p.bannedAt) {
            <div class="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div class="text-sm font-medium text-red-400">Banned on {{ p.bannedAt | date:'medium' }}</div>
              @if (p.banReason) {
                <div class="text-sm text-red-300 mt-1">Reason: {{ p.banReason }}</div>
              }
            </div>
          }
        </div>

        <!-- Stats -->
        <div class="bg-surface rounded-xl p-6 border border-[rgba(232,93,4,0.15)] mb-4">
          <h2 class="text-lg font-bold text-text-primary mb-3">Statistics</h2>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <div class="text-xs text-text-secondary uppercase">Trades Completed</div>
              <div class="text-lg font-bold text-text-primary">{{ s.totalTradesCompleted }}</div>
            </div>
            <div>
              <div class="text-xs text-text-secondary uppercase">Coins Earned</div>
              <div class="text-lg font-bold text-text-primary">{{ s.totalCoinsEarned.toLocaleString() }}</div>
            </div>
            <div>
              <div class="text-xs text-text-secondary uppercase">Coins Spent</div>
              <div class="text-lg font-bold text-text-primary">{{ s.totalCoinsSpent.toLocaleString() }}</div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-surface rounded-xl p-6 border border-[rgba(232,93,4,0.15)] mb-4">
          <h2 class="text-lg font-bold text-text-primary mb-3">Actions</h2>

          <!-- Adjust Coins -->
          <div class="flex gap-3 mb-4 items-end">
            <div class="flex-1">
              <label class="block text-xs text-text-secondary mb-1">Amount (+/-)</label>
              <input
                type="number"
                [(ngModel)]="coinAmount"
                class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div class="flex-[2]">
              <label class="block text-xs text-text-secondary mb-1">Reason</label>
              <input
                type="text"
                [(ngModel)]="coinReason"
                placeholder="e.g. Event reward, correction..."
                class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
              />
            </div>
            <button
              (click)="adjustCoins()"
              [disabled]="adjustingCoins"
              class="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {{ adjustingCoins ? 'Applying...' : 'Adjust Coins' }}
            </button>
          </div>

          @if (adjustMessage()) {
            <div class="text-sm mb-3" [class.text-green-400]="!adjustError()" [class.text-red-400]="adjustError()">
              {{ adjustMessage() }}
            </div>
          }

          <!-- Ban / Unban -->
          <div class="border-t border-[rgba(232,93,4,0.1)] pt-4">
            @if (p.bannedAt) {
              <button
                (click)="unban()"
                [disabled]="banning"
                class="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {{ banning ? 'Unbanning...' : 'Unban Player' }}
              </button>
            } @else {
              <div class="flex gap-3 items-end">
                <div class="flex-1">
                  <label class="block text-xs text-text-secondary mb-1">Ban Reason</label>
                  <input
                    type="text"
                    [(ngModel)]="banReason"
                    placeholder="Reason for ban..."
                    class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
                  />
                </div>
                <button
                  (click)="ban()"
                  [disabled]="banning"
                  class="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {{ banning ? 'Banning...' : 'Ban Player' }}
                </button>
              </div>
            }
            @if (banMessage()) {
              <div class="text-sm mt-2" [class.text-green-400]="!banError()" [class.text-red-400]="banError()">
                {{ banMessage() }}
              </div>
            }
          </div>
        </div>

        <!-- Coin History -->
        @if (detail()!.coinHistory.length > 0) {
          <div class="bg-surface rounded-xl p-6 border border-[rgba(232,93,4,0.15)]">
            <h2 class="text-lg font-bold text-text-primary mb-3">Admin Coin Adjustments</h2>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[rgba(232,93,4,0.08)] text-text-secondary uppercase text-xs">
                  <tr>
                    <th class="px-3 py-2">Date</th>
                    <th class="px-3 py-2">Amount</th>
                    <th class="px-3 py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of detail()!.coinHistory; track tx.transactionId) {
                    <tr class="border-t border-[rgba(232,93,4,0.08)]">
                      <td class="px-3 py-2 text-text-secondary">{{ tx.createdAt | date:'short' }}</td>
                      <td class="px-3 py-2 font-medium" [class.text-green-400]="tx.amount > 0" [class.text-red-400]="tx.amount < 0">
                        {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString() }}
                      </td>
                      <td class="px-3 py-2 text-text-primary">{{ tx.description }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerDetailComponent {
  private adminService = inject(AdminService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  detail = signal<AdminPlayerDetail | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  coinAmount = 0;
  coinReason = '';
  adjustingCoins = false;
  adjustMessage = signal<string | null>(null);
  adjustError = signal(false);

  banReason = '';
  banning = false;
  banMessage = signal<string | null>(null);
  banError = signal(false);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) this.load(id);
  }

  async load(id: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.adminService.getPlayerDetail(id);
      this.detail.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load player');
    } finally {
      this.loading.set(false);
    }
  }

  async adjustCoins(): Promise<void> {
    const p = this.detail()?.player;
    if (!p) return;
    this.adjustingCoins = true;
    this.adjustMessage.set(null);
    try {
      await this.adminService.adjustPlayerCoins(p.playerId, this.coinAmount, this.coinReason);
      this.adjustMessage.set('Coins adjusted successfully');
      this.adjustError.set(false);
      this.coinAmount = 0;
      this.coinReason = '';
      await this.load(p.playerId);
    } catch (err) {
      this.adjustMessage.set(err instanceof Error ? err.message : 'Failed to adjust coins');
      this.adjustError.set(true);
    } finally {
      this.adjustingCoins = false;
    }
  }

  async ban(): Promise<void> {
    const p = this.detail()?.player;
    if (!p) return;
    this.banning = true;
    this.banMessage.set(null);
    try {
      await this.adminService.setPlayerBanStatus(p.playerId, true, this.banReason);
      this.banMessage.set('Player banned');
      this.banError.set(false);
      this.banReason = '';
      await this.load(p.playerId);
    } catch (err) {
      this.banMessage.set(err instanceof Error ? err.message : 'Failed to ban player');
      this.banError.set(true);
    } finally {
      this.banning = false;
    }
  }

  async unban(): Promise<void> {
    const p = this.detail()?.player;
    if (!p) return;
    this.banning = true;
    this.banMessage.set(null);
    try {
      await this.adminService.setPlayerBanStatus(p.playerId, false);
      this.banMessage.set('Player unbanned');
      this.banError.set(false);
      await this.load(p.playerId);
    } catch (err) {
      this.banMessage.set(err instanceof Error ? err.message : 'Failed to unban player');
      this.banError.set(true);
    } finally {
      this.banning = false;
    }
  }
}
