/**
 * 40 original illustrated player portraits (see portraits.ts). No real players, no likenesses.
 */
import type { HairStyle, Mood, PortraitSpec, Skin } from './portraits';

export interface AvatarDef extends PortraitSpec {
  id: string;
}

const H = {
  black: '#17110C', dark: '#2A1A12', brown: '#5A3A22', auburn: '#8C3B1E', ginger: '#B5532A', blonde: '#E8C66A',
  platinum: '#EDE3C8', gray: '#9AA0A8', white: '#E4E4E4', blue: '#3A7BD5', pink: '#E86AA6', green: '#3FBF6A',
};

/** id, skin, hair, hair colour, mood, jersey, background, extras. */
const a = (
  id: string, skin: Skin, hair: HairStyle, hairColor: string, mood: Mood,
  jersey: [string, string], bg: [string, string], more: Partial<PortraitSpec> = {},
): AvatarDef => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const lids = (['open', 'heavy', 'round'] as const)[h % 3];
  const width = [0.93, 1, 1.07][(h >> 3) % 3];
  return { id, skin, hair, hairColor, mood, jersey, bg, number: 0, lids, width, ...more };
};

export const AVATARS: AvatarDef[] = [
  a('captain', 5, 'fade', H.black, 'smile', ['#F5C451', '#1D428A'], ['#4FA3FF', '#123C8C'], { ball: 'left' }),
  a('golden-boy', 0, 'slick', H.blonde, 'cool', ['#2E8B57', '#FFFFFF'], ['#FFB347', '#E86A1A'], { eyes: '#3C7BD8' }),
  a('pony-power', 2, 'ponytail', H.dark, 'fierce', ['#B3202A', '#FFFFFF'], ['#7FE6D9', '#167A8A']),
  a('ice-cold', 3, 'buzz', H.black, 'cool', ['#6EC6F5', '#0B2A5C'], ['#B07CFF', '#4B1E9C'], { rays: true }),
  a('loc-star', 6, 'locs', H.dark, 'grin', ['#6A2CC2', '#F5C451'], ['#FFE36A', '#F2A61B'], { rays: true }),
  a('red-beard', 0, 'waves', H.ginger, 'smirk', ['#F07B2C', '#1B1B1B'], ['#5FBF6A', '#14532D'], { facial: 'beard', eyes: '#4E8A3A' }),
  a('enforcer', 7, 'bald', H.black, 'shout', ['#FFFFFF', '#C8102E'], ['#FF6B5B', '#9C1218'], { facial: 'beard', rays: true }),
  a('bun-runner', 3, 'bun', H.black, 'calm', ['#111111', '#FFFFFF'], ['#FF7EB6', '#A3195B'], { extras: ['earring'] }),
  a('afro-flair', 5, 'afro', H.dark, 'grin', ['#E0457B', '#FFFFFF'], ['#4F7CFF', '#1C2E8C'], { extras: ['headband'] }),
  a('high-top', 1, 'hightop', H.black, 'smile', ['#1F6F8B', '#FFFFFF'], ['#FFC56E', '#E07A1F'], { ball: 'right' }),
  a('frost-twist', 4, 'twists', H.platinum, 'fierce', ['#C6FF3D', '#0B0B0B'], ['#9B6BFF', '#2E1170'], { extras: ['chain'] }),
  a('old-coach', 2, 'slick', H.gray, 'calm', ['#D8B23A', '#1B1B1B'], ['#62C46E', '#1F5A2A'], { facial: 'mustache', extras: ['wrinkles'] }),
  a('sunset-curls', 1, 'curly', H.auburn, 'smile', ['#1D3E8A', '#F5C451'], ['#FF9A8B', '#D9485A'], { eyes: '#5A7A3A' }),
  a('glass-cleaner', 6, 'buzz', H.black, 'fierce', ['#552583', '#FDB927'], ['#7FD6FF', '#1A5E9A'], { extras: ['goggles'] }),
  a('braid-queen', 4, 'braids', H.black, 'grin', ['#00A3AD', '#FFFFFF'], ['#C9F27A', '#3E8E1E'], { extras: ['earring'] }),
  a('mohawk-mike', 0, 'mohawk', H.dark, 'fierce', ['#0B0B0B', '#C6FF3D'], ['#7BC8FF', '#1F4E9C'], { facial: 'stubble' }),
  a('cornrow-kid', 6, 'braids', H.black, 'smile', ['#7A1F2B', '#F5C451'], ['#9EE6D6', '#1F7A6A'], { ball: 'left' }),
  a('long-range', 2, 'long', H.brown, 'smirk', ['#1D428A', '#E8833A'], ['#FFE07A', '#E8A21B'], { rays: true }),
  a('dad-strength', 3, 'fade', H.dark, 'calm', ['#4A2A1A', '#F4E3C1'], ['#8FB4FF', '#2B4C9C'], { facial: 'beard', ball: 'left' }),
  a('neon-dream', 1, 'mohawk', H.blue, 'grin', ['#C0C8D8', '#1F6FEB'], ['#FF7070', '#9C1218'], { extras: ['earring'] }),
  a('spin-move', 5, 'twists', H.black, 'grin', ['#7EC8F5', '#FFFFFF'], ['#FFB25B', '#E0621A'], { rays: true, ball: 'right' }),
  a('maestro', 1, 'slick', H.dark, 'cool', ['#0F8F8F', '#FFFFFF'], ['#FFD86B', '#D9A21B'], { facial: 'stubble' }),
  a('veteran', 2, 'buzz', H.white, 'calm', ['#C8A23A', '#0B0B0B'], ['#58B86A', '#1C5A2B'], { facial: 'beard', extras: ['wrinkles'] }),
  a('fire-starter', 0, 'long', H.ginger, 'shout', ['#0E6B3A', '#FFFFFF'], ['#3A5BD9', '#13235E'], { eyes: '#3E7A3A' }),
  a('summer-league', 4, 'curly', H.black, 'grin', ['#F05A6A', '#FFFFFF'], ['#7EF0E0', '#1FA89A'], { ball: 'left' }),
  a('hard-hat', 7, 'bald', H.black, 'cool', ['#111111', '#E8833A'], ['#E0433A', '#7A0F12'], { extras: ['chain'] }),
  a('rookie-star', 1, 'fade', H.black, 'grin', ['#FFFFFF', '#C8102E'], ['#C7A8FF', '#5B2BB5'], { rays: true, ball: 'right' }),
  a('sky-walker', 0, 'fade', H.blonde, 'smile', ['#0B3D91', '#F5C451'], ['#3B3F4A', '#0D0F14'], { rays: true }),
  a('lockdown', 5, 'waves', H.black, 'fierce', ['#4B2A8C', '#FFFFFF'], ['#8CF0C8', '#1E8A64'], { extras: ['headband'] }),
  a('bench-mob', 6, 'twists', H.black, 'shout', ['#1E7A3A', '#F5C451'], ['#5B8CFF', '#152C8C'], { facial: 'goatee' }),
  a('ice-queen', 1, 'bun', H.platinum, 'cool', ['#8B1A2E', '#FFFFFF'], ['#9AD8FF', '#2A6AA8'], { eyes: '#5A9AD8' }),
  a('legend', 7, 'bald', H.white, 'calm', ['#F5C451', '#0B0B0B'], ['#FF8A7A', '#B3263A'], { facial: 'beard', extras: ['wrinkles'] }),
  a('pink-flash', 4, 'afro', H.pink, 'grin', ['#111111', '#E86AA6'], ['#FFF06A', '#E0B81B'], { rays: true }),
  a('hustle', 3, 'locs', H.brown, 'fierce', ['#E8833A', '#0B1020'], ['#3E6BFF', '#0F1F6E'], { extras: ['headband'] }),
  a('quiet-assassin', 2, 'fade', H.black, 'cool', ['#202020', '#C0C0C0'], ['#B9BEC8', '#4A505C'], { rays: true }),
  a('baby-face', 0, 'curly', H.brown, 'smile', ['#6A3FC2', '#FFFFFF'], ['#5ED1C6', '#16736A'], { ball: 'right' }),
  a('night-shift', 6, 'hightop', H.black, 'smirk', ['#0F2B4C', '#E8833A'], ['#2E3A5A', '#0A0F1E'], { extras: ['earring'] }),
  a('green-machine', 3, 'mohawk', H.green, 'shout', ['#FFFFFF', '#1E9A4A'], ['#B4F07A', '#3E8E1E']),
  a('point-god', 5, 'braids', H.dark, 'smirk', ['#C8102E', '#FFFFFF'], ['#FFCB6B', '#E07A1F'], { facial: 'goatee', ball: 'left' }),
  a('franchise', 4, 'ponytail', H.black, 'smile', ['#14532D', '#F5C451'], ['#9B8CFF', '#3A2A9C'], { extras: ['earring'] }),
];

/** Saved profiles from the old stick-figure set map onto a portrait instead of all landing on the first one. */
export function avatarById(id: string): AvatarDef {
  const found = AVATARS.find((x) => x.id === id);
  if (found) return found;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}
