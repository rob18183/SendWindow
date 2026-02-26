const YYYY_MM_DD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const getUtcDayStart = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
export const isValidDate = (date) => Number.isFinite(date.getTime());

export const parseCalendarDate = (value) => {
  if (!YYYY_MM_DD_RE.test(value)) return null;
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!isValidDate(date)) return null;

  const roundTrip = `${date.getUTCFullYear().toString().padStart(4, '0')}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`;
  if (roundTrip !== value) return null;

  return date;
};

export const getRange = (params, now = new Date()) => {
  const range = params.get('range') || '30d';
  const startOfToday = getUtcDayStart(now);
  const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);

  if (range === '7d') {
    return { from: new Date(startOfToday.getTime() - 6 * 86400000), to: startOfTomorrow, cacheKey: '7d' };
  }

  if (range === '90d') {
    return { from: new Date(startOfToday.getTime() - 89 * 86400000), to: startOfTomorrow, cacheKey: '90d' };
  }

  if (range === 'custom') {
    const fromParam = params.get('from');
    const toParam = params.get('to');
    if (!fromParam || !toParam) {
      return { error: 'custom range requires valid from and to query params (YYYY-MM-DD)' };
    }

    const fromDay = parseCalendarDate(fromParam);
    const toDay = parseCalendarDate(toParam);
    if (!fromDay || !toDay) {
      return { error: 'invalid custom range: from/to must be strict YYYY-MM-DD calendar dates' };
    }

    const from = new Date(`${fromParam}T00:00:00.000Z`);
    const to = new Date(`${toParam}T23:59:59.999Z`);
    if (!isValidDate(from) || !isValidDate(to)) {
      return { error: 'invalid custom range: from/to must be valid YYYY-MM-DD values' };
    }

    if (from > to) {
      return { error: 'invalid custom range: from must be before or equal to to' };
    }

    return { from, to, cacheKey: `custom:${fromParam}:${toParam}` };
  }

  return { from: new Date(startOfToday.getTime() - 29 * 86400000), to: startOfTomorrow, cacheKey: '30d' };
};
