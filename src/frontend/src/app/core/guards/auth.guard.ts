import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ready();

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirect to startup landing page if not authenticated
  return router.parseUrl('/');
};
