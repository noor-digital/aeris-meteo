/**
 * storage.js — persistence layer (localStorage).
 * Every access is wrapped in try/catch so the app keeps working when storage
 * is unavailable (private browsing, blocked cookies, quota exceeded).
 */

const PREFIX = 'aeris.';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: preferences simply won't persist */
  }
}

export const getUnit = () => read('unit', 'c');
export const saveUnit = (unit) => write('unit', unit);

/** Returns 'light', 'dark', or null when the user never chose a theme. */
export const getTheme = () => read('theme', null);
export const saveTheme = (theme) => write('theme', theme);

export const getRecent = () => read('recent', []);

/** Stores a place at the top of the recent list (deduplicated by name). */
export function addRecent(place, max = 5) {
  const list = getRecent().filter((p) => p.name !== place.name);
  list.unshift(place);
  write('recent', list.slice(0, max));
}
