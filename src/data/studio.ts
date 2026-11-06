import studio from './studio.json';
import { url } from './url';

export type PriceCategory = 'tattoo' | 'piercing' | 'common';

export interface PriceItem {
  category: PriceCategory;
  name: string;
  note?: string;
  price: string;
}

export interface Social {
  id: 'instagram' | 'telegram' | 'vk';
  label: string;
  href: string;
}

export const contacts = studio.contacts;
export const socials = studio.socials as Social[];
export const prices = studio.prices as PriceItem[];
export const piercingPriceNote = studio.piercingPriceNote;
/** Ссылка для звонка: только цифры и плюс. */
export const phoneHref = `tel:${contacts.phone.replace(/[^\d+]/g, '')}`;

/** Ссылка на мессенджер или якорь блока записи, пока ссылка не заполнена в studio.json. */
export const bookingHref = (link: string) => link || url('/#book');
