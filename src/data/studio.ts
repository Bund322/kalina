import studio from './studio.json';

export type PriceCategory = 'tattoo' | 'piercing' | 'common';

export interface PriceItem {
  category: PriceCategory;
  name: string;
  note?: string;
  price: string;
}

export const contacts = studio.contacts;
export const prices = studio.prices as PriceItem[];

/** Ссылка на мессенджер или якорь блока записи, пока ссылка не заполнена в studio.json. */
export const bookingHref = (url: string) => url || '/#book';
