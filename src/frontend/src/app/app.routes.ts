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
    path: 'shop',
    loadComponent: () => import('./features/shop/shop.component').then(m => m.ShopComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games',
    loadComponent: () => import('./features/games/games.component').then(m => m.GamesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'games/:gameType/lobby',
    loadComponent: () => import('./features/game-lobby/game-lobby.component').then(m => m.GameLobbyComponent),
    canActivate: [authGuard]
  },
  {
    path: 'game-room/:roomId',
    loadComponent: () => import('./features/game-room/game-room.component').then(m => m.GameRoomComponent),
    canActivate: [authGuard]
  },
  {
    path: 'inventory',
    loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'forgery',
    loadComponent: () => import('./features/forgery/forgery.component').then(m => m.ForgeryComponent),
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
    path: 'update-log',
    loadComponent: () => import('./features/update-log/update-log.component').then(m => m.UpdateLogComponent)
  },
  {
    path: 'glory',
    loadComponent: () => import('./features/hall-of-glory/hall-of-glory.component').then(m => m.HallOfGloryComponent),
    canActivate: [authGuard]
  },
  {
    path: 'glory/:playerId',
    loadComponent: () => import('./features/hall-of-glory/hall-of-glory.component').then(m => m.HallOfGloryComponent)
  },
  {
    path: 'glory/user/:username',
    loadComponent: () => import('./features/hall-of-glory/hall-of-glory.component').then(m => m.HallOfGloryComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('./features/support/support.component').then(m => m.SupportComponent),
    canActivate: [authGuard]
  },
  {
    path: 'social',
    loadComponent: () => import('./features/social/social.component').then(m => m.SocialComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES)
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
  },
  {
    path: 'merging',
    loadComponent: () => import('./features/merging/merging').then(m => m.Merging),
    canActivate: [authGuard]
  },
];
