/**
 * Money is always integer cents in storage and in memory. Floats lose
 * precision (0.1 + 0.2 !== 0.3) and the drift compounds over a year of
 * transactions. Conversion between dollars and cents happens only at the
 * form boundary, in `parseDollarsToCents`.
 */

export function parseDollarsToCents(input: string): number {
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function centsToDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatMoney(cents: number, opts: { sign?: boolean } = {}): string {
  const value = Math.abs(cents) / 100;
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
  if (opts.sign && cents !== 0) {
    return cents < 0 ? `-${formatted}` : `+${formatted}`;
  }
  return cents < 0 ? `-${formatted}` : formatted;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
