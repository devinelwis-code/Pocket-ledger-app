/**
 * Currency and Number Formatting Helpers
 * Specifically tailored for Sri Lankan Rupees / Rupees: "Rs"
 * Handles "Rs 000,000,000,000.00" padding or standard standard "Rs #,##0.00"
 */

export function formatRs(amount: number, options?: { padded?: boolean; sign?: boolean }): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount || 0);

  if (options?.padded) {
    // Format as 12 integer digits with commas + 2 decimals: 000,000,000,000.00
    const intPart = Math.floor(absVal);
    const decPart = Math.round((absVal - intPart) * 100).toString().padStart(2, '0');
    const paddedInt = intPart.toString().padStart(12, '0');
    // Group into 3-digit comma separated groups
    const grouped = paddedInt.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const prefix = isNegative ? '-Rs ' : (options?.sign && amount > 0 ? '+Rs ' : 'Rs ');
    return `${prefix}${grouped}.${decPart}`;
  }

  // Standard high-precision Rs format: Rs 1,250.00
  const formattedNumber = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const prefix = isNegative ? '-Rs ' : (options?.sign && amount > 0 ? '+Rs ' : 'Rs ');
  return `${prefix}${formattedNumber}`;
}

export function parseAmount(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const clean = input.toString().replace(/[^0-9.-]/g, '');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.replace(/\./g, '-');
    const d = new Date(cleanDate + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateStr;
  }
}
