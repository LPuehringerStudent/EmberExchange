import { Routes } from '@angular/router';
import { adminGuard } from '@core/guards/admin.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () => import('./pages/overview/overview.component').then(m => m.OverviewComponent)
      },
      {
        path: 'players',
        loadComponent: () => import('./pages/players/players.component').then(m => m.PlayersComponent)
      },
      {
        path: 'players/:id',
        loadComponent: () => import('./pages/player-detail/player-detail.component').then(m => m.PlayerDetailComponent)
      },
      {
        path: 'stove-types',
        loadComponent: () => import('./pages/stove-types/stove-types.component').then(m => m.StoveTypesComponent)
      },
      {
        path: 'bot-traps',
        loadComponent: () => import('./pages/bot-traps/bot-traps.component').then(m => m.BotTrapsComponent)
      },
      {
        path: 'banned-ips',
        loadComponent: () => import('./pages/banned-ips/banned-ips.component').then(m => m.BannedIPsComponent)
      },
      {
        path: 'request-logs',
        loadComponent: () => import('./pages/request-logs/request-logs.component').then(m => m.RequestLogsComponent)
      },
      {
        path: 'codes',
        loadComponent: () => import('./pages/codes/codes.component').then(m => m.CodesComponent)
      }
    ]
  }
];
