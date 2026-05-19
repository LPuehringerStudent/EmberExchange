import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'account', pathMatch: 'full' },
      { path: 'account', loadComponent: () => import('./pages/account/account.component').then(m => m.AccountComponent) },
      { path: 'security', loadComponent: () => import('./pages/security/security.component').then(m => m.SecurityComponent) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent) },
      { path: 'appearance', loadComponent: () => import('./pages/appearance/appearance.component').then(m => m.AppearanceComponent) },
      { path: 'danger-zone', loadComponent: () => import('./pages/danger-zone/danger-zone.component').then(m => m.DangerZoneComponent) }
    ]
  }
];
