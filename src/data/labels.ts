export function labelOrFallback(label: string | undefined, fallback: string): string {
  const trimmed = (label ?? "").trim();
  return trimmed.length ? trimmed : fallback;
}
