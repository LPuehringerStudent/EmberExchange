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
                  <th class="px-4 py-3 font-semibold w-10"></th>
                  <th class="px-4 py-3 font-semibold">Time</th>
                  <th class="px-4 py-3 font-semibold">IP</th>
                  <th class="px-4 py-3 font-semibold">Endpoint</th>
                  <th class="px-4 py-3 font-semibold">Reason</th>
                  <th class="px-4 py-3 font-semibold">User Agent</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (event of events(); track event.timestamp + event.ip + event.reason) {
                  <tr class="hover:bg-surface-secondary/50 transition-colors cursor-pointer" (click)="toggleExpand(event)">
                    <td class="px-4 py-3 text-text-muted">
                      {{ isExpanded(event) ? '▼' : '▶' }}
                    </td>
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
                  @if (isExpanded(event)) {
                    <tr class="bg-surface-secondary/30">
                      <td colspan="6" class="px-4 py-3">
                        @if (event.details) {
                          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Turnstile Token</div>
                              <div class="font-mono" [class.text-green-400]="event.details.turnstileToken === 'present'" [class.text-red-400]="event.details.turnstileToken !== 'present'">
                                {{ event.details.turnstileToken }} (len: {{ event.details.turnstileTokenLength }})
                              </div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Required Header</div>
                              <div class="font-mono" [class.text-green-400]="event.details.hasRequiredHeader" [class.text-red-400]="!event.details.hasRequiredHeader">
                                {{ event.details.hasRequiredHeader ? (event.details.requiredHeaderValue ?? 'yes') : 'MISSING' }}
                              </div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Honeypot</div>
                              <div class="font-mono" [class.text-red-400]="event.details.honeypotTriggered" [class.text-green-400]="!event.details.honeypotTriggered">
                                {{ event.details.honeypotTriggered ? 'TRIGGERED' : 'clean' }}
                              </div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Username</div>
                              <div class="font-mono text-text-primary">{{ event.details.username ?? '—' }}</div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Email Domain</div>
                              <div class="font-mono text-text-primary">{{ event.details.emailDomain ?? '—' }}</div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Host Header</div>
                              <div class="font-mono" [class.text-red-400]="event.details.hostHeader === 'localhost' || event.details.hostHeader === '127.0.0.1'" [class.text-text-primary]="event.details.hostHeader !== 'localhost' && event.details.hostHeader !== '127.0.0.1'">
                                {{ event.details.hostHeader }}
                              </div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border">
                              <div class="text-text-muted mb-1">Form Start Time</div>
                              <div class="font-mono text-text-primary">{{ event.details.formStartTime ?? '—' }}</div>
                            </div>
                            <div class="bg-surface rounded-lg p-3 border border-border col-span-2 md:col-span-3">
                              <div class="text-text-muted mb-1">Body Keys</div>
                              <div class="font-mono text-text-primary">{{ event.details.bodyKeys.join(', ') || 'none' }}</div>
                            </div>
                            @if (event.details.honeypotTriggered && objectKeys(event.details.honeypotFields).length > 0) {
                              <div class="bg-surface rounded-lg p-3 border border-border col-span-2 md:col-span-3">
                                <div class="text-text-muted mb-1">Honeypot Values</div>
                                @for (kv of objectEntries(event.details.honeypotFields); track kv[0]) {
                                  <div class="font-mono text-red-400">{{ kv[0] }} = "{{ kv[1] }}"</div>
                                }
                              </div>
                            }
                          </div>
                        } @else {
                          <div class="text-text-muted italic">No detailed forensics available for this event (logged before upgrade).</div>
                        }
                      </td>
                    </tr>
                  }
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
  expanded = signal<Set<string>>(new Set());

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
      this.expanded.set(new Set());
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to clear log');
    }
  }

  toggleExpand(event: BotTrapEvent): void {
    const key = event.timestamp + event.ip + event.reason;
    const current = this.expanded();
    const next = new Set(current);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expanded.set(next);
  }

  isExpanded(event: BotTrapEvent): boolean {
    return this.expanded().has(event.timestamp + event.ip + event.reason);
  }

  objectKeys(obj: Record<string, string>): string[] {
    return Object.keys(obj);
  }

  objectEntries(obj: Record<string, string>): [string, string][] {
    return Object.entries(obj);
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }
}
