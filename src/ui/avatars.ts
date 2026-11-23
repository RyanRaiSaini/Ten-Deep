/**
 * 48 original illustrated player portraits (see portraits.ts). They play on basketball archetypes
 * (the headband big man, the 90s high-top, the goggles centre, the braided scorer…) but are never a
 * real player: no likenesses, no names, no team marks.
 */
import type { HairStyle, Mood, PortraitSpec, Skin } from './portraits';

export interface AvatarDef extends PortraitSpec {
  id: string;
}

const H = {
  black: '#17110C', dark: '#2B1B12', brown: '#5C3A21', chestnut: '#7A4524', auburn: '#8C3B1E', ginger: '#C2602E',
  blonde: '#E6C062', platinum: '#EDE3C8', gray: '#9AA0A8', silver: '#C9CDD3', white: '#ECECEC',
  blue: '#3A7BD5', pink: '#EE6AAE', green: '#3FBF6A',
};
const EYE = { brown: '#5A3420', dark: '#3A2116', hazel: '#7A5A2A', green: '#4E8A3A', blue: '#3C7BD8', ice: '#6FA8DC', gray: '#6F7F8E' };

/** id, skin, hair, hair colour, mood, [jersey, trim], [backdrop centre, edge], number, extras. */
const a = (
  id: string, skin: Skin, hair: HairStyle, hairColor: string, mood: Mood,
  jersey: [string, string], bg: [string, string], number: number, more: Partial<PortraitSpec> = {},
): AvatarDef => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const width = [0.95, 1, 1.04][(h >> 3) % 3];
  const gaze = [-1.2, 0, 1.2, 0.6, -0.6][(h >> 5) % 5];
  return { id, skin, hair, hairColor, mood, jersey, bg, number, width, gaze, ...more };
};

