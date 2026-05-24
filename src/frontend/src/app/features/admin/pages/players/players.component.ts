import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, type AdminPlayerList } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-players',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary mb-4">Players</h1>

      <div class="flex gap-3 mb-4">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (keydown.enter)="loadPage(1)"
          placeholder="Search by username or email..."
          class="flex-1 px-4 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
        />
        <button
          (click)="loadPage(1)"
          class="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </div>

      @if (loading()) {
        <div class="text-text-secondary">Loading players...</div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else if (data()) {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="bg-[rgba(232,93,4,0.08)] text-text-secondary uppercase text-xs">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Username</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Coins</th>
                <th class="px-4 py-3">Joined</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (player of data()!.players; track player.playerId) {
                <tr class="border-t border-[rgba(232,93,4,0.08)] hover:bg-[rgba(232,93,4,0.04)]">
                  <td class="px-4 py-3 text-text-secondary">{{ player.playerId }}</td>
                  <td class="px-4 py-3 font-medium text-text-primary">{{ player.username }}</td>
                  <td class="px-4 py-3 text-text-secondary">{{ player.email }}</td>
                  <td class="px-4 py-3 text-accent font-semibold">{{ player.coins.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-text-secondary">{{ player.joinedAt | date:'short' }}</td>
                  <td class="px-4 py-3">
                    @if (player.bannedAt) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Banned</span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Active</span>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <a [routerLink]="['/admin/players', player.playerId]"
                       class="text-accent text-xs font-medium hover:underline">
                      View
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4">
          <div class="text-sm text-text-secondary">
            Showing {{ ((page() - 1) * limit()) + 1 }} -
            {{ ((page() - 1) * limit()) + data()!.players.length }} of {{ data()!.total }}
          </div>
          <div class="flex gap-2">
            <button
              [disabled]="page() <= 1"
              (click)="loadPage(page() - 1)"
              class="px-3 py-1.5 rounded-lg bg-surface border border-[rgba(232,93,4,0.2)] text-sm text-text-primary disabled:opacity-40 hover:border-accent transition-colors"
            >
              Previous
            </button>
            <button
              [disabled]="page() * limit() >= data()!.total"
              (click)="loadPage(page() + 1)"
              class="px-3 py-1.5 rounded-lg bg-surface border border-[rgba(232,93,4,0.2)] text-sm text-text-primary disabled:opacity-40 hover:border-accent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayersComponent {
  private adminService = inject(AdminService);

  data = signal<AdminPlayerList | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  limit = signal(20);
  searchQuery = '';

  constructor() {
    this.loadPage(1);
  }

  async loadPage(p: number): Promise<void> {
    this.page.set(p);
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.adminService.getPlayers(this.page(), this.limit(), this.searchQuery);
      this.data.set(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      this.loading.set(false);
    }
  }
}
