import type { Demo } from './demo';
import { runAndJump } from './run-and-jump';

/** Menu order. Adding a demo is one file and one line here. */
export const catalogue: readonly Demo[] = [
  runAndJump,
];

export function findDemo(id: string): Demo | undefined {
  return catalogue.find(d => d.id === id);
}

export type { Demo } from './demo';
export { CATEGORIES } from './demo';
