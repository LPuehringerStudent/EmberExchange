import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="flex min-h-[calc(100vh-64px)]">
      <!-- Admin sidebar -->
      <aside class="w-56 bg-surface border-r border-[rgba(232,93,4,0.15)] p-4">
        <h2 class="text-lg font-bold text-accent mb-4 px-2">Admin Panel</h2>
        <nav class="flex flex-col gap-1">
          <a routerLink="/admin/overview" routerLinkActive="active-admin-link"
             class="px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-[rgba(232,93,4,0.1)] hover:text-accent transition-colors">
            Overview
          </a>
          <a routerLink="/admin/players" routerLinkActive="active-admin-link"
             class="px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-[rgba(232,93,4,0.1)] hover:text-accent transition-colors">
            Players
          </a>
          <a routerLink="/admin/stove-types" routerLinkActive="active-admin-link"
             class="px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-[rgba(232,93,4,0.1)] hover:text-accent transition-colors">
            Stove Types
          </a>
        </nav>
      </aside>

      <!-- Main admin content -->
      <main class="flex-1 p-6 overflow-auto">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .active-admin-link {
      background-color: rgba(232, 93, 4, 0.15);
      color: #e85d04;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminComponent {}
