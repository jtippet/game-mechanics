import type { Demo } from './demo';
import { runAndJump } from './run-and-jump';
import { doubleJump } from './double-jump';
import { variableJump } from './variable-jump';
import { ladders } from './ladders';
import { ducking } from './ducking';
import { gliding } from './gliding';
import { flying } from './flying';
import { coyoteBuffer } from './coyote-buffer';
import { wallClimb } from './wall-climb';
import { dash } from './dash';
import { enemyPatrol } from './enemy-patrol';
import { rangedWeapon } from './ranged-weapon';
import { meleeAttack } from './melee-attack';
import { hitPoints } from './hit-points';
import { lasers } from './lasers';
import { arcingShots } from './arcing-shots';
import { homingMissiles } from './homing-missiles';
import { hazards } from './hazards';
import { landmines } from './landmines';
import { flameJets } from './flame-jets';
import { rollingRocks } from './rolling-rocks';
import { checkpoint } from './checkpoint';
import { collectibles } from './collectibles';
import { powerup } from './powerup';
import { keysAndDoors } from './keys-and-doors';
import { parallax } from './parallax';
import { movingPlatforms } from './moving-platforms';
import { oneWay } from './one-way';
import { crumblingPlatforms } from './crumbling-platforms';
import { intervalPlatforms } from './interval-platforms';
import { iceAndSand } from './ice-and-sand';
import { conveyorBelts } from './conveyor-belts';
import { slides } from './slides';
import { portals } from './portals';
import { levers } from './levers';

/** Menu order. Adding a demo is one file and one line here. */
export const catalogue: readonly Demo[] = [
  // Movement
  runAndJump, doubleJump, wallClimb, dash, coyoteBuffer, variableJump, ladders, ducking, gliding, flying,
  // Combat
  rangedWeapon, meleeAttack, hitPoints, enemyPatrol, lasers, arcingShots, homingMissiles,
  // Items
  powerup, collectibles, checkpoint,
  // Platforms and surfaces
  movingPlatforms, oneWay, crumblingPlatforms, intervalPlatforms, iceAndSand, conveyorBelts, slides, portals, levers,
  // Hazards and obstacles
  hazards, landmines, flameJets, rollingRocks,
  // World
  parallax, keysAndDoors,
];

export function findDemo(id: string): Demo | undefined {
  return catalogue.find(d => d.id === id);
}

export type { Demo } from './demo';
export { CATEGORIES } from './demo';
