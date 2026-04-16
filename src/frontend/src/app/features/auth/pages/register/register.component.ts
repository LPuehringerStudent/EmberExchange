import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  // Signals for reactive state
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  private router = inject(Router);
  private authService = inject(AuthService);

  registerForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    confirmPassword: new FormControl('', [Validators.required])
  });

  async onSubmit(): Promise<void> {
    // Reset error message
    this.errorMessage.set('');

    const { username, email, password, confirmPassword } = this.registerForm.value;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      this.errorMessage.set('Password must be at least 6 characters');
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email!)) {
      this.errorMessage.set('Please enter a valid email address');
      return;
    }

    this.isLoading.set(true);

    try {
      // Call auth service to register (defaults to sessionStorage for new registrations)
      await this.authService.register(
        username!,
        password!,
        email!,
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
