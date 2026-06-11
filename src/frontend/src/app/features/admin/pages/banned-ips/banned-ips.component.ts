import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, type BannedIPRecord } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-banned-ips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Banned IPs</h1>
        <button
          (click)="load()"
          class="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
        >
          Refresh
        </button>
      </div>

      <!-- Ban Form -->
      <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] p-5 mb-6">
        <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Manual Ban</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">IP Address</label>
            <input
              type="text"
              [(ngModel)]="newBan.ip"
              placeholder="192.168.1.1"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Reason</label>
            <input
              type="text"
              [(ngModel)]="newBan.reason"
              placeholder="Bot attack / abuse"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Duration (hours)</label>
            <input
              type="number"
              [(ngModel)]="newBan.durationHours"
              placeholder="Leave empty for permanent"
              class="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <button
            (click)="addBan()"
            [disabled]="banning()"
            class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {{ banning() ? 'Banning...' : 'Ban IP' }}
          </button>
          @if (banMessage()) {
            <span [class.text-green-400]="!banError()" [class.text-red-400]="banError()" class="text-sm">
              {{ banMessage() }}
            </span>
          }
        </div>
      </div>

      <!-- Ban List -->
      @if (loading()) {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden">
          <div class="p-4 space-y-3">
            @for (_ of [0, 1, 2, 3, 4]; track $index) {
              <div class="grid grid-cols-5 gap-3">
                @for (__ of [0, 1, 2, 3, 4]; track $index) {
                  <div class="h-4 rounded skeleton-shimmer"></div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else if (bans().length === 0) {
        <div class="bg-surface rounded-xl p-8 border border-[rgba(232,93,4,0.15)] text-center">
          <div class="text-4xl mb-3">🛡️</div>
          <div class="text-text-primary font-semibold mb-1">No IPs banned</div>
          <div class="text-text-secondary text-sm">Your ban list is clean.</div>
        </div>
      } @else {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-surface-secondary text-text-secondary uppercase text-xs tracking-wider">
                <tr>
                  <th class="px-4 py-3 font-semibold">IP</th>
                  <th class="px-4 py-3 font-semibold">Reason</th>
                  <th class="px-4 py-3 font-semibold">Banned At</th>
                  <th class="px-4 py-3 font-semibold">Expires</th>
                  <th class="px-4 py-3 font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (ban of bans(); track ban.ip) {
                  <tr class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-accent font-mono text-xs">{{ ban.ip }}</td>
                    <td class="px-4 py-3 text-text-primary">{{ ban.reason }}</td>
                    <td class="px-4 py-3 text-text-secondary whitespace-nowrap">{{ formatTime(ban.bannedAt) }}</td>
                    <td class="px-4 py-3 text-text-secondary whitespace-nowrap">
                      @if (ban.expiresAt) {
                        {{ formatTime(ban.expiresAt) }}
                      } @else {
                        <span class="text-red-400 font-medium">Permanent</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <button
                        (click)="unban(ban.ip)"
                        [disabled]="unbanningIp() === ban.ip"
                        class="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {{ unbanningIp() === ban.ip ? '...' : 'Unban' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 text-text-secondary text-sm">
          Total bans: <span class="text-accent font-semibold">{{ bans().length }}</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BannedIPsComponent implements OnInit {
  private adminService = inject(AdminService);

  bans = signal<BannedIPRecord[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  newBan = { ip: '', reason: '', durationHours: null as number | null };
  banning = signal(false);
  banMessage = signal<string | null>(null);
  banError = signal(false);

  unbanningIp = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await this.adminService.getBannedIPs();
      this.bans.set(list);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load banned IPs');
    } finally {
      this.loading.set(false);
    }
  }

  async addBan(): Promise<void> {
    const ip = this.newBan.ip.trim();
    const reason = this.newBan.reason.trim();
    if (!ip || !reason) {
      this.banMessage.set('IP and reason are required');
      this.banError.set(true);
      return;
    }

    this.banning.set(true);
    this.banMessage.set(null);
    try {
      await this.adminService.banIp(ip, reason, this.newBan.durationHours ?? undefined);
      this.banMessage.set(`IP ${ip} banned successfully`);
      this.banError.set(false);
      this.newBan = { ip: '', reason: '', durationHours: null };
      await this.load();
    } catch (err) {
      this.banMessage.set(err instanceof Error ? err.message : 'Failed to ban IP');
      this.banError.set(true);
    } finally {
      this.banning.set(false);
    }
  }

  async unban(ip: string): Promise<void> {
    this.unbanningIp.set(ip);
    try {
      await this.adminService.unbanIp(ip);
      this.bans.set(this.bans().filter(b => b.ip !== ip));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to unban IP');
    } finally {
      this.unbanningIp.set(null);
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}
