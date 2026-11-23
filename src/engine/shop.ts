/** The reroll shop: what's on sale and the free ways to earn rerolls. Prices are display-only until store billing is live. */
export interface Product {
  id: string;
  rerolls: number;
  /** USD price shown on the tile (the stores localise it at release). */
  price: string;
  badge?: 'popular' | 'best';
}

export const PRODUCTS: Product[] = [
  { id: 'rerolls_1', rerolls: 1, price: '$0.99' },
  { id: 'rerolls_5', rerolls: 5, price: '$3.99' },
  { id: 'rerolls_10', rerolls: 10, price: '$7.99', badge: 'popular' },
  { id: 'rerolls_25', rerolls: 25, price: '$14.99', badge: 'best' },
];

/** One free reroll a day, and up to this many ad breaks a day for one reroll each. */
export const ADS_PER_DAY = 3;
export const MAX_REROLLS = 999;

/** Saving vs buying singles, e.g. 20 for "20% off". */
export function savings(p: Product): number {
  const single = parseFloat(PRODUCTS[0].price.slice(1));
  return Math.round((1 - parseFloat(p.price.slice(1)) / (single * p.rerolls)) * 100);
}
