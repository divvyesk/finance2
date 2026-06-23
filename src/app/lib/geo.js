import { Country, State } from 'country-state-city';

/**
 * Geo Module
 *
 * Wraps the zero-dependency, local "country-state-city" library to resolve:
 *   1. Country name → currency (ISO 4217 code + symbol)
 *   2. Country name → list of states/provinces/regions
 *   3. Raw text → detected Country canonical name
 *
 * This provides 100% reliable, offline-capable lookup for countries and states,
 * allowing us to query states for a single country code/name instantly.
 */

// Common currency symbols lookup
const CURRENCY_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'CA$', AUD: 'A$', INR: '₹', SGD: 'S$', JPY: '¥', NZD: 'NZ$'
};

/**
 * Given a country name or country code (e.g. "United States", "US"),
 * returns the ISO 4217 currency code and symbol.
 */
export async function getCurrencyForCountry(countryNameOrCode) {
  if (!countryNameOrCode) return { code: null, symbol: null, countryCode: null };
  
  const clean = countryNameOrCode.trim().toLowerCase();
  let country = null;

  if (clean.length === 2) {
    country = Country.getCountryByCode(clean.toUpperCase());
  } else {
    country = Country.getAllCountries().find(
      c => c.name.toLowerCase() === clean
    );
  }

  if (!country) return { code: null, symbol: null, countryCode: null };

  const code = country.currency || null;
  const symbol = code ? CURRENCY_SYMBOLS[code] || '' : null;
  return { code, symbol, countryCode: country.isoCode };
}

/**
 * Given a country name or country code, returns the states for that single country.
 */
export async function getStatesForCountry(countryNameOrCode) {
  if (!countryNameOrCode) return [];

  const clean = countryNameOrCode.trim().toLowerCase();
  let countryCode = null;

  if (clean.length === 2) {
    countryCode = clean.toUpperCase();
  } else {
    const country = Country.getAllCountries().find(
      c => c.name.toLowerCase() === clean
    );
    if (country) {
      countryCode = country.isoCode;
    }
  }

  if (!countryCode) return [];

  // Query states for only this single country code
  const states = State.getStatesOfCountry(countryCode);
  return states ? states.map(s => s.name) : [];
}

/**
 * Returns a list of all countries sorted alphabetically.
 */
export async function getAllCountriesWithDetails() {
  return Country.getAllCountries().map(c => {
    const code = c.isoCode;
    const currencyCode = c.currency || null;
    const currencySymbol = currencyCode ? CURRENCY_SYMBOLS[currencyCode] || '' : '';
    return {
      name: c.name,
      code,
      currencyCode,
      currencySymbol,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Scans raw text to match against the full list of canonical country names.
 */
export async function detectCountryInText(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  
  const countries = Country.getAllCountries();
  
  // Sort by name length descending to ensure longer matches happen first (e.g. "United States" before "United")
  const sortedCountries = [...countries].sort((a, b) => b.name.length - a.name.length);

  for (const country of sortedCountries) {
    if (t.includes(country.name.toLowerCase())) {
      return country.name;
    }
  }

  // Fallback alias/spelling checks
  if (t.includes('usa') || t.includes('u.s.a.')) return 'United States';
  if (t.includes('uk') || t.includes('u.k.')) return 'United Kingdom';
  if (t.includes('$')) return 'United States';

  return null;
}
