import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  // Form signals
  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  // UI state signals
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  currentStep = signal(1);
  acceptedTerms = signal(false);

  // Password strength
  passwordStrength = signal(0);
  strengthLabel = signal('Cold Ash');
  strengthColor = signal('#6c757d');

  private router = inject(Router);
  private authService = inject(AuthService);

  updatePasswordStrength(password: string): void {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    this.passwordStrength.set(strength);

    const labels = ['Cold Ash', 'Dying Ember', 'Growing Flame', 'Blazing Fire', 'Inferno'];
    const colors = ['#6c757d', '#8b4513', '#e85d04', '#f48c06', '#dc3545'];

    this.strengthLabel.set(labels[strength]);
    this.strengthColor.set(colors[strength]);
  }

  onPasswordChange(value: string): void {
    this.password.set(value);
    this.updatePasswordStrength(value);
  }

  nextStep(): void {
    if (this.currentStep() === 1) {
      if (!this.username().trim() || !this.email().trim()) {
        this.errorMessage.set('Fill all fields');
        return;
      }
      if (!this.isValidEmail(this.email())) {
        this.errorMessage.set('Enter a valid E-Mail address');
        return;
      }
    }

    if (this.currentStep() === 2) {
      if (!this.password() || !this.confirmPassword()) {
        this.errorMessage.set('Both password fields required');
        return;
      }
      if (this.password() !== this.confirmPassword()) {
        this.errorMessage.set('Passwords do not match');
        return;
      }
      if (this.password().length < 8) {
        this.errorMessage.set('Password too weak — must be at least 8 characters');
        return;
      }
    }

    this.errorMessage.set('');
    this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    this.errorMessage.set('');
    this.currentStep.update(s => s - 1);
  }

  async onSubmit(): Promise<void> {
    if (!this.acceptedTerms()) {
      this.errorMessage.set('You must accept the terms and conditions');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.register(
        this.username(),
        this.password(),
        this.email(),
        false // Don't remember me by default for new registrations
      );
      this.successMessage.set('Account created successfully! Redirecting...');
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 1500);
    } catch (err) {
      this.isLoading.set(false);
      this.errorMessage.set(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  }

  togglePassword(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword.update(v => !v);
    } else {
      this.showConfirmPassword.update(v => !v);
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
