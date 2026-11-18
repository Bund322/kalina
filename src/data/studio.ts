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
  id: 'telegram' | 'vk';
  label: string;
  href: string;
}

export const contacts = studio.contacts;
export const socials = studio.socials as Social[];
export const prices = studio.prices as PriceItem[];
export const piercingPriceNote = studio.piercingPriceNote;
/** Маршрут до студии в Яндекс Картах: от текущего места пользователя до адреса из `contacts.route`. */
export const routeHref = `https://yandex.ru/maps/?rtext=~${encodeURIComponent(contacts.route)}`;
/** Ссылка для звонка: только цифры и плюс. */
export const phoneHref = `tel:${contacts.phone.replace(/[^\d+]/g, '')}`;

/** Ссылка на мессенджер или якорь блока записи, пока ссылка не заполнена в studio.json. */
export const bookingHref = (link: string) => link || url('/#book');

/**
 * Описание студии для поисковиков (schema.org, тип «тату-салон»): адрес, телефон, часы, соцсети.
 * Город отрезаем от адреса из studio.json – в разметке он отдельным полем.
 */
export function businessSchema(site?: URL) {
  const city = 'Санкт-Петербург';
  return {
    '@context': 'https://schema.org',
    '@type': 'TattooParlor',
    name: 'Калина',
    description: 'Студия татуировки и пирсинга. Обучение тату и пирсингу.',
    ...(site && { url: site.href, image: new URL(url('/og.jpg'), site).href }),
    telephone: contacts.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contacts.address.replace(`${city}, `, ''),
      addressLocality: city,
      addressCountry: 'RU',
    },
    openingHours: contacts.hoursSchema,
    priceRange: '₽₽',
    sameAs: [...socials.map((s) => s.href), contacts.telegram],
  };
}
