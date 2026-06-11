import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, type RedeemCode } from '@core/services/admin.service';

@Component({
  selector: 'app-admin-codes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary mb-4">Redeem Codes</h1>

      @if (loading()) {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden mb-6">
          <div class="p-4 space-y-3">
            @for (_ of [0, 1, 2, 3, 4]; track $index) {
              <div class="grid grid-cols-10 gap-3">
                @for (__ of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; track $index) {
                  <div class="h-4 rounded skeleton-shimmer"></div>
                }
              </div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden mb-6">
          <table class="w-full text-left text-sm">
            <thead class="bg-[rgba(232,93,4,0.08)] text-text-secondary uppercase text-xs">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Code</th>
                <th class="px-4 py-3">Coins</th>
                <th class="px-4 py-3">Boxes</th>
                <th class="px-4 py-3">Sparks</th>
                <th class="px-4 py-3">Spins</th>
                <th class="px-4 py-3">Uses</th>
                <th class="px-4 py-3">Expires</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (code of codes(); track code.codeId) {
                <tr class="border-t border-[rgba(232,93,4,0.08)]">
                  @if (editingId() === code.codeId) {
                    <td class="px-4 py-3 text-text-secondary">{{ code.codeId }}</td>
                    <td class="px-4 py-3">
                      <input [(ngModel)]="editForm.code" class="w-full px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm uppercase" />
                    </td>
                    <td class="px-4 py-3">
                      <input type="number" [(ngModel)]="editForm.rewardCoins" class="w-16 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <input type="number" [(ngModel)]="editForm.rewardLootboxes" class="w-16 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <input type="number" [(ngModel)]="editForm.rewardSparks" class="w-16 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <input type="number" [(ngModel)]="editForm.rewardSpins" class="w-16 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-1 items-center">
                        <input type="number" [(ngModel)]="editForm.maxUses" class="w-14 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                        <span class="text-text-secondary text-xs">/ {{ code.usedCount }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <input type="datetime-local" [(ngModel)]="editForm.expiresAt" class="w-full px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <select [(ngModel)]="editForm.isActive" class="px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm">
                        <option [ngValue]="1">Active</option>
                        <option [ngValue]="0">Inactive</option>
                      </select>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button (click)="saveEdit(code.codeId)" class="text-xs text-green-400 hover:underline">Save</button>
                        <button (click)="cancelEdit()" class="text-xs text-text-secondary hover:underline">Cancel</button>
                      </div>
                    </td>
                  } @else {
                    <td class="px-4 py-3 text-text-secondary">{{ code.codeId }}</td>
                    <td class="px-4 py-3 font-mono font-semibold text-text-primary uppercase">{{ code.code }}</td>
                    <td class="px-4 py-3 text-text-primary">{{ code.rewardCoins }}</td>
                    <td class="px-4 py-3 text-text-primary">{{ code.rewardLootboxes }}</td>
                    <td class="px-4 py-3 text-text-primary">{{ code.rewardSparks }}</td>
                    <td class="px-4 py-3 text-text-primary">{{ code.rewardSpins }}</td>
                    <td class="px-4 py-3 text-text-secondary">
                      {{ code.usedCount }}
                      @if (code.maxUses !== null && code.maxUses !== undefined) {
                        <span class="text-text-secondary"> / {{ code.maxUses }}</span>
                      } @else {
                        <span class="text-text-secondary"> / &infin;</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-text-secondary">
                      @if (code.expiresAt) {
                        {{ code.expiresAt | date:'short' }}
                      } @else {
                        Never
                      }
                    </td>
                    <td class="px-4 py-3">
                      @if (code.isActive) {
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">Active</span>
                      } @else {
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-400">Inactive</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button (click)="startEdit(code)" class="text-xs text-accent hover:underline">Edit</button>
                        <button (click)="deleteCode(code.codeId)" class="text-xs text-red-400 hover:underline">Delete</button>
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Create new -->
        <div class="bg-surface rounded-xl p-6 border border-[rgba(232,93,4,0.15)]">
          <h2 class="text-lg font-bold text-text-primary mb-3">Create New Code</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-text-secondary mb-1">Code</label>
              <input [(ngModel)]="newForm.code" placeholder="PROMO-2024" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent uppercase" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Reward Coins</label>
              <input type="number" [(ngModel)]="newForm.rewardCoins" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Reward Lootboxes</label>
              <input type="number" [(ngModel)]="newForm.rewardLootboxes" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Reward Sparks</label>
              <input type="number" [(ngModel)]="newForm.rewardSparks" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Reward Spins</label>
              <input type="number" [(ngModel)]="newForm.rewardSpins" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Max Uses (empty = unlimited)</label>
              <input type="number" [(ngModel)]="newForm.maxUses" placeholder="Unlimited" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Expires At (optional)</label>
              <input type="datetime-local" [(ngModel)]="newForm.expiresAt" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Status</label>
              <select [(ngModel)]="newForm.isActive" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive</option>
              </select>
            </div>
          </div>
          <button
            (click)="create()"
            [disabled]="creating"
            class="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {{ creating ? 'Creating...' : 'Create Code' }}
          </button>
          @if (createMessage()) {
            <div class="text-sm mt-2" [class.text-green-400]="!createError()" [class.text-red-400]="createError()">
              {{ createMessage() }}
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodesComponent {
  private adminService = inject(AdminService);

  codes = signal<RedeemCode[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  editingId = signal<number | null>(null);
  editForm: Partial<RedeemCode> = {};

  newForm = {
    code: '',
    rewardCoins: 0,
    rewardLootboxes: 0,
    rewardSparks: 0,
    rewardSpins: 0,
    maxUses: null as number | null,
    expiresAt: '',
    isActive: true
  };
  creating = false;
  createMessage = signal<string | null>(null);
  createError = signal(false);

  constructor() {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.adminService.getRedeemCodes();
      this.codes.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load codes');
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(code: RedeemCode): void {
    this.editingId.set(code.codeId);
    this.editForm = {
      code: code.code,
      rewardCoins: code.rewardCoins,
      rewardLootboxes: code.rewardLootboxes,
      rewardSparks: code.rewardSparks,
      rewardSpins: code.rewardSpins,
      maxUses: code.maxUses,
      expiresAt: code.expiresAt ? this.toDatetimeLocal(code.expiresAt) : '',
      isActive: code.isActive
    };
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm = {};
  }

  async saveEdit(codeId: number): Promise<void> {
    try {
      const updates: Partial<Omit<RedeemCode, 'codeId' | 'usedCount' | 'createdAt'>> = {};
      if (this.editForm.code !== undefined) updates.code = this.editForm.code;
      if (this.editForm.rewardCoins !== undefined) updates.rewardCoins = Number(this.editForm.rewardCoins);
      if (this.editForm.rewardLootboxes !== undefined) updates.rewardLootboxes = Number(this.editForm.rewardLootboxes);
      if (this.editForm.rewardSparks !== undefined) updates.rewardSparks = Number(this.editForm.rewardSparks);
      if (this.editForm.rewardSpins !== undefined) updates.rewardSpins = Number(this.editForm.rewardSpins);
      if (this.editForm.maxUses !== undefined) updates.maxUses = this.editForm.maxUses === null || (this.editForm.maxUses as any) === '' ? null : Number(this.editForm.maxUses);
      if (this.editForm.expiresAt !== undefined) updates.expiresAt = (this.editForm.expiresAt as any) === '' ? null : this.editForm.expiresAt as string;
      if (this.editForm.isActive !== undefined) updates.isActive = this.editForm.isActive ? 1 : 0;

      await this.adminService.updateRedeemCode(codeId, updates);
      this.editingId.set(null);
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update code');
    }
  }

  async deleteCode(codeId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this code?')) return;
    try {
      await this.adminService.deleteRedeemCode(codeId);
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to delete code');
    }
  }

  async create(): Promise<void> {
    this.creating = true;
    this.createMessage.set(null);
    try {
      await this.adminService.createRedeemCode({
        code: this.newForm.code.trim().toUpperCase(),
        rewardCoins: Number(this.newForm.rewardCoins),
        rewardLootboxes: Number(this.newForm.rewardLootboxes),
        rewardSparks: Number(this.newForm.rewardSparks),
        rewardSpins: Number(this.newForm.rewardSpins),
        maxUses: this.newForm.maxUses === null || (this.newForm.maxUses as any) === '' ? null : Number(this.newForm.maxUses),
        expiresAt: this.newForm.expiresAt || null,
        isActive: this.newForm.isActive ? 1 : 0
      });
      this.createMessage.set('Code created');
      this.createError.set(false);
      this.newForm = { code: '', rewardCoins: 0, rewardLootboxes: 0, rewardSparks: 0, rewardSpins: 0, maxUses: null, expiresAt: '', isActive: true };
      await this.load();
    } catch (err) {
      this.createMessage.set(err instanceof Error ? err.message : 'Failed to create code');
      this.createError.set(true);
    } finally {
      this.creating = false;
    }
  }

  private toDatetimeLocal(isoString: string): string {
    const d = new Date(isoString);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}
