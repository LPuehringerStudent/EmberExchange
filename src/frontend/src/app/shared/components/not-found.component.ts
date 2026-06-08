import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterModule],
  template: `
    <div class="not-found-container">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or is under construction.</p>
      <button routerLink="/" class="btn-primary">Go Home</button>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 1.25rem;
    }
    h1 {
      font-size: 7.5rem;
      margin: 0;
      color: #3f51b5;
    }
    h2 {
      font-size: 2rem;
      margin: 0.625rem 0;
      color: #555;
    }
    p {
      font-size: 1.125rem;
      color: #777;
      margin-bottom: 1.875rem;
    }
    .btn-primary {
      padding: 0.75rem 1.875rem;
      font-size: 1rem;
      background: #3f51b5;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-primary:hover {
      background: #303f9f;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {}
