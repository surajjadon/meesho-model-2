// utils/gstValidator.ts

export const isValidGSTIN = (gstin: string): boolean => {
  // 1. Basic Regex Check
  // Structure: 2 digits (State) + 5 letters (PAN) + 4 digits (PAN) + 1 letter (PAN) + 1 digit (Entity) + Z + 1 char (Check)
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  
  if (!gstRegex.test(gstin)) {
    return false;
  }

  // 2. Checksum Calculation (The "Mod-36" Algorithm)
  try {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const values = gstin.split('').map(char => chars.indexOf(char));
    
    // Safety check: if any char is invalid
    if (values.includes(-1)) return false;

    let sum = 0;
    for (let i = 0; i < 14; i++) {
      let val = values[i];
      // Multiply alternate characters by 2
      let factor = (14 - i) % 2 === 0 ? 1 : 2; 
      let product = val * factor;
      
      // Calculate quotient and remainder of the product / 36
      let quotient = Math.floor(product / 36);
      let remainder = product % 36;
      
      sum += quotient + remainder;
    }

    const checkCodeIndex = (36 - (sum % 36)) % 36;
    const calculatedChar = chars[checkCodeIndex];

    // Compare calculated checksum with the last character of input
    return calculatedChar === gstin[14];
  } catch (e) {
    return false;
  }
};