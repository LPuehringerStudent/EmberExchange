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
      padding: 20px;
    }
    h1 {
      font-size: 120px;
      margin: 0;
      color: #3f51b5;
    }
    h2 {
      font-size: 32px;
      margin: 10px 0;
      color: #555;
    }
    p {
      font-size: 18px;
      color: #777;
      margin-bottom: 30px;
    }
    .btn-primary {
      padding: 12px 30px;
      font-size: 16px;
      background: #3f51b5;
      color: white;
      border: none;
      border-radius: 8px;
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
