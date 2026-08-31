import { MARKETS } from '@eventmgr/shared-types';
import type { Market } from '@eventmgr/shared-types';

/**
 * Market inference for the attendee directory (CF-2).
 *
 * Attendees are grouped by market, but most carry operational tags ("golf", "vip") rather than
 * market tags, which dropped nearly everyone into "Other". City and company are already on the
 * record and imply the market, so infer from those when no market tag was set.
 *
 * Explicit tags always win — inference is a fallback, never an override. An admin who tags
 * someone "Boston" has said something the data cannot contradict.
 */

/** Anything that marks a city as British, checked before the city table so Cambridge splits. */
const UK_INDICATORS = /(\buk\b|united kingdom|england)/i;

/** UK cities that need no further qualification. */
const UK_CITIES = new Set(['london', 'oxford']);

/** City (the part before any comma, lowercased) -> market. */
const CITY_TO_MARKET = new Map<string, Market>([
  ['san diego', 'San Diego'],
  ['la jolla', 'San Diego'],
  ['carlsbad', 'San Diego'],
  ['del mar', 'San Diego'],

  ['san francisco', 'Bay Area'],
  ['sf', 'Bay Area'],
  ['oakland', 'Bay Area'],
  ['berkeley', 'Bay Area'],
  ['san jose', 'Bay Area'],
  ['palo alto', 'Bay Area'],
  ['menlo park', 'Bay Area'],
  ['south san francisco', 'Bay Area'],
  ['redwood city', 'Bay Area'],
  ['mountain view', 'Bay Area'],
  ['sunnyvale', 'Bay Area'],

  ['boulder', 'Boulder'],
  ['denver', 'Boulder'],
  ['longmont', 'Boulder'],
  ['broomfield', 'Boulder'],

  ['seattle', 'Seattle'],
  ['bellevue', 'Seattle'],
  ['redmond', 'Seattle'],
  ['kirkland', 'Seattle'],
  ['bothell', 'Seattle'],

  ['boston', 'Boston'],
  // Unqualified Cambridge is the Massachusetts one; "Cambridge, UK" is caught above.
  ['cambridge', 'Boston'],
  ['waltham', 'Boston'],
  ['somerville', 'Boston'],
  ['lexington', 'Boston'],
]);

const COMPANY_PATTERNS: { pattern: RegExp; market: Market }[] = [
  { pattern: /biomed/i, market: 'BioMed Realty' },
  { pattern: /blackstone/i, market: 'Blackstone' },
];

/** Tolerates "Seattle, WA" and "London, England" by reading the part before the comma. */
function marketForCity(city: string): Market | undefined {
  const raw = city.trim();
  if (!raw) return undefined;
  // Checked against the whole string: the qualifier usually sits after the comma.
  if (UK_INDICATORS.test(raw)) return 'UK';
  const head = raw.split(',')[0].trim().toLowerCase();
  if (UK_CITIES.has(head)) return 'UK';
  return CITY_TO_MARKET.get(head);
}

/**
 * Markets implied by an attendee's city and company. Both dimensions can contribute — someone
 * at Blackstone in Boston belongs to both. Returns [] when nothing matches, leaving them in
 * "Other" rather than guessing.
 */
export function inferMarkets(attendee: { city?: string; company?: string }): Market[] {
  const found = new Set<Market>();

  const company = attendee.company ?? '';
  for (const { pattern, market } of COMPANY_PATTERNS) {
    if (pattern.test(company)) found.add(market);
  }

  const city = marketForCity(attendee.city ?? '');
  if (city) found.add(city);

  // MARKETS order, so directory grouping is stable regardless of which rule fired first.
  return MARKETS.filter((m) => found.has(m));
}

/** Explicit market tags if the attendee has any, otherwise what city and company imply. */
export function resolveMarkets(attendee: {
  city?: string;
  company?: string;
  tags?: string[];
}): Market[] {
  const explicit = MARKETS.filter((m) => (attendee.tags ?? []).includes(m));
  return explicit.length > 0 ? explicit : inferMarkets(attendee);
}
