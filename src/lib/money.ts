// Shared validation for user-supplied money values.

// Upper bound for a single deposit/withdrawal/transfer/price — keeps obviously
// bogus values (Infinity, 1e308, …) out of wallet math.
export const MAX_AMOUNT = 1_000_000;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

/** Positive money amount (> 0), rounded to cents. Returns null when invalid. */
export function parseAmount(value: unknown): number | null {
  const n = toNumber(value);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}

/** Non-negative price (>= 0, e.g. free products), rounded to cents. Returns null when invalid. */
export function parsePrice(value: unknown): number | null {
  const n = toNumber(value);
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return Math.round(n * 100) / 100;
}
