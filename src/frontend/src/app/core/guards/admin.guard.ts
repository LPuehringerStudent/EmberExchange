import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ready();

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  return router.parseUrl('/home');
};
