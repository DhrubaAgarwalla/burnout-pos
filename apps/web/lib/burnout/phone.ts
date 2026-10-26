/**
 * Indian mobile number validation.
 *
 * The point is to keep junk out of the customer list, which is the whole
 * value of collecting numbers in the first place. It cannot prove a number
 * belongs to the person typing it — only an OTP does that — but it does
 * reject the patterns people actually type to get past the form.
 */

/** digits only, with a leading +91 / 91 / 0 trimmed off */
export function normalisePhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

/** ascending or descending runs: 1234567890, 9876543210 */
function isSequential(d: string): boolean {
  let up = true;
  let down = true;
  for (let i = 1; i < d.length; i++) {
    const diff = Number(d[i]) - Number(d[i - 1]);
    if (diff !== 1 && !(Number(d[i - 1]) === 9 && Number(d[i]) === 0)) up = false;
    if (diff !== -1 && !(Number(d[i - 1]) === 0 && Number(d[i]) === 9)) down = false;
  }
  return up || down;
}

/**
 * Returns a message explaining what's wrong, or null when the number is
 * acceptable. The message is shown to the guest, so it says what to fix.
 */
export function phoneError(raw: string): string | null {
  const d = normalisePhone(raw);

  if (d.length === 0) return 'Enter your mobile number';
  if (d.length < 10) return `${10 - d.length} more digit${10 - d.length > 1 ? 's' : ''} to go`;
  if (d.length > 10) return 'That looks like too many digits';

  // Indian mobile numbers start 6, 7, 8 or 9 — landlines and 0-prefixed
  // numbers are not reachable by SMS or WhatsApp
  if (!/^[6-9]/.test(d)) return 'Indian mobile numbers start with 6, 7, 8 or 9';

  if (/^(\d)\1{9}$/.test(d)) return "That doesn't look like a real number";
  if (isSequential(d)) return "That doesn't look like a real number";

  // 9999988888, 9090909090 and friends
  if (new Set(d).size <= 2) return "That doesn't look like a real number";

  return null;
}

export const isValidPhone = (raw: string) => phoneError(raw) === null;
