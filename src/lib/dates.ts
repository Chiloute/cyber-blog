const fmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

/** "March 4, 2026" (UTC). */
export const formatDate = (d: Date): string => fmt.format(d);

/** "2026-03-04" (UTC). */
export const isoDate = (d: Date): string => d.toISOString().slice(0, 10);
