export const getUtcDayStart = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
export const isValidDate = (date) => Number.isFinite(date.getTime());

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
