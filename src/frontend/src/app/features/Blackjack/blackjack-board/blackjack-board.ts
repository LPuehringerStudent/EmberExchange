import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blackjack-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blackjack-board.html',
  styleUrl: './blackjack-board.css'
})
export class BlackjackBoard {
  playerHand = signal<any[]>([]);
  dealerHand = signal<any[]>([]);
  gameState = signal<'betting' | 'playing' | 'resolved'>('betting');
  message = signal<string>('Place your bet to deal!');


  onHit() {
    console.log('User clicked Hit');
  }

  onStay() {
    console.log('User clicked Stay');
  }

  onDeal() {
    console.log('Starting new round');
    this.gameState.set('playing');
    this.message.set('Hit or Stay?');
  }
}
