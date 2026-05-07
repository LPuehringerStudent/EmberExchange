import { Card } from "./blackjack-types";

const RANKS = "23456789TJQKA";
const SUITS = "hdcs";

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function cardValue(card: Card): number {
  const rank = card[0];
  if (rank === "A") return 11;
  if (rank === "T" || rank === "J" || rank === "Q" || rank === "K") return 10;
  return parseInt(rank, 10);
}

export interface HandValue {
  total: number;      // best total (with Aces as 11 or 1)
  soft: boolean;      // true if at least one Ace is counted as 11
  blackjack: boolean; // exactly 2 cards totaling 21
  bust: boolean;      // total > 21
}

export function handValue(cards: Card[]): HandValue {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    const val = cardValue(card);
    total += val;
    if (card[0] === "A") aces++;
  }

  // Convert Aces from 11 to 1 as needed
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  const soft = aces > 0;
  const blackjack = cards.length === 2 && total === 21;
  const bust = total > 21;

  return { total, soft, blackjack, bust };
}

export function isBlackjack(cards: Card[]): boolean {
  return handValue(cards).blackjack;
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).bust;
}

export function canSplit(cards: Card[]): boolean {
  if (cards.length !== 2) return false;
  // Can split if both cards have the same rank value (10, J, Q, K all count as 10)
  const valA = cardValue(cards[0]);
  const valB = cardValue(cards[1]);
  return valA === valB;
}

export function canDouble(cards: Card[]): boolean {
  return cards.length === 2;
}

export function dealerShouldHit(cards: Card[]): boolean {
  const { total, soft } = handValue(cards);
  // Dealer hits on soft 17, stands on hard 17+
  if (total < 17) return true;
  if (total === 17 && soft) return true;
  return false;
}

export function handName(cards: Card[]): string {
  const hv = handValue(cards);
  if (hv.blackjack) return "Blackjack";
  if (hv.bust) return "Bust";
  if (hv.soft) return `Soft ${hv.total}`;
  return `${hv.total}`;
}
