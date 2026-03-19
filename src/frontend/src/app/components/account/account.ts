import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: '../settings/settings.css',
})
export class Account implements OnInit {
  // User data
  username = signal<string>('');
  email = signal<string>('');
  originalEmail = '';
  
  // Password change
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  
  // Status
  loading = signal<boolean>(false);
  emailSuccess = signal<string>('');
  emailError = signal<string>('');
  passwordSuccess = signal<string>('');
  passwordError = signal<string>('');
  
  private _authService = inject(AuthService);
  private _router = inject(Router);

  ngOnInit(): void {
    const user = this._authService.getCurrentUser();
    if (user) {
      this.username.set(user.username);
      this.email.set(user.email);
      this.originalEmail = user.email;
    } else {
      // Redirect to login if not authenticated
      this._router.navigate(['/login']);
    }
  }

  async saveChanges(): Promise<void> {
    this.emailSuccess.set('');
    this.emailError.set('');
    
    const newEmail = this.email().trim();
    
    if (!newEmail) {
      this.emailError.set('Email is required');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      this.emailError.set('Please enter a valid email address');
      return;
    }
    
    if (newEmail === this.originalEmail) {
      this.emailError.set('No changes to save');
      return;
    }
    
    this.loading.set(true);
    
    try {
      const sessionId = this._authService.getSessionId();
      if (!sessionId) {
        this.emailError.set('Not authenticated');
        return;
      }
      
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'session-id': sessionId
        },
        body: JSON.stringify({ email: newEmail })
      });
      
      if (response.ok) {
        this.emailSuccess.set('Email updated successfully');
        this.originalEmail = newEmail;
        // Refresh user data
        await this._authService.refreshUser();
      } else {
        const error = await response.json();
        this.emailError.set(error.error || 'Failed to update email');
      }
    } catch (err) {
      this.emailError.set('Network error. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  async updatePassword(): Promise<void> {
    this.passwordSuccess.set('');
    this.passwordError.set('');
    
    const current = this.currentPassword();
    const newPass = this.newPassword();
    const confirm = this.confirmPassword();
    
    if (!current || !newPass || !confirm) {
      this.passwordError.set('All password fields are required');
      return;
    }
    
    if (newPass.length < 6) {
      this.passwordError.set('New password must be at least 6 characters');
      return;
    }
    
    if (newPass !== confirm) {
      this.passwordError.set('New passwords do not match');
      return;
    }
    
    this.loading.set(true);
    
    try {
      const sessionId = this._authService.getSessionId();
      if (!sessionId) {
        this.passwordError.set('Not authenticated');
        return;
      }
      
      const response = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'session-id': sessionId
        },
        body: JSON.stringify({ 
          currentPassword: current,
          newPassword: newPass 
        })
      });
      
      if (response.ok) {
        this.passwordSuccess.set('Password updated successfully');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      } else {
        const error = await response.json();
        this.passwordError.set(error.error || 'Failed to update password');
      }
    } catch (err) {
      this.passwordError.set('Network error. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