export const AVATARS: AvatarDef[] = [
  // The first 40 keep their original order: old saves map onto them by index (see avatarById).
  a('captain', 5, 'fade', H.black, 'smile', ['#F5C451', '#1D428A'], ['#4FA3FF', '#123C8C'], 11, { nose: 1.15 }),
  a('golden-boy', 0, 'slick', H.blonde, 'cool', ['#2E8B57', '#FFFFFF'], ['#FFB347', '#E8541A'], 14, { eyes: EYE.blue, nose: 0.9 }),
  a('pony-power', 2, 'ponytail', H.dark, 'fierce', ['#B3202A', '#FFFFFF'], ['#7FE6D9', '#167A8A'], 5, { fem: true }),
  a('ice-cold', 3, 'waves', H.black, 'cool', ['#6EC6F5', '#0B2A5C'], ['#B07CFF', '#4B1E9C'], 2, { lids: 'heavy', rays: true }),
  a('loc-star', 6, 'locs', H.dark, 'grin', ['#6A2CC2', '#F5C451'], ['#FFE36A', '#F2A61B'], 17, { tips: '#E8B54A', nose: 1.2 }),
  a('red-beard', 0, 'manbun', H.ginger, 'smirk', ['#F07B2C', '#1B1B1B'], ['#5FBF6A', '#14532D'], 9, { facial: 'beard', eyes: EYE.green }),
  a('enforcer', 7, 'bald', H.black, 'shout', ['#FFFFFF', '#C8102E'], ['#FF6B5B', '#9C1218'], 44, { jaw: 1.14, facial: 'beard', nose: 1.25, width: 1.06 }),
  a('bun-runner', 3, 'bun', H.black, 'calm', ['#1A1A22', '#FFFFFF'], ['#FF7EB6', '#A3195B'], 4, { fem: true, extras: ['earring'], band: '#FF7EB6' }),
  a('afro-flair', 5, 'afro', H.dark, 'grin', ['#E0457B', '#FFFFFF'], ['#4F7CFF', '#1C2E8C'], 19, { extras: ['headband'], facial: 'mustache', nose: 1.2 }),
  a('high-top', 6, 'hightop', H.black, 'smile', ['#1F6F8B', '#FFFFFF'], ['#FFC56E', '#E07A1F'], 25, { nose: 1.2, ball: 'right' }),
  a('frost-twist', 4, 'twists', H.black, 'fierce', ['#C6FF3D', '#0B0B0B'], ['#9B6BFF', '#2E1170'], 1, { tips: '#F1E7C6', extras: ['chain'] }),
  a('old-coach', 2, 'slick', H.gray, 'calm', ['#D8B23A', '#1B1B1B'], ['#62C46E', '#1F5A2A'], 50, { facial: 'mustache', extras: ['wrinkles'], lids: 'heavy' }),
  a('sunset-curls', 1, 'curly', H.auburn, 'smile', ['#1D3E8A', '#F5C451'], ['#FF9A8B', '#D9485A'], 12, { fem: true, eyes: EYE.green, extras: ['freckles'] }),
  a('glass-cleaner', 6, 'buzz', H.black, 'fierce', ['#552583', '#FDB927'], ['#7FD6FF', '#1A5E9A'], 42, { jaw: 1.08, extras: ['goggles'], nose: 1.2, width: 1.04 }),
  a('braid-queen', 4, 'boxbraids', H.black, 'grin', ['#00A3AD', '#FFFFFF'], ['#C9F27A', '#3E8E1E'], 22, { fem: true, extras: ['earring'] }),
  a('mohawk-mike', 0, 'mohawk', H.dark, 'fierce', ['#0B0B0B', '#C6FF3D'], ['#7BC8FF', '#1F4E9C'], 31, { jaw: 1.1, facial: 'stubble', eyes: EYE.gray }),
  a('cornrow-kid', 6, 'cornrows', H.black, 'smile', ['#7A1F2B', '#F5C451'], ['#9EE6D6', '#1F7A6A'], 15, { jaw: 0.92, ball: 'left', lids: 'round' }),
  a('long-range', 2, 'long', H.brown, 'smirk', ['#1D428A', '#E8833A'], ['#FFE07A', '#E8A21B'], 7, { facial: 'stubble', eyes: EYE.hazel, rays: true }),
  a('dad-strength', 3, 'fade', H.dark, 'calm', ['#4A2A1A', '#F4E3C1'], ['#8FB4FF', '#2B4C9C'], 40, { jaw: 1.1, facial: 'beard', width: 1.05 }),
  a('neon-dream', 1, 'mohawk', H.dark, 'grin', ['#C0C8D8', '#1F6FEB'], ['#FF7070', '#9C1218'], 99, { tips: '#3FA0FF', extras: ['stud'] }),
  a('spin-move', 5, 'twists', H.black, 'grin', ['#7EC8F5', '#FFFFFF'], ['#FFB25B', '#E0621A'], 18, { rays: true, ball: 'right' }),
  a('maestro', 1, 'slick', H.dark, 'cool', ['#0F8F8F', '#FFFFFF'], ['#FFD86B', '#D9A21B'], 10, { facial: 'stubble', lids: 'heavy' }),
  a('veteran', 2, 'buzz', H.silver, 'calm', ['#C8A23A', '#0B0B0B'], ['#58B86A', '#1C5A2B'], 41, { facial: 'beard', beardColor: H.silver, extras: ['wrinkles'] }),
  a('fire-starter', 0, 'long', H.ginger, 'shout', ['#0E6B3A', '#FFFFFF'], ['#3A5BD9', '#13235E'], 13, { fem: true, eyes: EYE.green, extras: ['freckles'] }),
  a('summer-league', 4, 'curly', H.black, 'grin', ['#F05A6A', '#FFFFFF'], ['#7EF0E0', '#1FA89A'], 26, { ball: 'left', lids: 'round' }),
  a('hard-hat', 7, 'bald', H.black, 'cool', ['#111111', '#E8833A'], ['#E0433A', '#7A0F12'], 55, { jaw: 1.12, extras: ['chain'], facial: 'goatee', width: 1.05 }),
  a('rookie-star', 5, 'fade', H.black, 'grin', ['#FFFFFF', '#C8102E'], ['#C7A8FF', '#5B2BB5'], 16, { jaw: 0.94, rays: true, ball: 'right', extras: ['stud'], part: true, lids: 'round' }),
  a('sky-walker', 0, 'fade', H.blonde, 'smile', ['#0B3D91', '#F5C451'], ['#3B4A6A', '#0D0F24'], 21, { rays: true, eyes: EYE.blue }),
  a('lockdown', 5, 'waves', H.black, 'fierce', ['#4B2A8C', '#FFFFFF'], ['#8CF0C8', '#1E8A64'], 20, { extras: ['headband'], nose: 1.15 }),
  a('bench-mob', 6, 'twists', H.black, 'shout', ['#1E7A3A', '#F5C451'], ['#5B8CFF', '#152C8C'], 28, { facial: 'goatee' }),
  a('ice-queen', 1, 'bun', H.platinum, 'cool', ['#8B1A2E', '#FFFFFF'], ['#9AD8FF', '#2A6AA8'], 27, { fem: true, eyes: EYE.ice, lids: 'heavy' }),
  a('legend', 7, 'bald', H.white, 'calm', ['#F5C451', '#0B0B0B'], ['#FF8A7A', '#B3263A'], 52, { facial: 'beard', beardColor: H.white, extras: ['wrinkles'], nose: 1.2 }),
  a('pink-flash', 4, 'puffs', H.pink, 'grin', ['#111111', '#EE6AAE'], ['#FFF06A', '#E0B81B'], 3, { fem: true, rays: true }),
  a('hustle', 3, 'locs', H.brown, 'fierce', ['#E8833A', '#0B1020'], ['#3E6BFF', '#0F1F6E'], 36, { extras: ['headband'], band: '#FFFFFF' }),
  a('quiet-assassin', 2, 'fade', H.black, 'cool', ['#202020', '#C0C0C0'], ['#B9BEC8', '#4A505C'], 29, { lids: 'heavy', rays: true }),
  a('baby-face', 0, 'curly', H.brown, 'smile', ['#6A3FC2', '#FFFFFF'], ['#5ED1C6', '#16736A'], 38, { jaw: 0.92, ball: 'right', lids: 'round', eyes: EYE.hazel }),
  a('night-shift', 6, 'hightop', H.black, 'smirk', ['#0F2B4C', '#E8833A'], ['#4A5A8A', '#0A0F1E'], 47, { extras: ['earring'] }),
  a('green-machine', 3, 'mohawk', H.dark, 'shout', ['#FFFFFF', '#1E9A4A'], ['#B4F07A', '#3E8E1E'], 64, { tips: H.green }),
  a('point-god', 5, 'braids', H.black, 'smirk', ['#C8102E', '#FFFFFF'], ['#FFCB6B', '#E07A1F'], 35, { facial: 'goatee', ball: 'left' }),
  a('franchise', 4, 'ponytail', H.black, 'smile', ['#14532D', '#F5C451'], ['#9B8CFF', '#3A2A9C'], 8, { fem: true, extras: ['earring'] }),
  // Added with the 3D redesign.
  a('paint-beast', 4, 'fade', H.black, 'fierce', ['#F5F5F5', '#0E4C92'], ['#FFB25B', '#C2410C'], 45, { jaw: 1.14, extras: ['headband'], facial: 'goatee', width: 1.07, nose: 1.2 }),
  a('court-queen', 7, 'braids', H.black, 'smirk', ['#F5C451', '#6A2CC2'], ['#FF8FB8', '#B0245F'], 46, { fem: true, extras: ['stud'] }),
  a('twin-puffs', 6, 'puffs', H.black, 'smile', ['#2E6BE6', '#FFFFFF'], ['#9CF2C2', '#1E8A64'], 30, { fem: true, lids: 'round', band: '#FFD34D' }),
  a('swish', 0, 'ponytail', H.blonde, 'smirk', ['#5B2BB5', '#FFFFFF'], ['#7FE0FF', '#1E6FB0'], 6, { fem: true, eyes: EYE.blue, extras: ['freckles'] }),
  a('old-school', 3, 'afro', H.brown, 'smile', ['#F5C451', '#B3202A'], ['#FF9F6B', '#B83A1A'], 37, { facial: 'mustache', rays: true }),
  a('sharpshooter', 1, 'manbun', H.dark, 'cool', ['#111827', '#3FD0C9'], ['#8EF0E6', '#1A7F86'], 39, { facial: 'beard', lids: 'heavy', eyes: EYE.hazel }),
  a('glue-guy', 4, 'buzz', H.black, 'calm', ['#B3202A', '#F5C451'], ['#9DB8FF', '#3346A8'], 34, { jaw: 1.1, facial: 'beard', width: 1.05 }),
  a('hype-queen', 5, 'curly', H.dark, 'shout', ['#FF6B3D', '#FFFFFF'], ['#C49BFF', '#5B2BB5'], 53, { fem: true, extras: ['earring'] }),
];

/** Portraits that existed before the redesign; old profile ids hash onto these so their face never changes. */
const LEGACY_POOL = 40;

/** Saved profiles from the old stick-figure set map onto a portrait instead of all landing on the first one. */
export function avatarById(id: string): AvatarDef {
  const found = AVATARS.find((x) => x.id === id);
  if (found) return found;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % LEGACY_POOL];
}
