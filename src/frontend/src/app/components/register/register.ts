import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  // Signals for reactive state
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  username = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async onSubmit(): Promise<void> {
    // Reset error message
    this.errorMessage.set('');

    // Validation
    if (!this.email() || !this.password() || !this.confirmPassword() || !this.username()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    if (this.password().length < 6) {
      this.errorMessage.set('Password must be at least 6 characters');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email())) {
      this.errorMessage.set('Please enter a valid email address');
      return;
    }

    this.isLoading.set(true);

    try {
      // Call auth service to register (defaults to sessionStorage for new registrations)
      await this.authService.register(
        this.username(),
        this.password(),
        this.email(),
        false // Don't remember me by default for new registrations
      );

      // Navigate to main page on success
      this.router.navigate(['/']);
    } catch (err) {
      // Display error message
      this.errorMessage.set(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update(value => !value);
  }
}
