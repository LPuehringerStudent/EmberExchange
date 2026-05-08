import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ApiService } from '@core/services/api.service';
import { firstValueFrom } from 'rxjs';

interface SupportForm {
  title: string;
  description: string;
  type: 'bug' | 'feature' | 'support';
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-support',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent {
  form = signal<SupportForm>({
    title: '',
    description: '',
    type: 'support',
    priority: 'medium'
  });

  loading = signal(false);
  success = signal(false);
  error = signal('');

  private authService = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  async onSubmit(): Promise<void> {
    const sessionId = this.authService.getSessionId();
    if (!sessionId) {
      void this.router.navigate(['/']);
      return;
    }

    const currentForm = this.form();
    if (!currentForm.title.trim() || !currentForm.description.trim()) {
      this.error.set('Please fill in all required fields.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set(false);

    try {
      await firstValueFrom(
        this.api.post<{ success: boolean; ticketId: number }>(
          '/support',
          {
            title: currentForm.title.trim(),
            description: currentForm.description.trim(),
            type: currentForm.type,
            priority: currentForm.priority
          },
          new HttpHeaders({ 'session-id': sessionId })
        )
      );

      this.success.set(true);
      this.form.set({ title: '', description: '', type: 'support', priority: 'medium' });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to submit ticket.');
    } finally {
      this.loading.set(false);
    }
  }
}
