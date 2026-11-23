/** Colours for each card finish (plain data: shared by the app and the share-image function). */
import type { Finish } from '../engine/collect/finishes';

type G = [string, string, ...string[]];

export const FINISH_STYLE: Record<Finish, { frame: G | null; tint: G | null; label: string; chip: G }> = {
  base: { frame: null, tint: null, label: '', chip: ['#5D6577', '#5D6577'] },
  holo: {
    frame: ['#7FE7F7', '#F7A6E8', '#FFFFFF', '#9BB8FF', '#7FE7F7'],
    tint: ['rgba(127,231,247,0)', 'rgba(127,231,247,0.28)', 'rgba(247,166,232,0.28)', 'rgba(255,255,255,0)'],
    label: 'HOLO', chip: ['#57C9E0', '#D77BD0'],
  },
  chrome: {
    frame: ['#6B7689', '#F4F7FB', '#8E9AAF', '#FFFFFF', '#6B7689'],
    tint: ['rgba(255,255,255,0)', 'rgba(230,236,245,0.35)', 'rgba(255,255,255,0)'],
    label: 'CHROME', chip: ['#8E9AAF', '#4E5A6E'],
  },
  gold: {
    frame: ['#8A5A00', '#FFE08A', '#C98A00', '#FFF4C2', '#8A5A00'],
    tint: ['rgba(255,200,60,0.05)', 'rgba(255,210,90,0.38)', 'rgba(255,200,60,0.08)'],
    label: 'GOLD', chip: ['#F5B820', '#B37400'],
  },
  violet: {
    frame: ['#3A0E7A', '#C9A2FF', '#7A2BFF', '#F1E4FF', '#3A0E7A'],
    tint: ['rgba(122,43,255,0.25)', 'rgba(201,162,255,0.45)', 'rgba(90,20,200,0.35)'],
    label: 'VIOLET', chip: ['#9B5BFF', '#5B1EC9'],
  },
  rainbow: {
    frame: ['#FF4F6D', '#FFB13B', '#FFE84A', '#3DDC84', '#3BC5FF', '#7A4DFF', '#FF5AC8', '#FF4F6D'],
    tint: ['rgba(255,140,170,0.34)', 'rgba(255,240,150,0.30)', 'rgba(140,255,190,0.28)', 'rgba(140,220,255,0.32)', 'rgba(200,160,255,0.36)'],
    label: 'RAINBOW', chip: ['#FF4F6D', '#7A4DFF'],
  },
  cosmic: {
    frame: ['#120A2A', '#7A4DFF', '#3BC5FF', '#FF5AC8', '#120A2A'],
    tint: ['rgba(8,4,24,0.82)', 'rgba(40,16,90,0.7)', 'rgba(8,4,24,0.85)'],
    label: 'COSMIC', chip: ['#120A2A', '#7A4DFF'],
  },
};

