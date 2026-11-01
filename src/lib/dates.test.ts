import { describe, expect, it } from 'vitest';
import { formatDate, formatDayMonth, isoDate } from './dates';

describe('dates', () => {
  const d = new Date('2019-10-24');

  it('formats a full date', () => {
    expect(formatDate(d)).toBe('24 Oct 2019');
  });

  it('formats day and month for lists grouped by year', () => {
    expect(formatDayMonth(d)).toBe('24 Oct');
  });

  it('formats an ISO date for datetime attributes', () => {
    expect(isoDate(d)).toBe('2019-10-24');
  });

  it('uses Sep, never Sept', () => {
    expect(formatDate(new Date('2026-09-05'))).toBe('5 Sep 2026');
  });
});
