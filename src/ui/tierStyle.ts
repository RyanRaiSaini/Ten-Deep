/** Frame colours for each card tier (plain data: shared by the app and the share-image function). */
import type { Tier } from '../engine/collect/tiers';

export const TIER_STYLE: Record<Tier, { frame: [string, string, ...string[]]; accent: string; glow: string }> = {
  common: { frame: ['#5D6577', '#C9D0DE', '#5D6577'], accent: '#C9D0DE', glow: 'rgba(201,208,222,0.35)' },
  uncommon: { frame: ['#0F6B3E', '#3DDC84', '#0F6B3E'], accent: '#3DDC84', glow: 'rgba(61,220,132,0.45)' },
  rare: { frame: ['#123A8A', '#4F8BFF', '#123A8A'], accent: '#4F8BFF', glow: 'rgba(79,139,255,0.5)' },
  epic: { frame: ['#4B1A7A', '#B26BFF', '#4B1A7A'], accent: '#B26BFF', glow: 'rgba(178,107,255,0.55)' },
  mythic: { frame: ['#7A1405', '#FF5A36', '#FFB13B', '#7A1405'], accent: '#FF7A45', glow: 'rgba(255,90,54,0.6)' },
  ultra: { frame: ['#FF5AC8', '#F5C451', '#3DF2C2', '#4F8BFF', '#B26BFF', '#FF5AC8'], accent: '#F5C451', glow: 'rgba(245,196,81,0.75)' },
};
