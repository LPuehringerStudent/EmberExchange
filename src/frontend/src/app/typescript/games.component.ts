import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-games',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="games-container">
      <h1>🎮 Games</h1>
      <p class="subtitle">Play mini-games to earn coins and rewards</p>
      
      <div class="coming-soon">
        <div class="icon">🕹️</div>
        <h2>Coming Soon</h2>
        <p>Mini-games are being developed. Stay tuned for fun ways to earn coins!</p>
        <button routerLink="/" class="btn-primary">Back to Home</button>
      </div>
    </div>
  `,
  styles: [`
    .games-container {
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      font-size: 36px;
      margin-bottom: 10px;
      color: #333;
    }
    .subtitle {
      font-size: 18px;
      color: #666;
      margin-bottom: 40px;
    }
    .coming-soon {
      text-align: center;
      padding: 60px 20px;
      background: #f5f5f5;
      border-radius: 16px;
      border: 2px dashed #ccc;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 28px;
      color: #555;
      margin-bottom: 10px;
    }
    .coming-soon p {
      font-size: 16px;
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
  `]
})
export class GamesComponent {}
