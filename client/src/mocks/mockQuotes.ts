import type { Quote } from '../types/dashboard';

export const QUOTES: Quote[] = [
  { id: 'q1', text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { id: 'q2', text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { id: 'q3', text: 'Small daily improvements are the key to staggering long-term results.', author: 'Unknown' },
  { id: 'q4', text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { id: 'q5', text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { id: 'q6', text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { id: 'q7', text: 'Well begun is half done.', author: 'Aristotle' },
];

/** Deterministic "quote of the day" — same quote all day, changes daily, no state needed. */
export function getQuoteOfTheDay(date = new Date()): Quote {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
