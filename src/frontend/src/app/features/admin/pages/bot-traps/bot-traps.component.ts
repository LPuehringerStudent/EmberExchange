import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, type BotTrapEvent } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-bot-traps',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Bot Trap Log</h1>
        <div class="flex gap-3">
          <button
            (click)="loadLog()"
            class="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
          >
            Refresh
          </button>
          <button
            (click)="clearLog()"
            class="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors"
          >
            Clear Log
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="text-text-secondary">Loading traps...</div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else if (events().length === 0) {
        <div class="bg-surface rounded-xl p-8 border border-[rgba(232,93,4,0.15)] text-center">
          <div class="text-4xl mb-3">🛡️</div>
          <div class="text-text-primary font-semibold mb-1">No bots detected yet</div>
          <div class="text-text-secondary text-sm">Your traps are armed and waiting.</div>
        </div>
      } @else {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-surface-secondary text-text-secondary uppercase text-xs tracking-wider">
                <tr>
                  <th class="px-4 py-3 font-semibold">Time</th>
                  <th class="px-4 py-3 font-semibold">IP</th>
                  <th class="px-4 py-3 font-semibold">Endpoint</th>
                  <th class="px-4 py-3 font-semibold">Reason</th>
                  <th class="px-4 py-3 font-semibold">User Agent</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (event of events(); track event.timestamp + event.ip + event.reason) {
                  <tr class="hover:bg-surface-secondary/50 transition-colors">
                    <td class="px-4 py-3 text-text-primary whitespace-nowrap">{{ formatTime(event.timestamp) }}</td>
                    <td class="px-4 py-3 text-accent font-mono text-xs">{{ event.ip }}</td>
                    <td class="px-4 py-3 text-text-secondary">{{ event.endpoint }}</td>
                    <td class="px-4 py-3">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                        {{ event.reason }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-text-muted text-xs max-w-xs truncate" [title]="event.userAgent">
                      {{ event.userAgent }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 text-text-secondary text-sm">
          Total events: <span class="text-accent font-semibold">{{ events().length }}</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BotTrapsComponent implements OnInit {
  private adminService = inject(AdminService);

  events = signal<BotTrapEvent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadLog();
  }

  async loadLog(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const log = await this.adminService.getBotTrapLog();
      this.events.set(log);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load bot trap log');
    } finally {
      this.loading.set(false);
    }
  }

  async clearLog(): Promise<void> {
    try {
      await this.adminService.clearBotTrapLog();
      this.events.set([]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to clear log');
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}
