// Calendar dates, shared by aihio-calendar and aihio-date-picker.
//
// A date is the string a native <input type="date"> holds: "2026-10-09", a
// day with no time and no time zone, so it is the same day wherever the page
// is opened. Arithmetic runs on UTC midnights, which no daylight-saving change
// can move, and Intl formats them in UTC for the same reason. The strings
// compare in date order, so a min or max check is a string comparison.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY = 86_400_000;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// Dates read back from text that Intl wrote, or a person typed, may carry
// direction marks around their numbers (Arabic, Hebrew).
const DIRECTION_MARKS = /[؜‎‏‪-‮⁦-⁩]/g;
const DATE_TOKENS = /(\d+)|([\p{L}\p{M}]+)/gu;
const COMBINING_MARK = /\p{M}/gu;

/** `text` as a date when it is one: "2026-10-09", but never "2026-02-30". */
export function parseIsoDate(text) {
  const match = ISO_DATE.exec(String(text ?? '').trim());
  return match ? isoDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

/** The date of a year, a month from 1, and a day, or null when there is no such day. */
export function isoDate(year, month, day) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth(year, month)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function dateParts(date) {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

export function daysInMonth(year, month) {
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1];
}

/** The UTC midnight a date starts at, which is what valueAsDate holds. */
export function toUtcDate(date) {
  const { year, month, day } = dateParts(date);
  const value = new Date(0);
  // Not Date.UTC(), which reads a year below 100 as 19xx.
  value.setUTCFullYear(year, month - 1, day);
  return value;
}

/** The date a Date falls on in UTC, or null for no date or one outside years 1 to 9999. */
export function fromUtcDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
}

export function addDays(date, days) {
  return fromUtcDate(new Date(toUtcDate(date).getTime() + days * DAY));
}

