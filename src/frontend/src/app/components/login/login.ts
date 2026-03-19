import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  // Signals for reactive state (Angular 21 best practice)
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  errorMessage = signal('');
  showPassword = signal(false);

  constructor(private router: Router) {}

  onSubmit(): void {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Simulate authentication
    setTimeout(() => {
      this.isLoading.set(false);
      // Navigate to dashboard on success
      this.router.navigate(['/']);
    }, 1500);
  }

  togglePassword(): void {
    this.showPassword.update(value => !value);
  }
}
