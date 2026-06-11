import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, type AdminPlayerList, type PlayerFilters } from '@core/services/admin.service';
import type { PlayerRow } from '@shared/model';

@Component({
  selector: 'app-admin-players',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary mb-4">Players</h1>

      <!-- Filter Bar -->
      <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] p-4 mb-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Search -->
          <div class="lg:col-span-2">
            <label class="block text-xs text-text-secondary mb-1">Search</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keydown.enter)="applyFilters()"
              placeholder="Username or email..."
              class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <!-- Sort -->
          <div>
            <label class="block text-xs text-text-secondary mb-1">Sort by</label>
            <select
              [(ngModel)]="sortBy"
              (change)="applyFilters()"
              class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm focus:outline-none focus:border-accent"
            >
              <option value="id_desc">Newest first</option>
              <option value="id_asc">Oldest first</option>
              <option value="coins_desc">Most coal</option>
              <option value="coins_asc">Least coal</option>
              <option value="joined_desc">Recently joined</option>
              <option value="joined_asc">Earliest joined</option>
            </select>
          </div>

          <!-- Coal Range -->
          <div>
            <label class="block text-xs text-text-secondary mb-1">Coal range</label>
            <div class="flex gap-2">
              <input
                type="number"
                [(ngModel)]="minCoins"
                (change)="applyFilters()"
                placeholder="Min"
                min="0"
                class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:border-accent"
              />
              <input
                type="number"
                [(ngModel)]="maxCoins"
                (change)="applyFilters()"
                placeholder="Max"
                min="0"
                class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <!-- Status Filter -->
          <div>
            <label class="block text-xs text-text-secondary mb-1">Status</label>
            <div class="flex gap-1">
              @for (opt of statusOptions; track opt.value) {
                <button
                  (click)="setBannedFilter(opt.value)"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                  [class.bg-accent]="bannedFilter() === opt.value"
                  [class.text-white]="bannedFilter() === opt.value"
                  [class.border-accent]="bannedFilter() === opt.value"
                  [class.bg-surface]="bannedFilter() !== opt.value"
                  [class.text-text-secondary]="bannedFilter() !== opt.value"
                  [class.border-[rgba(232,93,4,0.2)]]="bannedFilter() !== opt.value"
                >
                  {{ opt.label }}
                </button>
              }
            </div>
          </div>

          <!-- Role Filter -->
          <div class="flex items-end justify-between gap-3">
            <div class="flex-1">
              <label class="block text-xs text-text-secondary mb-1">Role</label>
              <div class="flex gap-1">
                @for (opt of roleOptions; track opt.value) {
                  <button
                    (click)="setRoleFilter(opt.value)"
                    class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
                    [class.bg-accent]="roleFilter() === opt.value"
                    [class.text-white]="roleFilter() === opt.value"
                    [class.border-accent]="roleFilter() === opt.value"
                    [class.bg-surface]="roleFilter() !== opt.value"
                    [class.text-text-secondary]="roleFilter() !== opt.value"
                    [class.border-[rgba(232,93,4,0.2)]]="roleFilter() !== opt.value"
                  >
                    {{ opt.label }}
                  </button>
                }
              </div>
            </div>
            <button
              (click)="resetFilters()"
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-accent border border-[rgba(232,93,4,0.2)] hover:border-accent transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] p-4 space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            @for (_ of [0, 1, 2, 3]; track $index) {
              <div class="h-10 rounded-lg skeleton-shimmer"></div>
            }
          </div>
          <div class="overflow-hidden rounded-xl border border-border">
            @for (_ of [0, 1, 2, 3, 4, 5]; track $index) {
              <div class="grid grid-cols-9 gap-3 px-4 py-3 border-t border-border">
                @for (__ of [0, 1, 2, 3, 4, 5, 6, 7, 8]; track $index) {
                  <div class="h-3 rounded skeleton-shimmer"></div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else if (data()) {
        <!-- Results summary -->
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-text-secondary">
            Showing {{ ((page() - 1) * limit()) + 1 }} -
            {{ ((page() - 1) * limit()) + data()!.players.length }} of {{ data()!.total }}
          </div>
        </div>

        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="bg-[rgba(232,93,4,0.08)] text-text-secondary uppercase text-xs">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Username</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3 text-right">Coal</th>
                <th class="px-4 py-3 text-right">Lootboxes</th>
                <th class="px-4 py-3">Role</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Joined</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (player of data()!.players; track player.playerId) {
                <tr class="border-t border-[rgba(232,93,4,0.08)] hover:bg-[rgba(232,93,4,0.04)]">
                  <td class="px-4 py-3 text-text-secondary">{{ player.playerId }}</td>
                  <td class="px-4 py-3 font-medium text-text-primary">{{ player.username }}</td>
                  <td class="px-4 py-3 text-text-secondary">{{ player.email }}</td>
                  <td class="px-4 py-3 text-right text-accent font-semibold">{{ player.coins.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right text-text-secondary">{{ player.lootboxCount }}</td>
                  <td class="px-4 py-3">
                    @if (player.isAdmin) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">Admin</span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">User</span>
                    }
                  </td>
                  <td class="px-4 py-3">
                    @if (player.bannedAt) {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Banned</span>
                    } @else {
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Active</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-text-secondary">{{ player.joinedAt | date:'shortDate' }}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <a [routerLink]="['/admin/players', player.playerId]"
                         class="text-accent text-xs font-medium hover:underline">
                        View
                      </a>
                      <button
                        (click)="toggleBan(player)"
                        [disabled]="banningId() === player.playerId || deletingId() === player.playerId"
                        class="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50"
                        [class.bg-red-500/20]="!player.bannedAt"
                        [class.text-red-400]="!player.bannedAt"
                        [class.hover:bg-red-500/30]="!player.bannedAt"
                        [class.bg-green-500/20]="player.bannedAt"
                        [class.text-green-400]="player.bannedAt"
                        [class.hover:bg-green-500/30]="player.bannedAt"
                      >
                        @if (banningId() === player.playerId) {
                          ...
                        } @else if (player.bannedAt) {
                          Unban
                        } @else {
                          Ban
                        }
                      </button>
                      <button
                        (click)="deletePlayer(player)"
                        [disabled]="banningId() === player.playerId || deletingId() === player.playerId"
                        class="px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        @if (deletingId() === player.playerId) {
                          ...
                        } @else {
                          Delete
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between mt-4">
          <div class="text-sm text-text-secondary">
            Page {{ page() }} of {{ Math.ceil(data()!.total / limit()) || 1 }}
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
  banningId = signal<number | null>(null);
  deletingId = signal<number | null>(null);

  // Filters
  searchQuery = '';
  bannedFilter = signal<PlayerFilters['banned']>('all');
  roleFilter = signal<PlayerFilters['isAdmin']>('all');
  minCoins: number | null = null;
  maxCoins: number | null = null;
  sortBy = 'id_desc';

  statusOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Active', value: 'active' as const },
    { label: 'Banned', value: 'banned' as const },
  ];

  roleOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Admin', value: 'admin' as const },
    { label: 'User', value: 'user' as const },
  ];

  Math = Math;

  constructor() {
    this.loadPage(1);
  }

  setBannedFilter(value: PlayerFilters['banned']): void {
    this.bannedFilter.set(value);
    this.applyFilters();
  }

  setRoleFilter(value: PlayerFilters['isAdmin']): void {
    this.roleFilter.set(value);
    this.applyFilters();
  }

  applyFilters(): void {
    this.loadPage(1);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.bannedFilter.set('all');
    this.roleFilter.set('all');
    this.minCoins = null;
    this.maxCoins = null;
    this.sortBy = 'id_desc';
    this.loadPage(1);
  }

  async loadPage(p: number): Promise<void> {
    this.page.set(p);
    this.loading.set(true);
    this.error.set(null);
    try {
      const filters: PlayerFilters = {
        search: this.searchQuery || undefined,
        banned: this.bannedFilter(),
        isAdmin: this.roleFilter(),
        sortBy: this.sortBy,
      };
      if (this.minCoins !== null && !isNaN(this.minCoins)) {
        filters.minCoins = this.minCoins;
      }
      if (this.maxCoins !== null && !isNaN(this.maxCoins)) {
        filters.maxCoins = this.maxCoins;
      }
      const result = await this.adminService.getPlayers(this.page(), this.limit(), filters);
      this.data.set(result);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleBan(player: PlayerRow): Promise<void> {
    const action = player.bannedAt ? 'unban' : 'ban';
    const confirmMsg = action === 'ban'
      ? `Ban player "${player.username}"? They will be immediately locked out of all game actions.`
      : `Unban player "${player.username}"?`;
    if (!confirm(confirmMsg)) return;

    this.banningId.set(player.playerId);
    try {
      await this.adminService.setPlayerBanStatus(player.playerId, action === 'ban', 'Admin action');
      // Update local data without full reload
      const current = this.data();
      if (current) {
        const updated = current.players.map(p =>
          p.playerId === player.playerId
            ? { ...p, bannedAt: action === 'ban' ? new Date().toISOString() as unknown as Date : null }
            : p
        );
        this.data.set({ ...current, players: updated as typeof current.players });
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : `Failed to ${action} player`);
    } finally {
      this.banningId.set(null);
    }
  }

  async deletePlayer(player: PlayerRow): Promise<void> {
    const confirmMsg = `Permanently delete player "${player.username}" (ID: ${player.playerId})?\n\nThis action cannot be undone. All player data including items, trades, coins, and history will be permanently removed.`;
    if (!confirm(confirmMsg)) return;

    this.deletingId.set(player.playerId);
    try {
      await this.adminService.deletePlayer(player.playerId);
      // Remove player from local list without full reload
      const current = this.data();
      if (current) {
        const updated = current.players.filter(p => p.playerId !== player.playerId);
        this.data.set({ ...current, players: updated as typeof current.players, total: current.total - 1 });
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete player');
    } finally {
      this.deletingId.set(null);
    }
  }
}
