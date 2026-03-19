import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Redirects authenticated users away from login/register pages to home.
 * Use this guard on routes that should only be accessible to non-authenticated users.
 */
export const reverseAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // Redirect to home if already logged in
    return router.parseUrl('/');
  }

  return true;
};
