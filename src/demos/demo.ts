import type { Scene } from '../engine/scene';

export type Category = 'Movement' | 'Combat' | 'Items' | 'World';
export const CATEGORIES: readonly Category[] = ['Movement', 'Combat', 'Items', 'World'];

export interface Demo {
  /** URL slug: lowercase letters, digits, dashes. */
  id: string;
  title: string;
  category: Category;
  /** One sentence, shown in the menu and under the canvas. */
  blurb: string;
  /** Short lines shown beside the canvas, e.g. "Z / Space: jump". */
  controls: string[];
  /** A fresh scene every call; R calls it again. */
  create(): Scene;
}

export const BASE_CONTROLS = ['← → or A D: run', 'Z or Space: jump', 'R: reset · Esc: menu'];
