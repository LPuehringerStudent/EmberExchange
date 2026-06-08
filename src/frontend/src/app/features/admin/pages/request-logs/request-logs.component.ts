import { Component, signal, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AdminRequestLog } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-request-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-accent">Request Logs</h1>
          <p class="text-text-secondary text-sm mt-1">24-hour API request forensics</p>
        </div>
        <div class="text-text-secondary text-sm">
          {{ logs()?.length ?? 0 }} results
        </div>
      </div>

      <!-- Filters -->
      <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] p-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Player ID</label>
            <input type="number" [ngModel]="filterPlayerId()" (ngModelChange)="filterPlayerId.set($event ? +$event : undefined)" class="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:border-accent focus:outline-none" placeholder="e.g. 123" />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">IP Address</label>
            <input type="text" [ngModel]="filterIp()" (ngModelChange)="filterIp.set($event)" class="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:border-accent focus:outline-none" placeholder="e.g. 1.2.3.4" />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">Path</label>
            <input type="text" [ngModel]="filterPath()" (ngModelChange)="filterPath.set($event)" class="w-full px-3 py-2 bg-input-bg border border-border rounded-lg text-sm focus:border-accent focus:outline-none" placeholder="e.g. /players" />
          </div>
          <div class="flex items-end gap-2">
            <button (click)="applyFilters()" class="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">Search</button>
            <button (click)="clearFilters()" class="px-4 py-2 bg-surface-secondary text-text-secondary rounded-lg text-sm font-medium hover:bg-border transition-colors">Clear</button>
          </div>
        </div>
      </div>

      <!-- Loading / Error / Data -->
      @if (loading()) {
        <div class="text-text-secondary text-center py-12">Loading request logs...</div>
      } @else if (error()) {
        <div class="text-red-400 text-center py-12">{{ error() }}</div>
      } @else if (logs() && logs()!.length === 0) {
        <div class="text-text-secondary text-center py-12">No request logs found for the given filters.</div>
      } @else if (logs()) {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-[rgba(232,93,4,0.08)] text-text-secondary uppercase text-xs">
                <tr>
                  <th class="px-4 py-3 whitespace-nowrap">Time</th>
                  <th class="px-4 py-3 whitespace-nowrap">Method</th>
                  <th class="px-4 py-3">Path</th>
                  <th class="px-4 py-3 whitespace-nowrap">Status</th>
                  <th class="px-4 py-3 whitespace-nowrap">Duration</th>
                  <th class="px-4 py-3 whitespace-nowrap">Player</th>
                  <th class="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.logId) {
                  <tr class="border-t border-[rgba(232,93,4,0.08)] hover:bg-[rgba(232,93,4,0.04)]">
                    <td class="px-4 py-3 whitespace-nowrap text-text-secondary">{{ formatTime(log.createdAt) }}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded text-xs font-medium" [class]="methodClass(log.method)">
                        {{ log.method }}
                      </span>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs break-all">{{ log.path }}</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded text-xs font-medium" [class]="statusClass(log.statusCode)">
                        {{ log.statusCode }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-text-secondary">{{ log.durationMs }}ms</td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      @if (log.playerId) {
                        <a [routerLink]="['/admin/players', log.playerId]" class="text-accent hover:underline">{{ log.playerId }}</a>
                      } @else {
                        <span class="text-text-tertiary">—</span>
                      }
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap font-mono text-xs text-text-secondary">{{ log.ipAddress }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RequestLogsComponent implements OnInit {
  private adminService = inject(AdminService);

  logs = signal<AdminRequestLog[] | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  filterPlayerId = signal<number | undefined>(undefined);
  filterIp = signal<string>('');
  filterPath = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.loadLogs();
  }

  async applyFilters(): Promise<void> {
    await this.loadLogs();
  }

  async clearFilters(): Promise<void> {
    this.filterPlayerId.set(undefined);
    this.filterIp.set('');
    this.filterPath.set('');
    await this.loadLogs();
  }

  private async loadLogs(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.adminService.getRequestLogs({
        playerId: this.filterPlayerId(),
        ipAddress: this.filterIp() || undefined,
        path: this.filterPath() || undefined,
        limit: 500,
      });
      this.logs.set(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load request logs');
    } finally {
      this.loading.set(false);
    }
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      + ' ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  methodClass(method: string): string {
    switch (method) {
      case 'GET': return 'bg-blue-500/20 text-blue-400';
      case 'POST': return 'bg-green-500/20 text-green-400';
      case 'PATCH': return 'bg-yellow-500/20 text-yellow-400';
      case 'DELETE': return 'bg-red-500/20 text-red-400';
      default: return 'bg-surface-secondary text-text-secondary';
    }
  }

  statusClass(status: number): string {
    if (status >= 200 && status < 300) return 'bg-green-500/20 text-green-400';
    if (status >= 400 && status < 500) return 'bg-yellow-500/20 text-yellow-400';
    if (status >= 500) return 'bg-red-500/20 text-red-400';
    return 'bg-surface-secondary text-text-secondary';
  }
}