/** The same day `months` later, or that month's last day when it is shorter: 31 January and a month is 28 February. */
export function addMonths(date, months) {
  const { year, month, day } = dateParts(date);
  const index = year * 12 + month - 1 + months;
  const nextYear = Math.floor(index / 12);
  const nextMonth = index - nextYear * 12 + 1;
  if (nextYear < 1 || nextYear > 9999) return null;
  return isoDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

/** The day of the week, from 0 for Sunday, as Date counts them. */
export function weekday(date) {
  return toUtcDate(date).getUTCDay();
}

export function startOfMonth(date) {
  return `${date.slice(0, 8)}01`;
}

export function endOfMonth(date) {
  const { year, month } = dateParts(date);
  return isoDate(year, month, daysInMonth(year, month));
}

export function clampDate(date, min, max) {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

/** Today, where the page is open. */
export function today() {
  const now = new Date();
  return isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// --- Languages --------------------------------------------------------------

// Where Intl.Locale cannot say which day a week starts on, the region does
// (CLDR's week data): Sunday or Saturday in these, Monday everywhere else.
const SUNDAY_FIRST = new Set('AG AS BD BR BS BT BW BZ CA CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW'.split(' '));
const SATURDAY_FIRST = new Set('AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY'.split(' '));

// A Sunday, to read weekday names from.
const SUNDAY = '2023-01-01';

const locales = new Map();

/**
 * Everything a calendar needs from a language, worked out once per language:
 * how it writes a date and how to read one back, its month and weekday names,
 * and the day its week starts on. The Gregorian calendar is used whatever the
 * language's own (Thai counts Buddhist years, Persian has months of its own):
 * the value is a Gregorian date, and the grid lays out Gregorian months.
 */
export function calendarLocale(lang) {
  // The browser's languages can fill in the region, so they are part of the
  // key, and a change to them in the browser's settings is not missed.
  const key = `${lang ?? ''} ${visitorLanguages().join()}`;
  let locale = locales.get(key);
  if (!locale) {
    locale = buildLocale(lang);
    locales.set(key, locale);
  }
  return locale;
}

function buildLocale(lang) {
  const requested = withVisitorRegion(lang);
  const tag = resolveTag(requested);
  const format = (options) => new Intl.DateTimeFormat(tag, { ...options, calendar: 'gregory', timeZone: 'UTC' });

  // Two-digit days and months and a four-digit year: every date the same
  // length, which is what the placeholder shows and what is easiest to edit.
  const numeric = format({ year: 'numeric', month: '2-digit', day: '2-digit' });
  const long = format({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const monthYear = format({ year: 'numeric', month: 'long' });
  const number = new Intl.NumberFormat(tag, { useGrouping: false });

  const sample = toUtcDate('2026-10-09');
  const order = numeric.formatToParts(sample)
    .map(({ type }) => type)
    .filter((type) => type === 'day' || type === 'month' || type === 'year');

  const fields = dateFieldNames(tag);
  const pattern = numeric.formatToParts(sample)
    .map(({ type, value }) => {
      if (type === 'day') return fields.initials.day.repeat(2);
      if (type === 'month') return fields.initials.month.repeat(2);
      if (type === 'year') return fields.initials.year.repeat(4);
      return value;
    })
    .join('');

  // The names, and the day the week starts on, are only needed once a
  // calendar is drawn, so a page full of closed date fields never builds them.
  let monthNames = null;
  let weekdays = null;
  let firstDay = null;

  const digits = nativeDigits(number);
  let months = null;

  return {
    tag,
    pattern,
    fieldNames: fields.names,

    /** The day the week starts on, from 0 for Sunday. */
    get firstDay() {
      firstDay ??= firstDayOf(requested, tag);
      return firstDay;
    },

    /** Month names as they stand alone, capitalised for a list: "Lokakuu". */
    get monthNames() {
      if (!monthNames) {
        const name = format({ month: 'long' });
        monthNames = Array.from({ length: 12 }, (_, index) =>
          capitalize(name.format(toUtcDate(isoDate(2026, index + 1, 1))), tag)
        );
      }
      return monthNames;
    },

    /** Short weekday names, from Sunday. */
    get weekdays() {
      if (!weekdays) {
        const sundayOnward = Array.from({ length: 7 }, (_, day) => toUtcDate(addDays(SUNDAY, day)));
        const short = format({ weekday: 'short' });
        weekdays = sundayOnward.map((date) => short.format(date));
        // Where the short names are words ("الاثنين"), a column a day wide
        // takes the narrow ones. The names are only shown: each day's label
        // says its weekday in full.
        if (weekdays.some((name) => [...name].length > 4)) {
          const narrow = format({ weekday: 'narrow' });
          weekdays = sundayOnward.map((date) => narrow.format(date));
        }
      }
      return weekdays;
    },

    /** The date as the field shows it: 09.10.2026, 10/09/2026, 2026-10-09. */
    formatDate(date) {
      const { year } = dateParts(date);
      return numeric.formatToParts(toUtcDate(date))
        .map(({ type, value }) => (type === 'year' && year < 1000 ? number.format(year).padStart(4, number.format(0)) : value))
        .join('');
    },

    /** The date in words, weekday first, as each day of the grid is named. */
    formatLong(date) {
      return long.format(toUtcDate(date));
    },

    /** The month and year of a date: "October 2026", "Lokakuu 2026". */
    formatMonth(date) {
      return capitalize(monthYear.format(toUtcDate(date)), tag);
    },

    formatNumber(value) {
      return number.format(value);
    },

    /** The date `text` names, read the way this language writes dates, or null. */
    parse(text, reference) {
      months ??= monthMatcher(tag, format);
      return parseDate(text, { order, digits, months, reference });
    },
  };
}

/**
 * The page's language, in the visitor's region when the page names none.
 * Most English pages say only "en", which CLDR reads as American English: a
 * reader in Britain would type 09/10/2026 and get 10 September. A browser
 * that asks for the same language in a region lends it, so "en" is British
 * English to a browser set to en-GB, and stays American to one that asks only
 * for fi-FI. A region the page names is kept, and so is the page's script:
 * "zh" read in Taiwan is still Simplified Chinese, with Taiwan's week.
 */
function withVisitorRegion(lang) {
  const page = localeOf(lang);
  if (!page || page.region) return lang;
  const script = page.maximize().script;
  for (const preferred of visitorLanguages()) {
    const visitor = localeOf(preferred);
    if (visitor?.language !== page.language || !visitor.region) continue;
    const regional = new Intl.Locale(lang, { region: visitor.region });
    // A region can bring a script of its own: zh-TW is Traditional.
    if (regional.maximize().script === script) return regional.toString();
    return new Intl.Locale(lang, { script, region: visitor.region }).toString();
  }
  return lang;
}

/** The languages the browser asks pages for, the one it prefers first. */
function visitorLanguages() {
  return globalThis.navigator?.languages ?? [];
}

function localeOf(tag) {
  try {
    return tag ? new Intl.Locale(tag) : null;
  } catch {
    // A malformed tag, or no Intl.Locale.
    return null;
  }
}

function resolveTag(lang) {
  try {
    return new Intl.DateTimeFormat(lang || undefined).resolvedOptions().locale;
  } catch {
    // A malformed language tag: write dates the browser's way.
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  }
}

/**
 * The week is the region's, so it is read from the tag asked for: Intl writes
 * dates for a region it has no data for in the language's own way, resolving
 * zh-Hans-TW to zh-Hans, but the week is still Taiwan's. A language Intl does
 * not know is written the browser's way, and takes the browser's week.
 */
function firstDayOf(requested, tag) {
  try {
    const resolved = new Intl.Locale(tag);
    const asked = localeOf(requested);
    const locale = asked?.language === resolved.language ? asked : resolved;
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    // Intl counts from 1 for Monday to 7 for Sunday.
    if (info?.firstDay) return info.firstDay % 7;
    const { region } = locale.maximize();
    if (SUNDAY_FIRST.has(region)) return 0;
    if (SATURDAY_FIRST.has(region)) return 6;
  } catch {
    // No Intl.Locale: the ISO week, which starts on Monday.
  }
  return 1;
}

/**
 * The names of the day, month, and year fields, from Intl where it has them:
 * "Month" and "Year" label the calendar's selects, and their initials write
 * the placeholder the way the language does (dd.mm.yyyy, pp.kk.vvvv,
 * tt.mm.jjjj, jj/mm/aaaa). A script without case (年, يوم) has no letter that
 * reads as a placeholder, and keeps the Latin ones.
 */
function dateFieldNames(tag) {
  const fallback = { names: { month: 'Month', year: 'Year' }, initials: { day: 'd', month: 'm', year: 'y' } };
  try {
    const display = new Intl.DisplayNames(tag, { type: 'dateTimeField' });
    const names = { month: capitalize(display.of('month'), tag), year: capitalize(display.of('year'), tag) };
    const initials = {};
    for (const field of ['day', 'month', 'year']) {
      const initial = [...display.of(field)][0]?.toLocaleLowerCase(tag) ?? '';
      initials[field] = initial !== initial.toLocaleUpperCase(tag) ? initial : '';
    }
    const letters = Object.values(initials);
    const usable = letters.every(Boolean) && new Set(letters).size === letters.length;
    return { names, initials: usable ? initials : fallback.initials };
  } catch {
    return fallback;
  }
}

function capitalize(text, tag) {
  return text.charAt(0).toLocaleUpperCase(tag) + text.slice(1);
}

/** A map from the language's own digits to 0–9, when it writes others (٠١٢, ۰۱۲). */
function nativeDigits(number) {
  const map = new Map();
  for (let digit = 0; digit <= 9; digit += 1) {
    const written = number.format(digit);
    if (written !== String(digit)) map.set(written, String(digit));
  }
  return map.size > 0 ? map : null;
}

function fold(text, tag) {
  return text.normalize('NFD').replace(COMBINING_MARK, '').toLocaleLowerCase(tag).replace(/\.$/, '');
}

/**
 * The month a written name means, in this language or in English: "Oct",
 * "lokakuuta", "octobre", or the start of one that only one month has
 * ("sept", "loka"). Dates pasted from elsewhere are often written out.
 */
function monthMatcher(tag, format) {
  const entries = [];
  const add = (names, locale) => {
    // A month's name alone, and as it is written in a date ("lokakuu",
    // "9. lokakuuta"), in full and abbreviated.
    const formats = ['long', 'short'].flatMap((width) => [names({ month: width }), names({ day: 'numeric', month: width })]);
    for (let month = 1; month <= 12; month += 1) {
      const date = toUtcDate(isoDate(2026, month, 15));
      for (const formatter of formats) {
        const name = formatter.formatToParts(date).find(({ type }) => type === 'month')?.value;
        const folded = name && fold(name, locale);
        if (folded && /\p{L}/u.test(folded)) entries.push({ name: folded, month });
      }
    }
  };
  add(format, tag);
  if (!tag.startsWith('en')) {
    add((options) => new Intl.DateTimeFormat('en', { ...options, calendar: 'gregory', timeZone: 'UTC' }), 'en');
  }

  return (word) => {
    const folded = fold(word, tag);
    let matches = entries.filter((entry) => entry.name === folded);
    if (matches.length === 0 && [...folded].length >= 3) matches = entries.filter((entry) => entry.name.startsWith(folded));
    const found = new Set(matches.map((entry) => entry.month));
    return found.size === 1 ? [...found][0] : null;
  };
}

/**
 * Read a typed date. The fields are taken in the language's order (day, month,
 * year in Finland; month, day, year in the US), separated by anything that is
 * not a digit, so 9.10.2026, 9/10/2026, and 9 10 2026 all read alike. A year
 * written first with four digits is year, month, day in any language. A month
 * may be a name, in which case the order no longer matters; a missing year is
 * this year; a two-digit year is the nearest one within 80 years back and 20
 * on; and the fields may run together as 09102026.
 */
function parseDate(text, { order, digits, months, reference }) {
  let source = String(text ?? '').normalize('NFKC').replace(DIRECTION_MARKS, '').trim();
  if (digits) source = source.replace(/./gu, (character) => digits.get(character) ?? character);
  if (!source) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(source);
  if (iso) return isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const numbers = [];
  let month = null;
  for (const [, figures, word] of source.matchAll(DATE_TOKENS)) {
    if (figures) {
      numbers.push(figures);
      continue;
    }
    // Words that are not months ("Friday", "de", "of", 年) are passed over.
    const named = months(word);
    if (named === null) continue;
    if (month !== null && month !== named) return null;
    month = named;
  }

  const thisYear = dateParts(reference).year;
  const date = (year, monthNumber, day) =>
    isoDate(expandYear(year, thisYear), Number(monthNumber), Number(day));

  if (month !== null) {
    if (numbers.length === 1) return isoDate(thisYear, month, Number(numbers[0]));
    if (numbers.length !== 2) return null;
    const [first, second] = numbers;
    const yearFirst = first.length > 2 || (second.length <= 2 && order.indexOf('year') < order.indexOf('day'));
    return yearFirst ? date(first, month, second) : date(second, month, first);
  }

  if (numbers.length === 1 && (numbers[0].length === 8 || numbers[0].length === 6)) {
    const run = numbers[0];
    const fields = {};
    let offset = 0;
    for (const type of order) {
      const length = type === 'year' ? run.length - 4 : 2;
      fields[type] = run.slice(offset, offset + length);
      offset += length;
    }
    return date(fields.year, fields.month, fields.day);
  }

  const dayFirst = order.indexOf('day') < order.indexOf('month');
  if (numbers.length === 2) {
    const [first, second] = numbers;
    return dayFirst ? date(String(thisYear), second, first) : date(String(thisYear), first, second);
  }

  if (numbers.length !== 3) return null;
  let types = order;
  const yearAt = numbers.findIndex((figures) => figures.length > 2);
  if (yearAt === 0) types = ['year', 'month', 'day'];
  else if (yearAt === 2) types = dayFirst ? ['day', 'month', 'year'] : ['month', 'day', 'year'];
  else if (yearAt === 1) return null;
  const fields = Object.fromEntries(types.map((type, index) => [type, numbers[index]]));
  return date(fields.year, fields.month, fields.day);
}

function expandYear(text, thisYear) {
  const year = Number(text);
  if (text.length > 2) return year;
  let full = Math.floor(thisYear / 100) * 100 + year;
  if (full > thisYear + 20) full -= 100;
  else if (full <= thisYear - 80) full += 100;
  return full;
}
