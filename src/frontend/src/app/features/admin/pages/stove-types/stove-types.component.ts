import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/admin.service';
import type { StoveTypeRow } from '@shared/model';

@Component({
  selector: 'app-admin-stove-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-5xl mx-auto">
      <h1 class="text-2xl font-bold text-text-primary mb-4">Stove Types</h1>

      @if (loading()) {
        <div class="text-text-secondary">Loading stove types...</div>
      } @else if (error()) {
        <div class="text-red-400">{{ error() }}</div>
      } @else {
        <div class="bg-surface rounded-xl border border-[rgba(232,93,4,0.15)] overflow-hidden mb-6">
          <table class="w-full text-left text-sm">
            <thead class="bg-[rgba(232,93,4,0.08)] text-text-secondary uppercase text-xs">
              <tr>
                <th class="px-4 py-3">ID</th>
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Rarity</th>
                <th class="px-4 py-3">Collection</th>
                <th class="px-4 py-3">Weight</th>
                <th class="px-4 py-3">Heat Range</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              @for (st of stoveTypes(); track st.typeId) {
                <tr class="border-t border-[rgba(232,93,4,0.08)]">
                  @if (editingId() === st.typeId) {
                    <td class="px-4 py-3 text-text-secondary">{{ st.typeId }}</td>
                    <td class="px-4 py-3">
                      <input [(ngModel)]="editForm.name" class="w-full px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <select [(ngModel)]="editForm.rarity" class="px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm">
                        <option>common</option>
                        <option>rare</option>
                        <option>epic</option>
                      </select>
                    </td>
                    <td class="px-4 py-3">
                      <input [(ngModel)]="editForm.collection" class="w-full px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <input type="number" [(ngModel)]="editForm.lootboxWeight" class="w-20 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-1 items-center">
                        <input type="number" step="0.1" [(ngModel)]="editForm.minHeat" class="w-14 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                        <span class="text-text-secondary">-</span>
                        <input type="number" step="0.1" [(ngModel)]="editForm.maxHeat" class="w-14 px-2 py-1 rounded bg-body border border-[rgba(232,93,4,0.2)] text-text-primary text-sm" />
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <button (click)="saveEdit(st.typeId)" class="text-xs text-green-400 hover:underline">Save</button>
                        <button (click)="cancelEdit()" class="text-xs text-text-secondary hover:underline">Cancel</button>
                      </div>
                    </td>
                  } @else {
                    <td class="px-4 py-3 text-text-secondary">{{ st.typeId }}</td>
                    <td class="px-4 py-3 font-medium text-text-primary">{{ st.name }}</td>
                    <td class="px-4 py-3">
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                            [class.bg-rarity-common]="st.rarity === 'common'"
                            [class.bg-rarity-rare]="st.rarity === 'rare'"
                            [class.bg-rarity-epic]="st.rarity === 'epic'"
                            [class.text-white]="st.rarity !== 'common'"
                            [class.text-slate-800]="st.rarity === 'common'">
                        {{ st.rarity }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-text-secondary">{{ st.collection }}</td>
                    <td class="px-4 py-3 text-text-primary">{{ st.lootboxWeight }}</td>
                    <td class="px-4 py-3 text-text-secondary">{{ st.minHeat }} - {{ st.maxHeat }}</td>
                    <td class="px-4 py-3">
                      <button (click)="startEdit(st)" class="text-xs text-accent hover:underline">Edit</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Create new -->
        <div class="bg-surface rounded-xl p-6 border border-[rgba(232,93,4,0.15)]">
          <h2 class="text-lg font-bold text-text-primary mb-3">Create New Stove Type</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs text-text-secondary mb-1">Name</label>
              <input [(ngModel)]="newForm.name" placeholder="Stove name" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Image URL</label>
              <input [(ngModel)]="newForm.imageUrl" placeholder="https://..." class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Rarity</label>
              <select [(ngModel)]="newForm.rarity" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent">
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Collection</label>
              <input [(ngModel)]="newForm.collection" placeholder="e.g. Classic" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="block text-xs text-text-secondary mb-1">Lootbox Weight</label>
              <input type="number" [(ngModel)]="newForm.lootboxWeight" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-xs text-text-secondary mb-1">Min Heat</label>
                <input type="number" step="0.1" [(ngModel)]="newForm.minHeat" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
              </div>
              <div class="flex-1">
                <label class="block text-xs text-text-secondary mb-1">Max Heat</label>
                <input type="number" step="0.1" [(ngModel)]="newForm.maxHeat" class="w-full px-3 py-2 rounded-lg bg-body border border-[rgba(232,93,4,0.2)] text-text-primary focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>
          <button
            (click)="create()"
            [disabled]="creating"
            class="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {{ creating ? 'Creating...' : 'Create Stove Type' }}
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
export class StoveTypesComponent {
  private adminService = inject(AdminService);

  stoveTypes = signal<StoveTypeRow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  editingId = signal<number | null>(null);
  editForm: Partial<StoveTypeRow> = {};

  newForm = {
    name: '',
    imageUrl: '',
    rarity: 'common',
    collection: '',
    lootboxWeight: 1,
    minHeat: 0,
    maxHeat: 1
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
      const data = await this.adminService.getStoveTypes();
      this.stoveTypes.set(data);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load stove types');
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(st: StoveTypeRow): void {
    this.editingId.set(st.typeId);
    this.editForm = { ...st };
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm = {};
  }

  async saveEdit(typeId: number): Promise<void> {
    try {
      await this.adminService.updateStoveType(typeId, this.editForm);
      this.editingId.set(null);
      await this.load();
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to update stove type');
    }
  }

  async create(): Promise<void> {
    this.creating = true;
    this.createMessage.set(null);
    try {
      await this.adminService.createStoveType({
        name: this.newForm.name,
        imageUrl: this.newForm.imageUrl || '',
        rarity: this.newForm.rarity as any,
        collection: this.newForm.collection,
        lootboxWeight: this.newForm.lootboxWeight,
        minHeat: this.newForm.minHeat,
        maxHeat: this.newForm.maxHeat
      });
      this.createMessage.set('Stove type created');
      this.createError.set(false);
      this.newForm = { name: '', imageUrl: '', rarity: 'common', collection: '', lootboxWeight: 1, minHeat: 0, maxHeat: 1 };
      await this.load();
    } catch (err) {
      this.createMessage.set(err instanceof Error ? err.message : 'Failed to create stove type');
      this.createError.set(true);
    } finally {
      this.creating = false;
    }
  }
}
