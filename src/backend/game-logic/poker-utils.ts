import { randomInt } from "crypto";
import { Card } from "./poker-types";

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
    const j = randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealHands(
  deck: Card[],
  playerCount: number
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  let idx = 0;
  for (let card = 0; card < 2; card++) {
    for (let p = 0; p < playerCount; p++) {
      hands[p].push(deck[idx++]);
    }
  }
  return { hands, remaining: deck.slice(idx) };
}

function parseCard(card: Card): { rank: number; suit: number } {
  const rank = RANKS.indexOf(card[0]);
  const suit = SUITS.indexOf(card[1]);
  if (rank === -1 || suit === -1) {
    throw new Error(`Invalid card: ${card}`);
  }
  return { rank, suit };
}

function scoreFiveCardHand(cards: Card[]): number {
  if (cards.length !== 5) {
    throw new Error("Must evaluate exactly 5 cards");
  }

  const parsed = cards.map(parseCard);
  const ranks = parsed.map((c) => c.rank).sort((a, b) => b - a);
  const suits = parsed.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check for straight
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);
  let isStraight = false;
  let straightHigh = 0;

  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (
      uniqueRanks[0] === 12 &&
      uniqueRanks[1] === 3 &&
      uniqueRanks[2] === 2 &&
      uniqueRanks[3] === 1 &&
      uniqueRanks[4] === 0
    ) {
      // A-2-3-4-5 wheel
      isStraight = true;
      straightHigh = 3; // 5-high straight
    }
  }

  if (isFlush && isStraight) {
    return 8000000 + straightHigh;
  }

  // Count frequencies
  const freq = new Map<number, number>();
  for (const r of ranks) {
    freq.set(r, (freq.get(r) || 0) + 1);
  }

  const freqEntries = Array.from(freq.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher frequency first
    return b[0] - a[0]; // higher rank first
  });

  const counts = freqEntries.map((e) => e[1]);

  if (counts[0] === 4) {
    // Four of a kind
    const quadRank = freqEntries[0][0];
    const kicker = freqEntries[1][0];
    return 7000000 + quadRank * 15 + kicker;
  }

  if (counts[0] === 3 && counts[1] === 2) {
    // Full house
    const tripRank = freqEntries[0][0];
    const pairRank = freqEntries[1][0];
    return 6000000 + tripRank * 15 + pairRank;
  }

  if (isFlush) {
    return (
      5000000 +
      ranks[0] * 50625 +
      ranks[1] * 3375 +
      ranks[2] * 225 +
      ranks[3] * 15 +
      ranks[4]
    );
  }

  if (isStraight) {
    return 4000000 + straightHigh;
  }

  if (counts[0] === 3) {
    // Three of a kind
    const tripRank = freqEntries[0][0];
    const kickers = freqEntries.slice(1).map((e) => e[0]);
    return (
      3000000 +
      tripRank * 50625 +
      kickers[0] * 3375 +
      kickers[1] * 225
    );
  }

  if (counts[0] === 2 && counts[1] === 2) {
    // Two pair
    const highPair = freqEntries[0][0];
    const lowPair = freqEntries[1][0];
    const kicker = freqEntries[2][0];
    return 2000000 + highPair * 50625 + lowPair * 3375 + kicker * 225;
  }

  if (counts[0] === 2) {
    // One pair
    const pairRank = freqEntries[0][0];
    const kickers = freqEntries.slice(1).map((e) => e[0]);
    return (
      1000000 +
      pairRank * 50625 +
      kickers[0] * 3375 +
      kickers[1] * 225 +
      kickers[2]
    );
  }

  // High card
  return (
    ranks[0] * 50625 +
    ranks[1] * 3375 +
    ranks[2] * 225 +
    ranks[3] * 15 +
    ranks[4]
  );
}

export function evaluateHand(cards: Card[]): number {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(" evaluateHand requires 5-7 cards");
  }

  // Generate all combinations of 5 cards
  let bestScore = -1;
  const n = cards.length;

  function combinate(start: number, chosen: Card[]) {
    if (chosen.length === 5) {
      const score = scoreFiveCardHand(chosen);
      if (score > bestScore) {
        bestScore = score;
      }
      return;
    }
    for (let i = start; i < n; i++) {
      chosen.push(cards[i]);
      combinate(i + 1, chosen);
      chosen.pop();
    }
  }

  combinate(0, []);
  return bestScore;
}

export function compareHands(
  handA: Card[],
  handB: Card[],
  community: Card[]
): number {
  const scoreA = evaluateHand([...handA, ...community]);
  const scoreB = evaluateHand([...handB, ...community]);
  return scoreA - scoreB;
}

export function getHandName(score: number): string {
  if (score >= 8000000) return "Straight Flush";
  if (score >= 7000000) return "Four of a Kind";
  if (score >= 6000000) return "Full House";
  if (score >= 5000000) return "Flush";
  if (score >= 4000000) return "Straight";
  if (score >= 3000000) return "Three of a Kind";
  if (score >= 2000000) return "Two Pair";
  if (score >= 1000000) return "One Pair";
  return "High Card";
}

export function dealCommunityCards(
  deck: Card[],
  count: number
): { cards: Card[]; remaining: Card[] } {
  return {
    cards: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}
