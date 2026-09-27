import type { Action } from '../engine/input';
import type { Scene } from '../engine/scene';

export type Category = 'Movement' | 'Combat' | 'Items' | 'Platforms and surfaces' | 'Hazards and obstacles' | 'World';
export const CATEGORIES: readonly Category[] = ['Movement', 'Combat', 'Items', 'Platforms and surfaces', 'Hazards and obstacles', 'World'];

export interface TouchButton { action: Action; label: string }

/** Every demo gets these three touch buttons; `Demo.touch` adds more. */
export const TOUCH_BASE: readonly TouchButton[] = [
  { action: 'left', label: '◀' }, { action: 'right', label: '▶' }, { action: 'jump', label: 'JUMP' },
];

export interface Demo {
  /** URL slug: lowercase letters, digits, dashes. */
  id: string;
  title: string;
  category: Category;
  /** One sentence, shown in the menu and under the canvas. */
  blurb: string;
  /** Short lines shown beside the canvas, e.g. "Z / Space: jump". */
  controls: string[];
  /** Extra touch buttons beyond TOUCH_BASE (left/right/jump), e.g. dash's DASH button. */
  touch?: readonly TouchButton[];
  /** A fresh scene every call; R calls it again. */
  create(): Scene;
}

export const BASE_CONTROLS = ['← → or A D: run', 'Z or Space: jump', 'R: reset · Esc: menu'];
