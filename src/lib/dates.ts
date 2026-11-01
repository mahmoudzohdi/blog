// Fixed month names: Intl's en-GB short month gives "Sept" on newer ICU versions.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Frontmatter dates are calendar dates parsed as UTC midnight, so read them in UTC.
export const formatDate = (d: Date): string =>
  `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

export const formatDayMonth = (d: Date): string => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);
