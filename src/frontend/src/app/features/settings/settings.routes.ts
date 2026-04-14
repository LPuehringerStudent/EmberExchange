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
      { path: 'appearance', loadComponent: () => import('./pages/appearance/appearance.component').then(m => m.AppearanceComponent) },
      { path: 'language', loadComponent: () => import('./pages/language/language.component').then(m => m.LanguageComponent) },
      { path: 'socials', loadComponent: () => import('./pages/socials/socials.component').then(m => m.SocialsComponent) }
    ]
  }
];
