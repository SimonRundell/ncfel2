/**
 * Format a date/time value into dd/mm/yyyy hh:mm (24h).
 * Accepts Date or string (tolerates space between date/time) and returns fallback on invalid input.
 * @param {Date|string|number|null|undefined} value
 * @param {string} [fallback='']
 * @returns {string}
 */
export const formatDateTime = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') return fallback;
  const normalized = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value || fallback;

  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
