/**
 * Last 10 digits, so 01820361645, +8801820361645 and 8801820361645 all match.
 * Bangladeshi mobile numbers are unique in their final 10 digits.
 */
export const phoneKey = (value: string) => String(value || "").replace(/\D/g, "").slice(-10);
