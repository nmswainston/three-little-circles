const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * Coarse "how long ago" for freshness labels: today, yesterday, N days ago,
 * N weeks ago, N months ago, over a year ago. Never more precise than a day,
 * because nobody needs to know a sighting was 37 minutes old.
 */
export function relativeTime(when: string | number | Date, now: number = Date.now()): string {
  const then = typeof when === "number" ? when : new Date(when).getTime();
  if (Number.isNaN(then)) return "at some point";
  const elapsed = Math.max(0, now - then);
  if (elapsed < DAY) return "today";
  const days = Math.floor(elapsed / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months <= 1 ? "a month ago" : `${months} months ago`;
  return "over a year ago";
}
