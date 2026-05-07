import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';

interface BlackjackCard {
  rank: string;
  suit: string;
  faceUp: boolean;
}

@Component({
  selector: 'app-blackjack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blackjack.html',
  styleUrl: './blackjack.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlackjackComponent {
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);

  readonly stateBlob = this.ws.stateBlob;

  readonly heroPlayerId = computed(() => {
    const id = this.auth.getCurrentUser()?.playerId;
    return id == null ? -1 : Number(id);
  });

  readonly phase = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['phase'] as string) || 'betting';
  });

  readonly dealerHand = computed(() => {
    const blob = this.stateBlob();
    const cards = (blob?.['dealerHand'] as string[]) ?? [];
    return cards.map(c => this.parseCard(c));
  });

  readonly players = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['players'] as Array<Record<string, unknown>>) ?? [];
  });

  readonly activePlayer = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['activePlayer'] as number) ?? -1;
  });

  readonly validActions = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['validActions'] as Array<{ type: string; amount?: number; minAmount?: number; maxAmount?: number }>) ?? [];
  });

  readonly winners = computed(() => {
    const blob = this.stateBlob();
    return (blob?.['winners'] as Array<{ playerId: number; amount: number; handName: string }> | undefined) ?? [];
  });

  readonly isHeroTurn = computed(() => this.activePlayer() === this.heroPlayerId());
  readonly isBetting = computed(() => this.phase() === 'betting');
  readonly isSettled = computed(() => this.phase() === 'settled');

  betAmount = signal<number>(20);

  private suitMap: Record<string, string> = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' };
  private rankMap: Record<string, string> = { A: 'ace', K: 'king', Q: 'queen', J: 'jack', T: '10' };

  getHeroPlayer(): Record<string, unknown> | undefined {
    const heroId = this.heroPlayerId();
    return this.players().find(p => p['playerId'] === heroId);
  }

  getHands(player: Record<string, unknown>): string[][] {
    return (player['hands'] as string[][]) ?? [];
  }

  getBets(player: Record<string, unknown>): number[] {
    return (player['bets'] as number[]) ?? [];
  }

  dealerHandRaw(): string[] {
    const blob = this.stateBlob();
    return (blob?.['dealerHand'] as string[]) ?? [];
  }

  getPlayerById(playerId: number): Record<string, unknown> | undefined {
    return this.players().find(p => p['playerId'] === playerId);
  }

  parseCard(cardStr: string): BlackjackCard {
    if (cardStr === 'back') {
      return { rank: 'back', suit: 'back', faceUp: false };
    }
    const rank = cardStr[0];
    const suit = cardStr[1];
    return {
      rank: this.rankMap[rank] ?? rank,
      suit: this.suitMap[suit] ?? suit,
      faceUp: true,
    };
  }

  cardSpriteSrc(card: BlackjackCard): string {
    if (card.rank === 'back') return 'assets/poker_cards/back.png';
    return `assets/poker_cards/${card.suit}_${card.rank}.png`;
  }

  handTotal(hand: string[]): string {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      if (card === 'back') continue;
      const r = card[0];
      if (r === 'A') { total += 11; aces++; }
      else if (r === 'T' || r === 'J' || r === 'Q' || r === 'K') total += 10;
      else total += parseInt(r, 10);
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total > 21 ? 'Bust' : String(total);
  }

  onBet(): void {
    this.ws.sendAction('bet', { amount: this.betAmount() });
  }

  onAction(type: string): void {
    this.ws.sendAction(type, {});
  }

  onNewRound(): void {
    this.ws.sendAction('next_hand', {});
  }

  getPlayerName(p: Record<string, unknown> | undefined): string {
    if (!p) return '';
    return String(p['username'] ?? `Player ${p['playerId']}`);
  }

  updateBetAmount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.betAmount.set(value);
  }
}
