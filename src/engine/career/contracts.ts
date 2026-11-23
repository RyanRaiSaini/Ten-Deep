import { createRng } from '../rng';
import type { Player } from '../types';

export type Contracts = Record<string, number>;

/** Years left on each player's deal: 1–4, seeded per player. */
export function initialContracts(players: Player[], seed: string): Contracts {
  return Object.fromEntries(players.map((p) => [p.id, createRng(`${seed}:contract:${p.id}`).int(1, 4)]));
}

export const ROOKIE_YEARS = 3;
