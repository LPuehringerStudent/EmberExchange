import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { reverseAuthGuard } from './core/guards/reverse-auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/auth/pages/startup/startup.component').then(m => m.StartupComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./features/home/main-menu.component').then(m => m.MainMenuComponent),
    canActivate: [authGuard]
  },
  {
    path: 'lootboxes',
    loadComponent: () => import('./features/lootbox/lootbox.component').then(m => m.LootboxComponent),
    canActivate: [authGuard]
  },
  {
    path: 'marketplace',
    loadComponent: () => import('./features/marketplace/marketplace.component').then(m => m.MarketplaceComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games',
    loadComponent: () => import('./features/games/games.component').then(m => m.GamesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'statistics',
    loadComponent: () => import('./features/statistics/statistics.component').then(m => m.StatisticsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES)
  },
  {
    path: 'test',
    loadComponent: () => import('./features/test-page/test-page.component').then(m => m.TestPageComponent)
  },
  {
    path: 'update-log',
    loadComponent: () => import('./features/update-log/update-log.component').then(m => m.UpdateLogComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('./shared/components/not-found.component').then(m => m.NotFoundComponent)
  },
  {
    path: 'signup',
    loadComponent: () => import('./shared/components/not-found.component').then(m => m.NotFoundComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [reverseAuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [reverseAuthGuard]
  },
  {
    path: 'oauth/callback',
    loadComponent: () => import('./features/auth/pages/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found.component').then(m => m.NotFoundComponent)
  }
];
