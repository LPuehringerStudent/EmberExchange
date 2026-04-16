import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register{
  // Form signals
  username = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  forgeName = signal('');

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

  constructor(private router: Router) {}

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
      if (!this.username() || !this.email()) {
        this.errorMessage.set('Fill all fields');
        return;
      }
      if (!this.isValidEmail(this.email())) {
        this.errorMessage.set('Enter a valid E-Mail address');
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

  onSubmit(): void {
    if (!this.password() || !this.confirmPassword()) {
      this.errorMessage.set('Both password fields required');
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set('Passwords ain`t matching man ');
      return;
    }

    if (this.password().length < 8) {
      this.errorMessage.set('Password too weak- must be at least 8 characters');
      return;
    }

    if (!this.acceptedTerms()) {
      this.errorMessage.set('You must accept the terms and conditions');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Simulate registration
    setTimeout(() => {
      this.isLoading.set(false);
      this.successMessage.set('Account created successfully! Redirecting to login...');

      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    }, 2000);
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
