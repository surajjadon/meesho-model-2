// utils/gstin.ts
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function isValidGSTIN(gstin: string): boolean {
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)) {
    return false;
  }

  const gstinChars = gstin.split("");
  const providedChecksum = gstinChars[14];

  let factor = 2;
  let sum = 0;

  // checksum is calculated on first 14 characters
  for (let i = 13; i >= 0; i--) {
    const codePoint = CHARSET.indexOf(gstinChars[i]);
    let product = codePoint * factor;

    sum += Math.floor(product / 36) + (product % 36);
    factor = factor === 2 ? 1 : 2;
  }

  const remainder = sum % 36;
  const calculatedChecksum = CHARSET[(36 - remainder) % 36];

  return calculatedChecksum === providedChecksum;
}
