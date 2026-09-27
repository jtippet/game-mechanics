import type { Demo } from './demo';
import { runAndJump } from './run-and-jump';
import { doubleJump } from './double-jump';
import { variableJump } from './variable-jump';
import { coyoteBuffer } from './coyote-buffer';
import { wallClimb } from './wall-climb';
import { dash } from './dash';
import { enemyPatrol } from './enemy-patrol';
import { rangedWeapon } from './ranged-weapon';
import { meleeAttack } from './melee-attack';
import { hitPoints } from './hit-points';
import { hazards } from './hazards';
import { checkpoint } from './checkpoint';

/** Menu order. Adding a demo is one file and one line here. */
export const catalogue: readonly Demo[] = [
  runAndJump,
  doubleJump,
  variableJump,
  coyoteBuffer,
  wallClimb,
  dash,
  enemyPatrol,
  rangedWeapon,
  meleeAttack,
  hitPoints,
  hazards,
  checkpoint,
];

export function findDemo(id: string): Demo | undefined {
  return catalogue.find(d => d.id === id);
}

export type { Demo } from './demo';
export { CATEGORIES } from './demo';
